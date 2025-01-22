// src/config/index.ts
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
}

export const config = {
    version: '1.0.0',
    
    // Analysis Queue Configuration
    analysisQueue: {
        amqp: {
            url: process.env.AMQP_URL || 'amqp://localhost:5672',
            queue: process.env.AMQP_QUEUE || 'analysis-queue'
        },
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        },
        fhir: {
            baseUrl: process.env.FHIR_SERVER_URL || 'http://fhir-server/fhir',
            auth: {
                token: process.env.FHIR_AUTH_TOKEN
            }
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4',
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000')
        },
        systemId: process.env.SYSTEM_ID || 'ai-expert-panel-system'
    },

    // FHIR Server Configuration
    fhir: {
        baseUrl: process.env.FHIR_SERVER_URL || 'http://fhir-server/fhir',
        auth: {
            token: process.env.FHIR_AUTH_TOKEN
        }
    },

    // SMART App Configuration
    smartApp: {
        launchUrl: process.env.SMART_APP_LAUNCH_URL || 'https://example.com/smart/launch',
        clientId: process.env.SMART_APP_CLIENT_ID,
        scope: 'patient/*.read launch/patient',
        redirectUri: process.env.SMART_APP_REDIRECT_URI
    },

    // System Information
    systemInfo: {
        url: 'https://example.com/ai-expert-panel',
        iconUrl: 'https://example.com/ai-expert-panel/icon-100px.png',
        documentation: 'https://example.com/ai-expert-panel/docs'
    },

    // Service Configuration
    server: {
        port: parseInt(process.env.PORT || '3000'),
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
    },

    // Security Configuration
    security: {
        cors: {
            allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(','),
            allowedMethods: ['GET', 'POST']
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        }
    }
};