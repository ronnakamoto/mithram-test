// src/routes/cdsHooksService.ts
import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisQueue } from '../services/AnalysisQueue';
import { FHIRClient } from '../services/FHIRClient';
import { CDSHookRequest, Card, CDSServiceResponse } from '../types/cds-hooks';
import { config } from '../config';
import { Task } from 'fhir/r4';

const router = express.Router();

// Initialize services
const analysisQueue = new AnalysisQueue(config.analysisQueue);
const fhirClient = new FHIRClient(config.fhir);

// CDS Services Discovery Endpoint
router.get('/cds-services', (req: Request, res: Response) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
        services: [{
            hook: 'patient-view',
            title: 'AI Expert Panel Analysis',
            description: 'Provides AI-powered specialist panel recommendations based on patient context',
            id: 'ai-expert-panel',
            prefetch: {
                patient: 'Patient/{{context.patientId}}',
                conditions: 'Condition?patient={{context.patientId}}&status=active',
                medications: 'MedicationStatement?patient={{context.patientId}}&status=active',
                observations: 'Observation?patient={{context.patientId}}&_count=50&_sort=-date',
                encounters: 'Encounter?patient={{context.patientId}}&_count=10&_sort=-date'
            }
        }]
    });
});

// Main CDS Service Endpoint
router.post('/cds-services/ai-expert-panel', async (req: Request, res: Response) => {
    try {
        const hookRequest = req.body as CDSHookRequest;

        console.log('Received request:', hookRequest);

        // Validate request
        const validationError = validateRequest(hookRequest);
        console.log(validationError);
        if (validationError) {
            return res.status(400).json({
                cards: [{
                    summary: 'Invalid request',
                    indicator: 'warning',
                    detail: validationError,
                    source: getSourceInfo()
                }]
            });
        }

        // Extract patient data
        const patientData = extractPatientData(hookRequest);
        if (!patientData.isValid) {
            return res.status(422).json({
                cards: [{
                    summary: 'Invalid patient data',
                    indicator: 'warning',
                    detail: patientData.error,
                    source: getSourceInfo()
                }]
            });
        }

        // Create analysis task
        const task = await analysisQueue.createAnalysis(
            hookRequest.context.patientId,
            hookRequest.context.userId
        );

        // Generate response cards
        const cards = generateResponseCards(task.id!, hookRequest.context);
        res.json({ cards });

        // Log successful request
        console.log(`Created analysis task ${task.id} for patient ${hookRequest.context.patientId}`);

    } catch (error) {
        console.error('Service error:', error);
        res.status(500).json({
            cards: [{
                summary: 'Service error',
                indicator: 'warning',
                detail: 'An error occurred while processing the request. Please try again later.',
                source: getSourceInfo()
            }]
        });
    }
});

// Task Status Endpoint
router.get('/task/:taskId/status', async (req: Request, res: Response) => {
    try {
        const task = await fhirClient.read<Task>('Task', req.params.taskId);
        res.json({
            status: task.status,
            progress: task.extension?.find(e => 
                e.url === 'http://example.org/fhir/StructureDefinition/analysis-progress'
            )?.valueInteger || 0
        });
    } catch (error) {
        console.error('Error fetching task status:', error);
        res.status(500).json({
            error: 'Failed to fetch task status'
        });
    }
});

function validateRequest(request: CDSHookRequest): string | null {
    if (!request) return 'Missing request body';
    if (!request.hookInstance) return 'Missing hookInstance';
    if (!request.hook) return 'Missing hook';
    if (request.hook !== 'patient-view') return 'Unsupported hook type';
    if (!request.context) return 'Missing context';
    if (!request.context.patientId) return 'Missing patient ID';
    if (!request.context.userId) return 'Missing user ID';

    return null;
}

function extractPatientData(request: CDSHookRequest) {
    console.log(request)
    try {
        const patientResource = request.prefetch?.patient;
        if (!patientResource) {
            return {
                isValid: false,
                error: 'Missing patient resource in prefetch data'
            };
        }

        return {
            isValid: true,
            patient: patientResource,
            conditions: request.prefetch?.conditions?.entry || [],
            medications: request.prefetch?.medications?.entry || [],
            observations: request.prefetch?.observations?.entry || []
        };
    } catch (error: any) {
        return {
            isValid: false,
            error: `Error processing patient data: ${error.message}`
        };
    }
}

function generateResponseCards(taskId: string, context: any): Card[] {
    const cards: Card[] = [];

    // Validate SMART configuration
    if (!config.smartApp.clientId || !config.smartApp.redirectUri) {
        cards.push({
            summary: 'Configuration Error',
            indicator: 'warning',
            detail: 'SMART on FHIR configuration is incomplete. Please check your environment variables.',
            source: getSourceInfo()
        });
        return cards;
    }

    // SMART launch URL with required parameters
    const smartLaunchUrl = new URL(config.smartApp.launchUrl);
    smartLaunchUrl.searchParams.set('launch', taskId);
    smartLaunchUrl.searchParams.set('iss', config.fhir.baseUrl);
    smartLaunchUrl.searchParams.set('client_id', config.smartApp.clientId);
    smartLaunchUrl.searchParams.set('redirect_uri', config.smartApp.redirectUri);
    smartLaunchUrl.searchParams.set('scope', config.smartApp.scope);
    smartLaunchUrl.searchParams.set('response_type', 'code');
    smartLaunchUrl.searchParams.set('state', taskId);
    smartLaunchUrl.searchParams.set('aud', config.fhir.baseUrl);

    // Main card with SMART app launch
    cards.push({
        summary: 'AI Expert Panel Analysis Initiated',
        indicator: 'info',
        detail: `Analysis has been started for this patient. Click "View Analysis" to see real-time results and recommendations.

Current Status: In Progress
Analysis ID: ${taskId}`,
        source: getSourceInfo(),
        links: [{
            label: 'View Analysis',
            url: smartLaunchUrl.toString(),
            type: 'smart',
            appContext: JSON.stringify({
                taskId,
                patientId: context.patientId,
                fhirServer: config.fhir.baseUrl,
                clientId: config.smartApp.clientId
            })
        }]
    });

    // Additional information card
    cards.push({
        summary: 'What to Expect',
        indicator: 'info',
        detail: `The AI Expert Panel analysis will:
1. Analyze patient's clinical history
2. Consider current conditions and medications
3. Generate specialist recommendations
4. Create a detailed care plan

Estimated completion time: 2-3 minutes`,
        source: getSourceInfo()
    });

    return cards;
}

function getSourceInfo() {
    return {
        label: 'AI Expert Panel',
        url: config.systemInfo.url,
        icon: config.systemInfo.iconUrl
    };
}

// Configuration endpoint
router.get('/cds-services/ai-expert-panel/config', (req: Request, res: Response) => {
    res.json({
        version: config.version,
        supportedHooks: ['patient-view'],
        requiredPrefetch: ['patient', 'conditions'],
        optionalPrefetch: ['medications', 'observations', 'encounters'],
        smartAppInfo: {
            launchUrl: config.smartApp.launchUrl,
            capabilities: ['context-standalone', 'context-banner']
        }
    });
});

export default router;