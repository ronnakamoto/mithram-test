// src/config/index.ts
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
}

if (!process.env.NFT_CONTRACT_ADDRESS || !process.env.NFT_PRIVATE_KEY) {
    throw new Error('NFT_CONTRACT_ADDRESS and NFT_PRIVATE_KEY environment variables are required');
}

export const config = {
    version: '1.0.0',
    
    // Analysis Queue Configuration
    analysisQueue: {
        amqp: {
            url: process.env.AMQP_URL || 'amqp://localhost:5672',
            queue: process.env.AMQP_QUEUE || 'analysis-queue'
        },
        nft: {
            contractAddress: process.env.NFT_CONTRACT_ADDRESS,
            privateKey: process.env.NFT_PRIVATE_KEY,
            chain: process.env.NFT_CHAIN_ID ? parseInt(process.env.NFT_CHAIN_ID) : 31337,
            rpcUrl: process.env.NFT_RPC_URL || 'http://127.0.0.1:8545',
            storage: process.env.NFT_STORAGE_TYPE || 'datauri'
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

    // NFT Configuration
    nft: {
        contractAddress: process.env.NFT_CONTRACT_ADDRESS,
        privateKey: process.env.NFT_PRIVATE_KEY,
        chain: process.env.NFT_CHAIN_ID ? parseInt(process.env.NFT_CHAIN_ID) : 31337,
        rpcUrl: process.env.NFT_RPC_URL || 'http://127.0.0.1:8545',
        storage: process.env.NFT_STORAGE_TYPE || 'datauri'
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
        launchUrl: process.env.SMART_APP_LAUNCH_URL || 'http://localhost:5173/launch',
        clientId: process.env.SMART_APP_CLIENT_ID || 'mithram-ai-expert-panel',
        scope: 'patient/*.read launch/patient',
        redirectUri: process.env.SMART_APP_REDIRECT_URI || 'http://localhost:5173/callback'
    },

    // System Information
    systemInfo: {
        url: 'https://example.com/mithram-ai-expert-panel',
        iconUrl: 'https://example.com/mithram-ai-expert-panel/icon-100px.png',
        documentation: 'https://example.com/mithram-ai-expert-panel/docs'
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