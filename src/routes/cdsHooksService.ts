// src/routes/cdsHooksService.ts
import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisQueue } from '../services/AnalysisQueue';
import { NFTManager } from '../services/NFTManager';
import { FHIRClient } from '../services/FHIRClient';
import { CDSHookRequest, Card, CDSServiceResponse, Indicator } from '../types/cds-hooks';
import { config } from '../config';
import { Specialist } from '../services/OpenAIService';
import type { Chain } from 'viem/chains';
import { ucanMapper } from '../middleware/ucanMapper'; 
import authMiddleware from '../middleware/authMiddleware';
import { AnalysisHistoryManager } from '../utils/analysisHistory';
import { GenesisService } from '../services/Genesis';
import { TransactionStore } from '../services/TransactionStore';

const router = express.Router();

// Initialize services
const analysisQueue = new AnalysisQueue({
    amqp: config.analysisQueue.amqp,
    nft: {
        contractAddress: process.env.NFT_CONTRACT_ADDRESS  as `0x${string}`,
        privateKey: process.env.NFT_PRIVATE_KEY as `0x${string}`,
        chain: process.env.NFT_CHAIN_ID ? parseInt(process.env.NFT_CHAIN_ID) : 31337,
        rpcUrl: process.env.NFT_RPC_URL || 'http://127.0.0.1:8545',
        storage: process.env.NFT_STORAGE_TYPE as unknown as 'ipfs' | 'datauri'
    },
    openai: {
        apiKey: config.analysisQueue.openai.apiKey,
    }
});

const nftManager = new NFTManager({
    contractAddress: process.env.NFT_CONTRACT_ADDRESS as `0x${string}`,
    privateKey: process.env.NFT_PRIVATE_KEY as `0x${string}`,
    chain: process.env.NFT_CHAIN_ID ? parseInt(process.env.NFT_CHAIN_ID) : 31337,
    rpcUrl: process.env.NFT_RPC_URL || 'http://127.0.0.1:8545',
    storage: process.env.NFT_STORAGE_TYPE as unknown as 'ipfs' | 'datauri'
});

const fhirClient = new FHIRClient(config.fhir);

const historyManager = new AnalysisHistoryManager(nftManager);

// Initialize Genesis service
const genesisService = new GenesisService(config.analysisQueue.openai.apiKey);

// Initialize TransactionStore
const transactionStore = new TransactionStore();

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
                conditions: 'Condition?patient={{context.patientId}}',
                medications: 'MedicationStatement?patient={{context.patientId}}',
                observations: 'Observation?patient={{context.patientId}}',
                encounters: 'Encounter?patient={{context.patientId}}'
            }
        }]
    });
});

// Main CDS Service Endpoint
router.post('/cds-services/:id', async (req: Request, res: Response) => {
    try {
        const hookRequest = req.body as CDSHookRequest;

        console.log('Received request:', hookRequest);

        // Validate request
        const validationError = validateRequest(hookRequest);
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

        console.log('Patient data:', patientData);

        // Create analysis task
        const task = await analysisQueue.createAnalysis(
            { ...patientData.patient, conditions: patientData.conditions, observations: patientData.observations, medications: patientData.medications },
            hookRequest.context.userId
        );

        // Generate response cards
        const cards = generateResponseCards(task, hookRequest.context);
        res.json({ cards });

        // Log successful request
        console.log(`Created analysis task ${task} for patient ${hookRequest.context.patientId}`);
        // res.json({});
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
        const taskId = req.params.taskId;
        const metadata = await nftManager.getMetadata(taskId);

        console.log('Fetched metadata:', metadata);
        if (!metadata) {
            return res.status(404).json({
                cards: [{
                    summary: 'Task not found',
                    indicator: 'warning',
                    detail: 'The specified analysis task could not be found',
                    source: getSourceInfo()
                }]
            });
        }

        // Convert NFT metadata to CDS Hooks cards
        const cards = await generateStatusCards(metadata);
        res.json({ cards });

    } catch (error) {
        console.error('Error fetching task status:', error);
        res.status(500).json({
            cards: [{
                summary: 'Error retrieving task status',
                indicator: 'warning',
                detail: 'An error occurred while retrieving the task status. Please try again later.',
                source: getSourceInfo()
            }]
        });
    }
});

