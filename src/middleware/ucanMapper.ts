import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { encode } from '@ipld/dag-json';
import { ucans } from '@ucans/ucans';

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

// UCAN capability types with enhanced projection support
interface UCANCapability {
    with: string;        // Resource identifier (e.g., fhir:patient/*, ipfs:*)
    can: string;         // Action type (e.g., read, write)
    nb?: {
        context?: string;    // For launch contexts
        fields?: string[];   // For data projection - specific fields allowed
        filters?: {          // For data filtering
            type?: string;
            value?: any;
        }[];
    };
}

// Enhanced SMART scope to UCAN capability mapping
function mapSMARTScopeToUCAN(scope: string, context: { patient?: string, fhirUser?: string } = {}): UCANCapability[] {
    const capabilities: UCANCapability[] = [];
    const scopes = scope.split(' ');
    
    for (const singleScope of scopes) {
        if (singleScope.includes('/*.')) {
            // Handle wildcard resource scopes like patient/*.read
            const [resource, action] = singleScope.split('/*.');
            capabilities.push({
                with: `fhir:${resource}/*`,
                can: action,
                nb: {
                    fields: ['*'],  // Allow all fields for wildcard scopes
                    filters: context.patient ? [{
                        type: 'patient',
                        value: context.patient
                    }] : undefined
                }
            });
            
            // Add corresponding IPFS capability for AI insights
            capabilities.push({
                with: `ipfs:${resource}/insights`,
                can: action,
                nb: {
                    fields: ['summary', 'recommendations', 'metadata'],  // Default allowed fields
                    filters: context.patient ? [{
                        type: 'patient',
                        value: context.patient
                    }] : undefined
                }
            });
        } else if (singleScope.startsWith('launch/')) {
            // Handle launch scopes
            const contextType = singleScope.replace('launch/', '');
            capabilities.push({
                with: 'fhir:launch',
                can: 'context',
                nb: { context: contextType }
            });
        } else if (singleScope.includes('.')) {
            // Handle specific resource scopes like patient/Observation.read
            const [resourcePath, action] = singleScope.split('.');
            const [resource, type] = resourcePath.split('/');
            
            // FHIR resource capability
            capabilities.push({
                with: `fhir:${resource}/${type}`,
                can: action,
                nb: {
                    fields: ['*'],  // Allow all fields for specific resources
                    filters: context.patient ? [{
                        type: 'patient',
                        value: context.patient
                    }] : undefined
                }
            });
            
            // Corresponding IPFS insight capability
            capabilities.push({
                with: `ipfs:${resource}/${type}/insights`,
                can: action,
                nb: {
                    fields: ['summary', 'analysis', 'metadata'],
                    filters: context.patient ? [{
                        type: 'patient',
                        value: context.patient
                    }] : undefined
                }
            });
        }
    }
    
    return capabilities;
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
