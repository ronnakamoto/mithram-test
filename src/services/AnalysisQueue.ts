// src/services/AnalysisQueue.ts
import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { NFTManager, NFTManagerConfig } from './NFTManager';
import OpenAIService, { OpenAIServiceConfig, ClinicalContext } from './OpenAIService';
import Client from 'fhir-kit-client';

interface AnalysisQueueConfig {
    amqp: {
        url: string;
        queue: string;
    };
    nft: NFTManagerConfig;
    openai: OpenAIServiceConfig;
}

interface AnalysisJob {
    taskId: string;
    patient: any;
    userId: string;
    timestamp: number;
}

export class AnalysisQueue {
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private nftManager: NFTManager;
    private openaiService: OpenAIService;
    private isProcessing: boolean = false;
    private queueName: string;
    private activeJobs: Map<string, { patientId: string }> = new Map();

    constructor(config: AnalysisQueueConfig) {
        this.nftManager = new NFTManager(config.nft);
        this.openaiService = new OpenAIService(config.openai);
        this.queueName = config.amqp.queue;

        this.initialize(config.amqp.url).catch(error => {
            console.error('Failed to initialize AMQP connection:', error);
            throw error;
        });
    }

    private async initialize(amqpUrl: string): Promise<void> {
        try {
            this.connection = await amqp.connect(amqpUrl);

            this.connection.on('error', (error) => {
                console.error('AMQP connection error:', error);
                this.reconnect(amqpUrl);
            });

            this.connection.on('close', () => {
                console.log('AMQP connection closed');
                this.reconnect(amqpUrl);
            });

            this.channel = await this.connection.createChannel();

            await this.channel.assertQueue(this.queueName, {
                durable: true,
                deadLetterExchange: 'dlx',
                messageTtl: 24 * 60 * 60 * 1000
            });

            await this.channel.assertExchange('dlx', 'direct');
            await this.channel.assertQueue('failed_analyses', {
                durable: true
            });
            await this.channel.bindQueue('failed_analyses', 'dlx', this.queueName);

            console.log('AMQP connection established');
            await this.startProcessing();
        } catch (error) {
            console.error('AMQP initialization error:', error);
            throw error;
        }
    }