// Patient metadata endpoint
router.get('/patient/:patientId/metadata', authMiddleware, async (req: Request, res: Response) => {
    try {
        const patientId = req.params.patientId;
        
        if (!patientId) {
            return res.status(400).json({ 
                error: 'Missing patientId parameter' 
            });
        }

        const metadata = await nftManager.getMetadataByPatientId(patientId);
        
        if (!metadata) {
            return res.status(404).json({ 
                error: 'Patient not found',
                message: 'No NFT analysis exists for this patient. Please initiate a new analysis.',
                code: 'PATIENT_NOT_FOUND'
            });
        }

        // Get all transactions for this patient
        const transactions = await transactionStore.getPatientTransactions(patientId);
        
        // Create a map of analysisId to transaction info
        const transactionMap = transactions.reduce((map, tx) => {
            map[tx.analysisId] = {
                hash: tx.transactionHash,
                chainId: tx.chainId,
                timestamp: tx.timestamp
            };
            return map;
        }, {} as Record<string, { hash: string; chainId: string; timestamp: number; }>);
        
        // Add transaction info to each metadata entry
        const response = {
            ...metadata,
            transaction: transactionMap[metadata.analysisId] || null
        };

        res.json(response);
    } catch (error: any) {
        console.error('Error fetching patient metadata:', error);
        
        if (error.code === 'PATIENT_NOT_FOUND') {
            return res.status(404).json({ 
                error: 'Patient not found',
                message: 'No NFT analysis exists for this patient. Please initiate a new analysis.',
                code: 'PATIENT_NOT_FOUND'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch patient metadata',
            message: error.message,
            code: error.code || 'INTERNAL_ERROR'
        });
    }
});

// Analysis metadata endpoint
router.get('/analysis/:analysisId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const analysisId = req.params.analysisId;
        
        if (!analysisId) {
            return res.status(400).json({ 
                error: 'Missing analysisId parameter' 
            });
        }

        const metadata = await nftManager.getMetadata(analysisId);
        
        // Get transaction information
        const transactionRecord = await transactionStore.getTransactionByAnalysisId(metadata.patientId, analysisId);
        
        // Combine metadata with transaction info
        const response = {
            ...metadata,
            transaction: transactionRecord ? {
                hash: transactionRecord.transactionHash,
                chainId: transactionRecord.chainId,
                timestamp: transactionRecord.timestamp,
            } : null
        };

        res.json(response);
    } catch (error: any) {
        console.error('Error fetching analysis metadata:', error);
        
        if (error.code === 'NFT_NOT_FOUND') {
            return res.status(404).json({ 
                error: 'Analysis not found',
                message: 'The requested analysis does not exist.',
                code: 'ANALYSIS_NOT_FOUND'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to fetch analysis metadata',
            message: error.message,
            code: error.code || 'INTERNAL_ERROR'
        });
    }
});

