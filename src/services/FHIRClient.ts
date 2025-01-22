// src/services/FHIRClient.ts
import Client from 'fhir-kit-client';
import { 
    Resource,
    FhirResource,
    Bundle,
    Task,
    Patient,
    Condition,
    Observation,
    CarePlan,
    OperationOutcome,
    ServiceRequest,
    MedicationStatement
} from 'fhir/r4';

interface FHIRClientConfig {
    baseUrl: string;
    auth?: {
        token?: string;
    };
}

interface SearchParameters {
    _id?: string;
    _lastUpdated?: string;
    _count?: number;
    _include?: string[];
    _revinclude?: string[];
    status?: string;
    patient?: string;
    [key: string]: any;
}

export class FHIRClient {
    private client: Client;
    private baseUrl: string;
    private headers: Record<string, string>;
    private readonly DEFAULT_PAGE_SIZE = 50;
    private retryLimit = 3;
    private retryDelay = 1000;

    constructor(config: FHIRClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.headers = {
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json'
        };

        if (config.auth?.token) {
            this.headers['Authorization'] = `Bearer ${config.auth.token}`;
        }

        this.client = new Client({
            baseUrl: this.baseUrl,
            customHeaders: this.headers
        });
    }

    async search<T extends Resource>(
        resourceType: T['resourceType'],
        params: SearchParameters = {}
    ): Promise<Bundle<T>> {
        const searchParams = {
            _count: this.DEFAULT_PAGE_SIZE,
            ...params,
            ...(params._include && { _include: Array.isArray(params._include) ? 
                params._include : [params._include] }),
            ...(params._revinclude && { _revinclude: Array.isArray(params._revinclude) ? 
                params._revinclude : [params._revinclude] })
        };

        const result = await this.executeWithRetry(() => 
            this.client.search({
                resourceType,
                searchParams
            })
        );

        return result as Bundle<T>;
    }

    async create<T extends Resource>(
        resourceType: T['resourceType'],
        resource: Omit<T, 'id'>
    ): Promise<T> {
        if (resource.resourceType !== resourceType) {
            throw new Error(`Resource type mismatch: expected ${resourceType}, got ${resource.resourceType}`);
        }

        const result = await this.executeWithRetry(() =>
            this.client.create({
                resourceType,
                body: resource
            })
        );

        return result as T;
    }

    async read<T extends Resource>(
        resourceType: T['resourceType'],
        id: string,
        options: { versionId?: string } = {}
    ): Promise<T> {
        let result;
        if (options.versionId) {
            result = await this.executeWithRetry(() =>
                this.client.vread({
                    resourceType,
                    id,
                    version: options.versionId as string
                })
            );
        } else {
            result = await this.executeWithRetry(() =>
                this.client.read({
                    resourceType,
                    id
                })
            );
        }

        return result as T;
    }

    async update<T extends Resource>(
        resourceType: T['resourceType'],
        id: string,
        resource: T
    ): Promise<T> {
        if (resource.resourceType !== resourceType) {
            throw new Error(`Resource type mismatch: expected ${resourceType}, got ${resource.resourceType}`);
        }

        if (resource.id && resource.id !== id) {
            throw new Error(`Resource ID mismatch: expected ${id}, got ${resource.id}`);
        }

        const result = await this.executeWithRetry(() =>
            this.client.update({
                resourceType,
                id,
                body: resource
            })
        );

        return result as T;
    }

    async delete(resourceType: Resource['resourceType'], id: string): Promise<void> {
        await this.executeWithRetry(() =>
            this.client.delete({
                resourceType,
                id
            })
        );
    }

    async createTask(patientId: string, userId: string): Promise<Task> {
        const task: Omit<Task, 'id'> = {
            resourceType: 'Task',
            status: 'requested',
            intent: 'order',
            code: {
                coding: [{
                    system: 'http://example.org/fhir/CodeSystem/analysis-types',
                    code: 'expert-panel-analysis',
                    display: 'Expert Panel Analysis'
                }]
            },
            focus: {
                reference: `Patient/${patientId}`
            },
            for: {
                reference: `Patient/${patientId}`
            },
            owner: {
                reference: `Organization/ai-expert-panel-system`
            },
            authoredOn: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            extension: [{
                url: 'http://example.org/fhir/StructureDefinition/analysis-progress',
                valueInteger: 0
            }]
        };

        return this.create<Task>('Task', task);
    }

    async updateTaskProgress(taskId: string, progress: number): Promise<Task> {
        const task = await this.read<Task>('Task', taskId);
        
        task.lastModified = new Date().toISOString();
        task.extension = [{
            url: 'http://example.org/fhir/StructureDefinition/analysis-progress',
            valueInteger: progress
        }];

        return this.update<Task>('Task', taskId, task);
    }

    private async executeWithRetry<T>(
        operation: () => Promise<any>,
        attempt: number = 0
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= this.retryLimit) {
                throw this.handleError(error);
            }

            const shouldRetry = this.shouldRetryError(error);
            if (!shouldRetry) {
                throw this.handleError(error);
            }

            await this.sleep(this.retryDelay * Math.pow(2, attempt));
            return this.executeWithRetry<T>(operation, attempt + 1);
        }
    }

    private shouldRetryError(error: any): boolean {
        if (!error.response) return false;

        const status = error.response.status;
        return (
            status === 408 || // Request Timeout
            status === 429 || // Too Many Requests
            status === 500 || // Internal Server Error
            status === 502 || // Bad Gateway
            status === 503 || // Service Unavailable
            status === 504    // Gateway Timeout
        );
    }

    private handleError(error: any): Error {
        if (error.response?.data?.resourceType === 'OperationOutcome') {
            const outcome = error.response.data as OperationOutcome;
            const issues = outcome.issue
                .map(issue => 
                    `[${issue.severity}] ${issue.diagnostics || issue.details?.text || 'No details'}`
                )
                .join('; ');
            return new Error(`FHIR Operation Error: ${issues}`);
        }

        if (error.response) {
            return new Error(
                `FHIR request failed: ${error.response.status} - ${error.response.statusText}`
            );
        }

        return error;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default FHIRClient;