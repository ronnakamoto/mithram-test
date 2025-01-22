// src/services/AnalysisQueue.ts
import * as amqp from 'amqplib';
import OpenAIService from './OpenAIService';
import FHIRClient from './FHIRClient';
import {
    Task,
    Bundle,
    Patient,
    Condition,
    Observation,
    CarePlan,
    OperationOutcome
} from 'fhir/r4';

interface AnalysisQueueConfig {
    amqp: {
        url: string;
        queue: string;
    };
    fhir: {
        baseUrl: string;
        auth?: {
            token?: string;
        };
    };
    openai: {
        apiKey: string;
    };
    systemId: string;
}

interface AnalysisJob {
    taskId: string;
    patientId: string;
    userId: string;
    timestamp: number;
}

interface ClinicalContext {
    patient: {
        id: string;
        birthDate?: string;
        gender?: string;
    };
    conditions: Array<{
        code?: string;
        display?: string;
        status?: string;
        severity?: string;
        onsetDate?: string;
    }>;
    observations: Array<{
        code?: string;
        display?: string;
        value?: number;
        unit?: string;
        interpretation?: string;
    }>;
}

export class AnalysisQueue {
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private fhirClient: FHIRClient;
    private openaiService: OpenAIService;
    private isProcessing: boolean = false;
    private queueName: string;
    private systemId: string;

    constructor(config: AnalysisQueueConfig) {
        this.fhirClient = new FHIRClient(config.fhir);
        this.openaiService = new OpenAIService(config.openai.apiKey);
        this.queueName = config.amqp.queue;
        this.systemId = config.systemId;

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

    async createAnalysis(patientId: string, userId: string): Promise<Task> {
        try {
            const task = await this.fhirClient.createTask(patientId, userId);

            const job: AnalysisJob = {
                taskId: task.id!,
                patientId,
                userId,
                timestamp: Date.now()
            };

            if (!this.channel) {
                throw new Error('AMQP channel not initialized');
            }

            await this.channel.sendToQueue(
                this.queueName,
                Buffer.from(JSON.stringify(job)),
                {
                    persistent: true,
                    messageId: task.id,
                    timestamp: job.timestamp,
                    contentType: 'application/json',
                    headers: {
                        'x-retry-count': 0
                    }
                }
            );

            return task;
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
            await this.updateTaskStatus(job.taskId, 'in-progress', 10);

            const patientData = await this.fetchPatientData(job.patientId);
            await this.updateTaskStatus(job.taskId, 'in-progress', 30);

            const clinicalContext = this.generateClinicalContext(patientData);
            await this.updateTaskStatus(job.taskId, 'in-progress', 50);

            const recommendations = await this.openaiService.generateRecommendations(clinicalContext);
            await this.updateTaskStatus(job.taskId, 'in-progress', 70);

            const carePlan = await this.createCarePlan(job.patientId, recommendations);
            await this.updateTaskStatus(job.taskId, 'in-progress', 90);

            await this.updateTaskStatus(job.taskId, 'completed', 100);
            await this.linkCarePlanToTask(job.taskId, carePlan.id!);

            console.log(`Analysis completed for task ${job.taskId}`);
        } catch (error) {
            console.error(`Analysis error for task ${job.taskId}:`, error);
            await this.handleAnalysisError(job.taskId, error);
            throw error;
        }
    }

    private async fetchPatientData(patientId: string): Promise<Bundle> {
        return await this.fhirClient.search('Patient', {
            _id: patientId,
            _revinclude: [
                'Condition:patient',
                'Observation:patient',
                'MedicationStatement:patient'
            ],
            _count: 100
        });
    }

    private generateClinicalContext(patientData: Bundle): ClinicalContext {
        const patient = patientData.entry?.find(e =>
            e.resource?.resourceType === 'Patient'
        )?.resource as Patient;

        const conditions = patientData.entry?.filter(e =>
            e.resource?.resourceType === 'Condition'
        ).map(e => e.resource as Condition);

        const observations = patientData.entry?.filter(e =>
            e.resource?.resourceType === 'Observation'
        ).map(e => e.resource as Observation);

        return {
            patient: {
                id: patient.id!,
                birthDate: patient.birthDate,
                gender: patient.gender
            },
            conditions: conditions?.map(c => ({
                code: c.code?.coding?.[0]?.code,
                display: c.code?.coding?.[0]?.display,
                status: c.clinicalStatus?.coding?.[0]?.code,
                severity: c.severity?.coding?.[0]?.code,
                onsetDate: c.onsetDateTime
            })) || [],
            observations: observations?.map(o => ({
                code: o.code?.coding?.[0]?.code,
                display: o.code?.coding?.[0]?.display,
                value: o.valueQuantity?.value,
                unit: o.valueQuantity?.unit,
                interpretation: o.interpretation?.[0]?.coding?.[0]?.code
            })) || []
        };
    }

    private async createCarePlan(patientId: string, recommendations: any): Promise<CarePlan> {
        const carePlan: Omit<CarePlan, 'id'> = {
            resourceType: 'CarePlan',
            status: 'active',
            intent: 'plan',
            subject: {
                reference: `Patient/${patientId}`
            },
            created: new Date().toISOString(),
            author: {
                reference: `Organization/${this.systemId}`
            },
            activity: recommendations.specialists.map((specialist: any) => ({
                detail: {
                    kind: 'ServiceRequest',
                    code: {
                        coding: [{
                            system: 'http://example.org/fhir/CodeSystem/care-plan-activity',
                            code: specialist.type,
                            display: specialist.name
                        }]
                    },
                    status: 'scheduled',
                    description: specialist.justification,
                    priority: specialist.priority
                }
            }))
        };

        return await this.fhirClient.create('CarePlan', carePlan);
    }

    private async updateTaskStatus(taskId: string, status: Task['status'], progress: number): Promise<void> {
        const task = await this.fhirClient.read<Task>('Task', taskId);

        task.status = status;
        task.lastModified = new Date().toISOString();
        task.extension = [{
            url: 'http://example.org/fhir/StructureDefinition/analysis-progress',
            valueInteger: progress
        }];

        await this.fhirClient.update('Task', taskId, task);
    }

    private async linkCarePlanToTask(taskId: string, carePlanId: string): Promise<void> {
        const task = await this.fhirClient.read<Task>('Task', taskId);

        task.output = [{
            type: {
                coding: [{
                    system: 'http://hl7.org/fhir/CodeSystem/task-output-type',
                    code: 'CarePlan',
                    display: 'Care Plan'
                }]
            },
            valueReference: {
                reference: `CarePlan/${carePlanId}`
            }
        }];

        await this.fhirClient.update('Task', taskId, task);
    }

    private async handleAnalysisError(taskId: string, error: any): Promise<void> {
        const outcome: Omit<OperationOutcome, 'id'> = {
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'processing',
                diagnostics: error.message
            }]
        };

        const createdOutcome = await this.fhirClient.create('OperationOutcome', outcome);

        const task = await this.fhirClient.read<Task>('Task', taskId);
        task.status = 'failed';
        task.lastModified = new Date().toISOString();
        task.output = [{
            type: {
                coding: [{
                    system: 'http://hl7.org/fhir/CodeSystem/task-output-type',
                    code: 'OperationOutcome',
                    display: 'Operation Outcome'
                }]
            },
            valueReference: {
                reference: `OperationOutcome/${createdOutcome.id}`
            }
        }];

        await this.fhirClient.update('Task', taskId, task);
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
        } catch (error) {
            console.error('Error stopping queue processing:', error);
            throw error;
        }
    }
}