// Get analysis history
router.get('/analysis/:analysisId/history', async (req: Request, res: Response) => {
    try {
        const { analysisId } = req.params;
        const { maxDepth } = req.query;

        // Validate maxDepth if provided
        const parsedMaxDepth = maxDepth ? parseInt(maxDepth as string) : undefined;
        if (maxDepth && (isNaN(parsedMaxDepth!) || parsedMaxDepth! < 1)) {
            return res.status(400).json({
                error: 'Invalid maxDepth parameter. Must be a positive integer.'
            });
        }

        // Get analysis history
        const history = await historyManager.getAnalysisHistory(analysisId, parsedMaxDepth);

        // Return the history with additional metadata
        res.json({
            analysisId,
            totalItems: history.length,
            maxDepth: parsedMaxDepth,
            items: history
        });
    } catch (error) {
        console.error('Error fetching analysis history:', error);
        res.status(500).json({
            error: 'Failed to fetch analysis history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Deep Analysis endpoint using GENESIS protocol
router.post('/analysis/:analysisId/deep-analysis', async (req: Request, res: Response) => {
    try {
        const { analysisId } = req.params;
        const { maxDepth } = req.query;

        // Validate maxDepth if provided
        const parsedMaxDepth = maxDepth ? parseInt(maxDepth as string) : 2; // Default to 2 for GENESIS protocol
        if (isNaN(parsedMaxDepth) || parsedMaxDepth < 1) {
            return res.status(400).json({
                error: 'Invalid maxDepth parameter. Must be a positive integer.'
            });
        }

        // Get analysis history
        const history = await historyManager.getAnalysisHistory(analysisId, parsedMaxDepth);
        
        if (!history || history.length === 0) {
            return res.status(404).json({
                error: 'No analysis history found for the given analysisId'
            });
        }

        // Map history to the format expected by GenesisService
        const formattedHistory = history.map(item => ({
            analysisId: item.analysisId,
            timestamp: item.timestamp,
            metadata: {
                ...item.analysis,
                clinicalContext: item.analysis.clinicalContext,
                recommendations: item.analysis.recommendations,
                status: item.analysis.status
            }
        }));

        // Process the analysis using GENESIS protocol
        const deepAnalysis = await genesisService.processAnalysisHistory(formattedHistory);

        res.json({
            analysisId,
            timestamp: new Date().toISOString(),
            deepAnalysis
        });

    } catch (error) {
        console.error('Error in deep analysis:', error);
        res.status(500).json({
            error: 'Failed to perform deep analysis',
            details: error instanceof Error ? error.message : 'Unknown error'
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
    try {
        const patientResource = request.prefetch?.patient;
        if (!patientResource) {
            return {
                isValid: false,
                error: 'Missing patient resource in prefetch data'
            };
        }

        // Process conditions
        const conditions = (request.prefetch?.conditions?.entry || []).map(entry => {
            const resource = entry.resource;
            if (!resource || resource.resourceType !== 'Condition') {
                return null;
            }

            // Extract the primary coding
            const primaryCoding = resource.code?.coding?.[0];
            const categoryCoding = resource.category?.[0]?.coding?.[0];
            const clinicalStatusCoding = resource.clinicalStatus?.coding?.[0];
            const verificationStatusCoding = resource.verificationStatus?.coding?.[0];

            return {
                id: resource.id,
                code: primaryCoding?.code,
                system: primaryCoding?.system,
                display: resource.code?.text || primaryCoding?.display,
                category: {
                    code: categoryCoding?.code,
                    system: categoryCoding?.system,
                    display: categoryCoding?.display
                },
                clinicalStatus: {
                    code: clinicalStatusCoding?.code,
                    display: clinicalStatusCoding?.display
                },
                verificationStatus: {
                    code: verificationStatusCoding?.code,
                    display: verificationStatusCoding?.display
                },
                onset: resource.onsetPeriod?.start || resource.onsetDateTime,
                abatement: resource.abatementDateTime,
                recordedDate: resource.recordedDate,
                severity: resource.severity?.coding?.[0]?.code
            };
        }).filter(condition => condition !== null);

        // Process medications
        const medications = (request.prefetch?.medications?.entry || []).map(entry => {
            const resource = entry.resource;
            if (!resource || resource.resourceType !== 'MedicationRequest') {
                return null;
            }

            const medicationCoding = resource.medicationCodeableConcept?.coding?.[0];
            const statusReason = resource.statusReason?.coding?.[0];
            const categoryInfo = resource.category?.[0]?.coding?.[0];

            return {
                id: resource.id,
                status: resource.status,
                intent: resource.intent,
                code: medicationCoding?.code,
                system: medicationCoding?.system,
                display: resource.medicationCodeableConcept?.text || medicationCoding?.display,
                category: {
                    code: categoryInfo?.code,
                    system: categoryInfo?.system,
                    display: categoryInfo?.display
                },
                authoredOn: resource.authoredOn,
                statusReason: {
                    code: statusReason?.code,
                    display: statusReason?.display
                },
                dosageInstructions: resource.dosageInstruction?.map(dosage => ({
                    text: dosage.text,
                    timing: dosage.timing?.code?.coding?.[0]?.code,
                    asNeeded: dosage.asNeeded,
                    route: dosage.route?.coding?.[0]?.display,
                    doseQuantity: dosage.doseAndRate?.[0]?.doseQuantity
                })),
                dispenseRequest: resource.dispenseRequest ? {
                    quantity: resource.dispenseRequest.quantity,
                    expectedSupplyDuration: resource.dispenseRequest.expectedSupplyDuration
                } : undefined
            };
        }).filter(medication => medication !== null);

        // Process observations
        const observations = (request.prefetch?.observations?.entry || []).map(entry => {
            const resource = entry.resource;
            if (!resource || resource.resourceType !== 'Observation') {
                return null;
            }

            const codeCoding = resource.code?.coding?.[0];
            const categoryCoding = resource.category?.[0]?.coding?.[0];
            
            // Handle different types of values
            let value;
            if (resource.valueQuantity) {
                value = {
                    type: 'Quantity',
                    value: resource.valueQuantity.value,
                    unit: resource.valueQuantity.unit,
                    system: resource.valueQuantity.system,
                    code: resource.valueQuantity.code
                };
            } else if (resource.valueCodeableConcept) {
                const valueCoding = resource.valueCodeableConcept.coding?.[0];
                value = {
                    type: 'CodeableConcept',
                    code: valueCoding?.code,
                    system: valueCoding?.system,
                    display: resource.valueCodeableConcept.text || valueCoding?.display
                };
            } else if (resource.valueString) {
                value = {
                    type: 'String',
                    value: resource.valueString
                };
            }

            return {
                id: resource.id,
                status: resource.status,
                code: codeCoding?.code,
                system: codeCoding?.system,
                display: resource.code?.text || codeCoding?.display,
                category: {
                    code: categoryCoding?.code,
                    system: categoryCoding?.system,
                    display: categoryCoding?.display
                },
                effectiveDateTime: resource.effectiveDateTime || resource.effectivePeriod?.start,
                issued: resource.issued,
                value,
                interpretation: resource.interpretation?.[0]?.coding?.[0]?.code,
                referenceRange: resource.referenceRange?.map(range => ({
                    low: range.low,
                    high: range.high,
                    type: range.type?.coding?.[0]?.code,
                    text: range.text
                }))
            };
        }).filter(observation => observation !== null);

        return {
            isValid: true,
            patient: patientResource,
            conditions,
            medications,
            observations
        };
    } catch (error: any) {
        console.error('Error processing patient data:', error);
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
    // smartLaunchUrl.searchParams.set('launch', taskId);
    // smartLaunchUrl.searchParams.set('iss', config.fhir.baseUrl);
    // smartLaunchUrl.searchParams.set('client_id', config.smartApp.clientId);
    // smartLaunchUrl.searchParams.set('redirect_uri', config.smartApp.redirectUri);

    // Main card with SMART app launch
    cards.push({
        summary: 'AI Expert Panel Analysis Initiated',
        indicator: 'info',
        detail: `An automated clinical analysis(Analysis ID: ${taskId}) has been initiated for this patient using advanced AI algorithms. The analysis will evaluate the patient's clinical context and provide evidence-based recommendations. Click "View Analysis" to monitor progress and view recommendations in real-time. Analysis results are typically available within 2-3 minutes.`,
        source: getSourceInfo(),
        links: [{
            label: 'View Analysis',
            url: smartLaunchUrl.toString(),
            type: 'smart',
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
        label: 'MithramAI Expert Panel',
        url: config.systemInfo.url,
        icon: config.systemInfo.iconUrl
    };
}

function generateStatusCards(metadata: any): Card[] {
    const analysis = metadata.analysis || {};
    const cards: Card[] = [];

    // Add status card
    cards.push({
        summary: `Analysis ${analysis.status || 'unknown'}`,
        indicator: getStatusIndicator(analysis.status),
        detail: getStatusDetail(analysis),
        source: getSourceInfo(),
        suggestions: analysis.status === 'completed' ? getAnalysisSuggestions(analysis) : undefined
    });

    // Add recommendations card if available
    if (analysis.status === 'completed' && analysis.recommendations) {
        const recommendations = analysis.recommendations;
        cards.push({
            summary: 'Specialist Recommendations',
            indicator: 'info',
            detail: formatRecommendations(recommendations),
            source: getSourceInfo(),
            suggestions: recommendations.specialists.map((specialist: any) => ({
                label: `Refer to ${specialist.specialty}`,
                uuid: uuidv4(),
                actions: [{
                    type: 'create',
                    description: `Create referral to ${specialist.specialty}`,
                    resource: createReferralResource(specialist)
                }]
            }))
        });
    }

    // Add error card if failed
    if (analysis.status === 'failed') {
        cards.push({
            summary: 'Analysis Failed',
            indicator: 'critical',
            detail: analysis.error || 'Unknown error occurred',
            source: getSourceInfo()
        });
    }

    return cards;
}

function getStatusIndicator(status?: string): Indicator {
    switch (status) {
        case 'completed':
            return 'info';
        case 'failed':
            return 'critical';
        case 'in-progress':
            return 'info';
        default:
            return 'warning';
    }
}

function getStatusDetail(analysis: any): string {
    switch (analysis.status) {
        case 'completed':
            return `Analysis completed at ${analysis.completedAt}. ${analysis.reasoning || ''}`;
        case 'failed':
            return `Analysis failed at ${analysis.failedAt}. ${analysis.error || ''}`;
        case 'in-progress':
            return 'Analysis is currently in progress. Please check back later.';
        default:
            return 'Analysis status unknown.';
    }
}

function getAnalysisSuggestions(analysis: any): any[] {
    const suggestions = [];
    
    if (analysis.riskFactors?.length > 0) {
        suggestions.push({
            label: 'Document Risk Factors',
            uuid: uuidv4(),
            actions: [{
                type: 'create',
                description: 'Document identified risk factors',
                resource: {
                    resourceType: 'RiskAssessment',
                    status: 'final',
                    prediction: analysis.riskFactors.map((risk: string) => ({
                        outcome: {
                            text: risk
                        }
                    }))
                }
            }]
        });
    }

    return suggestions;
}

function formatRecommendations(recommendations: any): string {
    if (!recommendations.specialists?.length) {
        return 'No specialist recommendations available.';
    }

    const specialistDetails = recommendations.specialists
        .map((s: Specialist) => {
            return `${s.specialty} (${s.priority})\n` +
                   `Justification: ${s.justification}\n` +
                   `Timeframe: ${s.timeframe}\n` +
                   `Confidence: ${(s.confidence * 100).toFixed(1)}%`;
        })
        .join('\n\n');

    return `Specialist Recommendations:\n\n${specialistDetails}`;
}

function createReferralResource(specialist: Specialist): any {
    return {
        resourceType: 'ServiceRequest',
        status: 'draft',
        intent: 'plan',
        priority: specialist.priority,
        code: {
            coding: [{
                system: 'http://snomed.info/sct',
                code: specialist.code,
                display: specialist.specialty
            }]
        },
        occurrenceDateTime: new Date().toISOString(),
        authoredOn: new Date().toISOString(),
        reasonCode: [{
            text: specialist.justification
        }]
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