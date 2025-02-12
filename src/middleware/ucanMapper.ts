import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { build, EdKeypair, Capability, Ability } from '@ucans/ucans';

interface IntrospectionResponse {
    active: boolean;
    client_id: string;
    scope: string;
    sub?: string;
    patient?: string;
    fhirUser?: string;
    exp: number;
    [key: string]: any;
}

// Update the interface to match @ucans/ucans Capability type
interface UCANCapability {
    with: { scheme: string; hierPart: string; query?: string };
    can: Ability;
}

function mapSMARTScopeToUCAN(scope: string, context: { patient?: string; fhirUser?: string }): Capability[] {
    const scopes = scope.split(' ');
    return scopes.map(scope => {
        const [resource, permission] = scope.split('/');
        
        // Convert SMART scope to UCAN capability
        const capability: Capability = {
            with: {
                scheme: 'fhir',
                hierPart: `/${resource}`,
                ...(context.patient && { query: `?patient=${context.patient}` })
            },
            can: {
                namespace: 'fhir',
                segments: [permission]
            }
        };

        return capability;
    });
}

export const ucanMapper = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No Bearer token provided' });
        }

        const clientId = authHeader.split(' ')[1];
        const token = authHeader.split(' ')[2];
        
        // Call the Meldrx introspection endpoint
        const introspectionResponse = await axios.post(
            'https://app.meldrx.com/connect/introspect',
            { token, client_id: clientId },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                }
            }
        );

        const introspectionData = introspectionResponse.data as IntrospectionResponse;

        if (!introspectionData.active) {
            return res.status(401).json({ error: 'Token is not active' });
        }

        // Log the scopes
        console.log('Token Scopes:', introspectionData.scope);
        
        // Map SMART scopes to UCAN capabilities with context
        const ucanCapabilities = mapSMARTScopeToUCAN(introspectionData.scope, {
            patient: introspectionData.patient,
            fhirUser: introspectionData.fhirUser
        });
        
        // Add the UCAN capabilities to the request object
        req.tokenIntrospection = {
            ...introspectionData,
            ucanCapabilities
        };

        // Check token expiration
        if (introspectionData.exp && introspectionData.exp < Math.floor(Date.now() / 1000)) {
            return res.status(401).json({ error: 'Token has expired' });
        }

        // Map SMART scopes to UCAN capabilities with context
        const ucanCapabilitiesForToken = mapSMARTScopeToUCAN(introspectionData.scope, {
            patient: introspectionData.patient,
            fhirUser: introspectionData.fhirUser
        });

        // Ensure the KEYPAIR_SECRET is provided
        if (!process.env.KEYPAIR_SECRET) {
            throw new Error('KEYPAIR_SECRET environment variable not set');
        }

        // Generate keypair from the secret
        const keypair = await EdKeypair.create()
        

        // Build the UCAN token using the @ucans/ucans build function
        const ucan = await build({
            issuer: keypair,
            audience: keypair.did(),
            capabilities: ucanCapabilitiesForToken,
            expiration: introspectionData.exp,
            facts: [{
                client_id: introspectionData.client_id,
                fhir_user: introspectionData.fhirUser
            }]
        });

        // Convert UCAN to string format for header
        const ucanToken = ucan.toString();
        res.setHeader('X-UCAN-Token', ucanToken);

        next();
    } catch (error) {
        console.error('Token introspection error:', error);
        return res.status(401).json({ error: 'Failed to validate token' });
    }
}

// Add type definition for the custom request property
declare global {
    namespace Express {
        interface Request {
            tokenIntrospection?: IntrospectionResponse & { ucanCapabilities: UCANCapability[] };
        }
    }
}

export default ucanMapper;