    private async reconnect(amqpUrl: string): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
        } catch (error) {
            console.error('Error closing existing connections:', error);
        }

        try {
            await this.initialize(amqpUrl);
            if (this.isProcessing) {
                await this.startProcessing();
            }
        } catch (error) {
            console.error('Failed to reconnect:', error);
            setTimeout(() => this.reconnect(amqpUrl), 5000);
        }
    }

    async createAnalysis(patient: any, userId: string): Promise<string> {
        try {
            const patientId = patient.id;
            const analysisId = uuidv4();

            // Queue NFT minting asynchronously
            await this.nftManager.queueNFTMint({
                patientId,
                analysisId,
                analysisData: {
                    status: 'pending',
                    createdAt: new Date().toISOString()
                }
            });

            const job: AnalysisJob = {
                taskId: analysisId,
                userId,
                patient,
                timestamp: Date.now()
            };

            if (!this.channel) {
                throw new Error('AMQP channel not initialized');
            }

            this.channel.sendToQueue(
                this.queueName,
                Buffer.from(JSON.stringify(job)),
                {
                    persistent: true,
                    messageId: analysisId,
                    timestamp: job.timestamp,
                    contentType: 'application/json',
                    headers: {
                        'x-retry-count': 0
                    }
                }
            );

            return analysisId;
        } catch (error) {
            console.error('Error creating analysis:', error);
            throw error;
        }
    }

    async startProcessing(): Promise<void> {
        if (!this.channel) {
            throw new Error('AMQP channel not initialized');
        }

        this.isProcessing = true;

        try {
            await this.channel.prefetch(1);

            await this.channel.consume(
                this.queueName,
                async (msg: amqp.ConsumeMessage | null) => {
                    if (!msg) return;

                    try {
                        const job: AnalysisJob = JSON.parse(msg.content.toString());
                        await this.processAnalysis(job);
                        this.channel?.ack(msg);
                    } catch (error) {
                        console.error('Error processing message:', error);
                        const retryCount = ((msg.properties.headers ?? {})['x-retry-count'] as number || 0) + 1;

                        if (retryCount <= 3) {
                            await this.republishWithDelay(msg, retryCount);
                            this.channel?.ack(msg);
                        } else {
                            const currentJob: AnalysisJob = JSON.parse(msg.content.toString());
                            await this.handleFailedAnalysis(currentJob);
                            this.channel?.ack(msg);
                        }
                    }
                },
                { noAck: false }
            );

            console.log('Started processing analysis queue');
        } catch (error) {
            console.error('Error starting queue processing:', error);
            this.isProcessing = false;
            throw error;
        }
    }

    private async processAnalysis(job: AnalysisJob): Promise<void> {
        try {
            console.log('Processing analysis:', job);
            // Store patient ID for this job
            this.activeJobs.set(job.taskId, { patientId: job.patient.id });

            const patientData = job.patient;

            const clinicalContext = this.generateClinicalContext(patientData);

            const recommendations = await this.generateRecommendations(clinicalContext);

            // Get current metadata to preserve previousAnalysis
            const currentMetadata = await this.nftManager.getMetadata(job.taskId);
            
            // Queue NFT metadata update with completed analysis
            await this.nftManager.queueMetadataUpdate(job.taskId, {
                patientId: job.patient.id,
                analysisId: job.taskId,
                analysis: {
                    status: 'completed',
                    clinicalContext,
                    recommendations,
                    completedAt: new Date().toISOString()
                },
                timestamp: new Date().toISOString(),
                previousAnalysis: currentMetadata?.previousAnalysis || null
            });
            console.log(`Analysis completed for task ${job.taskId}`);
            this.activeJobs.delete(job.taskId);
        } catch (error) {
            console.error(`Error processing analysis for task ${job.taskId}:`, error);
            await this.handleAnalysisError(job.taskId, error);
        }
    }

    private generateClinicalContext(patientData: any): ClinicalContext {
        return {
            patient: {
                id: patientData.id,
                birthDate: patientData.birthDate,
                gender: patientData.gender
            },
            conditions: (patientData.conditions || []).map((c: any) => ({
                code: c.code,
                display: c.display,
                status: c.clinicalStatus?.coding?.[0]?.code || 'active',
                severity: c.severity?.coding?.[0]?.code,
                onsetDate: c.onset
            })),
            observations: (patientData.observations || []).map((o: any) => ({
                code: o.code,
                display: o.display,
                value: o.value?.value || o.value,
                unit: o.value?.unit,
                date: o.effectiveDateTime,
                interpretation: o.interpretation
            })),
            medications: (patientData.medications || []).map((m: any) => ({
                code: m.code,
                display: m.display,
                status: m.status,
                startDate: m.effectiveDateTime || m.authoredOn
            }))
        };
    }

    private async generateRecommendations(clinicalContext: ClinicalContext): Promise<any> {
        try {
            console.log('Generating recommendations for clinical context:', clinicalContext);
            return await this.openaiService.generateRecommendations(clinicalContext);
        } catch (error) {
            console.error('Error generating recommendations:', error);
            throw error;
        }
    }

    private async handleAnalysisError(taskId: string, error: any): Promise<void> {
        // Update NFT metadata with error status
        await this.nftManager.queueMetadataUpdate(taskId, {
            analysisId: taskId,
            patientId: this.activeJobs.get(taskId)?.patientId,
            analysis: {
                status: 'failed',
                error: error.message,
                failedAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString(),
            previousAnalysis: null // Will be set by NFTManager based on existing token
        });
    }

    private async republishWithDelay(msg: amqp.ConsumeMessage, retryCount: number): Promise<void> {
        const delay = Math.pow(2, retryCount) * 1000;

        setTimeout(async () => {
            if (!this.channel) return;

            try {
                await this.channel.sendToQueue(
                    this.queueName,
                    msg.content,
                    {
                        ...msg.properties,
                        headers: {
                            ...msg.properties.headers,
                            'x-retry-count': retryCount
                        }
                    }
                );
            } catch (error) {
                console.error('Error republishing message:', error);
            }
        }, delay);
    }

    private async handleFailedAnalysis(job: AnalysisJob): Promise<void> {
        try {
            await this.handleAnalysisError(
                job.taskId,
                new Error('Maximum retry attempts exceeded')
            );
        } catch (error) {
            console.error('Error handling failed analysis:', error);
        }
    }

    async stopProcessing(): Promise<void> {
        this.isProcessing = false;

        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.nftManager.destroy(); // Clean up NFTManager resources
        } catch (error) {
            console.error('Error stopping queue processing:', error);
            throw error;
        }
    }
}