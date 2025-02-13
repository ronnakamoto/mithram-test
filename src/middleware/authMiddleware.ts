import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

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

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            tokenIntrospection?: IntrospectionResponse;
            user?: {
                sub?: string;
                patient?: string;
                fhirUser?: string;
            };
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No Bearer token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        // Call the Meldrx introspection endpoint
        const introspectionResponse = await axios.post(
            'https://app.meldrx.com/connect/introspect',
            { 
                token, 
                client_id: process.env.CLIENT_ID || '6c2d96cf430242a39a55c55e5f355164'
            },
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

        // Check token expiration
        if (introspectionData.exp && introspectionData.exp < Math.floor(Date.now() / 1000)) {
            return res.status(401).json({ error: 'Token has expired' });
        }

        // Add the introspection data to the request object
        req.tokenIntrospection = introspectionData;
        
        // Add user information to the request
        req.user = {
            sub: introspectionData.sub,
            patient: introspectionData.patient,
            fhirUser: introspectionData.fhirUser
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

export default authMiddleware;