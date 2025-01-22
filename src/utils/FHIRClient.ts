// utils/FHIRClient.ts
import Client from 'fhir-kit-client';

// FHIR Resource Types
type FHIRResourceType = 'Patient' | 'Observation' | 'Condition' | 'Task' | 'CarePlan' | string;

// FHIR Interaction Types
type FHIRInteraction = 'read' | 'write' | 'update' | 'delete' | 'search' | 'create' | string;

interface FHIRClientConfig {
    baseUrl: string;
    auth?: {
        token: string;
    };
}

// FHIR Resource Base Interface
interface FHIRResource {
    resourceType: FHIRResourceType;
    id?: string;
    meta?: {
        versionId?: string;
        lastUpdated?: string;
    };
}

// FHIR Bundle Interface
interface FHIRBundle extends FHIRResource {
    resourceType: 'Bundle';
    type: 'batch' | 'transaction' | 'searchset';
    total?: number;
    entry?: Array<{
        resource: FHIRResource;
        response?: {
            status: string;
            location?: string;
        };
    }>;
}

interface CapabilityStatement extends FHIRResource {
    resourceType: 'CapabilityStatement';
    status: 'active' | 'retired' | 'draft';
    date: string;
    rest?: Array<{
        resource?: Array<{
            type: FHIRResourceType;
            interaction?: Array<{
                code: FHIRInteraction;
            }>;
            searchParam?: Array<{
                name: string;
                type: string;
            }>;
        }>;
    }>;
}

export class FHIRClient {
    private client: Client;

    constructor(config: FHIRClientConfig) {
        this.client = new Client({
            baseUrl: config.baseUrl.replace(/\/$/, ''),
            customHeaders: config.auth ? {
                Authorization: `Bearer ${config.auth.token}`
            } : {}
        });
    }

    /**
     * Search for FHIR resources with optional includes
     */
    async search<T extends FHIRResource>(
        resourceType: FHIRResourceType, 
        params: Record<string, any> = {}, 
        includes: string[] = [], 
        revincludes: string[] = []
    ): Promise<FHIRBundle> {
        try {
            const searchParams = {
                ...params,
                ...(includes.length > 0 && { _include: includes }),
                ...(revincludes.length > 0 && { _revinclude: revincludes })
            };

            return await this.client.search({
                resourceType,
                searchParams
            }) as FHIRBundle;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Create a FHIR resource
     */
    async create<T extends FHIRResource>(resourceType: FHIRResourceType, resource: T): Promise<T> {
        try {
            if (resource.resourceType !== resourceType) {
                throw new Error(`Resource type mismatch: expected ${resourceType}, got ${resource.resourceType}`);
            }

            const result = await this.client.create({
                resourceType,
                body: resource
            });
            
            return result as T;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Read a FHIR resource by ID
     */
    async read<T extends FHIRResource>(
        resourceType: FHIRResourceType, 
        id: string, 
        options: { versionId?: string } = {}
    ): Promise<T> {
        try {
            if (options.versionId) {
                return await this.client.vread({
                    resourceType,
                    id,
                    version: options.versionId
                }) as T;
            }
            return await this.client.read({
                resourceType,
                id
            }) as T;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Update a FHIR resource
     */
    async update<T extends FHIRResource>(resourceType: FHIRResourceType, id: string, resource: T): Promise<T> {
        try {
            if (resource.resourceType !== resourceType) {
                throw new Error(`Resource type mismatch: expected ${resourceType}, got ${resource.resourceType}`);
            }

            return await this.client.update({
                resourceType,
                id,
                body: resource
            }) as T;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Delete a FHIR resource
     */
    async delete(resourceType: FHIRResourceType, id: string): Promise<void> {
        try {
            await this.client.delete({
                resourceType,
                id
            });
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Execute a batch or transaction bundle
     */
    async transaction(bundle: FHIRBundle): Promise<FHIRBundle> {
        try {
            // Validate bundle type first
            if (bundle.type !== 'batch' && bundle.type !== 'transaction') {
                throw new Error('Invalid bundle type: must be batch or transaction');
            }
    
            // Type assertion for library compatibility
            return await this.client.batch({
                body: bundle as FHIRBundle & { type: "batch" }
            }) as FHIRBundle;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get the capability statement
     */
    async capabilities(): Promise<CapabilityStatement> {
        try {
            return await this.client.smartAuthMetadata() as CapabilityStatement;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Check if server supports required capabilities
     */
    async checkCapabilities(required: Array<`${FHIRResourceType}:${FHIRInteraction}`>): Promise<boolean> {
        try {
            const metadata = await this.capabilities();
            const serverResources = metadata.rest?.[0]?.resource || [];
            const missingCapabilities: string[] = [];

            for (const requirement of required) {
                const [resourceType, interaction] = requirement.split(':') as [FHIRResourceType, FHIRInteraction];
                const resource = serverResources.find(r => r.type === resourceType);
                
                if (!resource) {
                    missingCapabilities.push(`Resource ${resourceType} not supported`);
                    continue;
                }

                if (interaction && !resource.interaction?.some(i => i.code === interaction)) {
                    missingCapabilities.push(`${resourceType} doesn't support ${interaction}`);
                }
            }

            if (missingCapabilities.length > 0) {
                throw new Error(`Server missing required capabilities: ${missingCapabilities.join(', ')}`);
            }

            return true;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Handle FHIR errors consistently
     */
    private handleError(error: any): Error {
        if (error.response?.data?.resourceType === 'OperationOutcome') {
            const outcome = error.response.data;
            const issues = outcome.issue
                .map((issue: any) => `[${issue.severity}] ${issue.diagnostics || issue.details?.text || 'No details'}`)
                .join('; ');
            return new Error(`FHIR Operation Error: ${issues}`);
        }
        return error;
    }
}