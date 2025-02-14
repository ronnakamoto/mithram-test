import { Chain, Hash, Address } from 'viem';
import { PatientNFTClient, NFTMetadata, NFTError } from '../contracts/PatientNFT';
import { EventEmitter } from 'events';
import { setTimeout } from 'timers/promises';

/**
 * Events emitted by NFTManager
 */
export enum NFTManagerEvent {
  MINT_STARTED = 'mint:started',
  MINT_SUCCESS = 'mint:success',
  MINT_FAILED = 'mint:failed',
  UPDATE_STARTED = 'update:started',
  UPDATE_SUCCESS = 'update:success',
  UPDATE_FAILED = 'update:failed',
  UPDATE_COMPLETED = 'update:completed',
  QUEUE_ERROR = 'queue:error'
}

/**
 * Configuration for NFTManager
 */
export interface NFTManagerConfig {
  contractAddress: Address;
  privateKey: `0x${string}`| string;
  chain?: Chain;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  storage?: 'ipfs' | 'datauri';
  queueInterval?: number; // milliseconds
}

/**
 * Result of an NFT operation
 */
export interface NFTOperationResult {
  success: boolean;
  tokenId?: bigint;
  hash?: Hash;
  error?: Error;
  retryCount?: number;
}

/**
 * Queued NFT operation
 */
interface QueuedOperation {
  type: 'mint' | 'update';
  metadata: NFTMetadata;
  patientId?: string;
  analysisId: string;
  retryCount: number;
  lastAttempt?: number;
}

/**
 * Manages NFT operations with retry mechanisms and event emission
 */
export class NFTManager extends EventEmitter {
  private client: PatientNFTClient;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly queueInterval: number;
  private pendingOperations: Map<string, Promise<NFTOperationResult>>;
  private operationQueue: QueuedOperation[] = [];
  private queueProcessor?: NodeJS.Timeout;

  constructor(config: NFTManagerConfig) {
    super();
    
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.queueInterval = config.queueInterval ?? 5000;
    this.pendingOperations = new Map();

    this.client = new PatientNFTClient({
      contractAddress: config.contractAddress,
      privateKey: config.privateKey as `0x${string}`,
      chain: config.chain,
      storage: config.storage
    });

    // Start queue processor
    this.startQueueProcessor();
  }

  /**
   * Queue an NFT mint operation
   */
  async queueNFTMint(params: {
    patientId: string;
    analysisId: string;
    analysisData: any;
  }): Promise<void> {
    const { patientId, analysisId, analysisData } = params;
    console.log('Queueing NFT mint for patient:', patientId, 'analysis:', analysisId);

    const metadata: NFTMetadata = {
      patientId,
      analysisId,
      analysis: analysisData,
      timestamp: new Date().toISOString(),
      previousAnalysis: null
    };

    // Check if patient already has a token
    try {
      const existingMetadata = await this.client.getMetadataByPatientId(patientId);
      console.log('Existing metadata:', existingMetadata);
      
      // Get the token URI to extract the clean object key
      const tokenUri = await this.client.getTokenURI(existingMetadata.analysisId);
      const fullObjectKey = new URL(tokenUri).pathname.slice(1); // Remove leading slash
      const cleanObjectKey = fullObjectKey.replace(/^metadata\/(.+)\.json$/, '$1');
      
      // If we get here, patient has a token - update instead of mint
      metadata.previousAnalysis = cleanObjectKey;
      await this.queueMetadataUpdate(analysisId, metadata);
    } catch (error) {
      // If PATIENT_NOT_FOUND, patient doesn't have a token yet - proceed with minting
      if (error instanceof NFTError && error.code === 'PATIENT_NOT_FOUND') {
        const operationKey = `mint:${analysisId}`;
        
        if (this.pendingOperations.has(operationKey)) {
          return;
        }

        const operation = this.executeWithRetry(async (retryCount) => {
          try {
            this.emit(NFTManagerEvent.MINT_STARTED, { analysisId, metadata, retryCount });
            const result = await this.mintNFT(patientId, metadata);
            this.emit(NFTManagerEvent.MINT_SUCCESS, { analysisId, metadata, result });
          } catch (error) {
            this.emit(NFTManagerEvent.MINT_FAILED, { analysisId, metadata, error, retryCount });
            throw error;
          }
        });

        this.pendingOperations.set(operationKey, operation);
        
        try {
          await operation;
        } finally {
          this.pendingOperations.delete(operationKey);
        }
      } else {
        // If it's some other error, throw it
        throw error;
      }
    }
  }

  /**
   * Queue an NFT metadata update operation
   */
  async queueMetadataUpdate(analysisId: string, metadata: NFTMetadata): Promise<NFTOperationResult> {
    const operationKey = `update:${analysisId}`;
    
    if (this.pendingOperations.has(operationKey)) {
      return this.pendingOperations.get(operationKey)!;
    }

    console.log('Queueing NFT update for analysis:', analysisId);
    console.log('Metadata:', metadata);

    const operation = this.executeWithRetry(async (retryCount: number) => {
      try {
        this.emit(NFTManagerEvent.UPDATE_STARTED, { analysisId, metadata, retryCount });
        const result = await this.updateNFT(analysisId, metadata);
        this.emit(NFTManagerEvent.UPDATE_SUCCESS, { analysisId, metadata, result });
        return result;
      } catch (error) {
        this.emit(NFTManagerEvent.UPDATE_FAILED, { analysisId, metadata, error, retryCount });
        throw error;
      }
    });

    this.pendingOperations.set(operationKey, operation);
    
    try {
      return await operation;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  private startQueueProcessor(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
    }

    this.queueProcessor = setInterval(async () => {
      await this.processQueue();
    }, this.queueInterval);
  }

  private async processQueue(): Promise<void> {
    if (this.operationQueue.length === 0) return;

    const now = Date.now();
    const operation = this.operationQueue[0];

    // Skip if we need to wait for retry delay
    if (operation.lastAttempt && now - operation.lastAttempt < this.retryDelay * Math.pow(2, operation.retryCount - 1)) {
      return;
    }

    try {
      let result: NFTOperationResult;

      if (operation.type === 'mint') {
        result = await this.mintNFT(operation.patientId!, operation.metadata);
      } else {
        result = await this.updateNFT(operation.analysisId, operation.metadata);
      }

      if (result.success) {
        this.operationQueue.shift(); // Remove successful operation
      } else {
        operation.retryCount++;
        operation.lastAttempt = now;

        if (operation.retryCount > this.maxRetries) {
          this.emit(NFTManagerEvent.QUEUE_ERROR, {
            operation,
            error: new Error('Maximum retry attempts exceeded')
          });
          this.operationQueue.shift(); // Remove failed operation
        }
      }
    } catch (error) {
      operation.retryCount++;
      operation.lastAttempt = now;

      if (operation.retryCount > this.maxRetries) {
        this.emit(NFTManagerEvent.QUEUE_ERROR, { operation, error });
        this.operationQueue.shift(); // Remove failed operation
      }
    }
  }

  /**
   * Updates the metadata for an existing NFT
   */
  private async updateNFT(analysisId: string, metadata: NFTMetadata): Promise<NFTOperationResult> {
    try {
      this.emit(NFTManagerEvent.UPDATE_STARTED, analysisId);
      console.log('Updating NFT metadata:', analysisId);
      const hash = await this.client.updateMetadata(
        analysisId,
        metadata
      );

      this.emit(NFTManagerEvent.UPDATE_SUCCESS, {
        analysisId,
        hash
      });

      return {
        success: true,
        hash
      };
    } catch (error) {
      this.emit(NFTManagerEvent.UPDATE_FAILED, {
        analysisId,
        error
      });

      throw error;
    }
  }

  /**
   * Mints a new NFT for a patient's analysis
   */
  async mintNFT(patientId: string, metadata: NFTMetadata): Promise<NFTOperationResult> {
    const operationKey = `mint:${patientId}:${metadata.analysisId}`;
    
    if (this.pendingOperations.has(operationKey)) {
      return this.pendingOperations.get(operationKey)!;
    }

    const operation = this.executeWithRetry(async (retryCount) => {
      try {
        this.emit(NFTManagerEvent.MINT_STARTED, { patientId, metadata, retryCount });

        if (await this.client.exists(metadata.analysisId)) {
          throw new NFTError('NFT already exists for this analysis', 'DUPLICATE_NFT');
        }

        const result = await this.client.mintPatientNFT(patientId, metadata);
        
        this.emit(NFTManagerEvent.MINT_SUCCESS, {
          patientId,
          metadata,
          tokenId: result.tokenId,
          hash: result.hash
        });

        return {
          success: true,
          tokenId: result.tokenId,
          hash: result.hash,
          retryCount
        };
      } catch (error) {
        this.emit(NFTManagerEvent.MINT_FAILED, { patientId, metadata, error, retryCount });
        throw error;
      }
    });

    this.pendingOperations.set(operationKey, operation);
    
    try {
      const result = await operation;
      return result;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  /**
   * Get metadata for a patient by their ID
   */
  async getMetadataByPatientId(patientId: string): Promise<NFTMetadata> {
    try {
      return await this.client.getMetadataByPatientId(patientId);
    } catch (error: any) {
      // Re-throw NFTError instances directly
      if (error instanceof NFTError) {
        throw error;
      }
      // Wrap other errors
      throw new NFTError(`Failed to fetch metadata for patient ${patientId}: ${error.message}`, 'METADATA_FETCH_ERROR');
    }
  }

  /**
   * Verifies ownership of an NFT
   */
  async verifyOwnership(analysisId: string, address: Address): Promise<boolean> {
    return this.client.verifyOwnership(analysisId, address);
  }

  /**
   * Retrieves metadata for an NFT
   */
  async getMetadata(analysisId: string): Promise<NFTMetadata> {
    return this.client.getMetadata(analysisId);
  }

  /**
   * Executes an operation with retry logic
   */
  private async executeWithRetry(
    operation: (retryCount: number) => Promise<NFTOperationResult>
  ): Promise<NFTOperationResult> {
    let lastError: Error | undefined;
    
    for (let retryCount = 0; retryCount <= this.maxRetries; retryCount++) {
      try {
        if (retryCount > 0) {
          await setTimeout(this.retryDelay * Math.pow(2, retryCount - 1));
        }
        
        return await operation(retryCount);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (error instanceof NFTError) {
          if (['DUPLICATE_NFT', 'NFT_NOT_FOUND', 'INVALID_METADATA'].includes(error.code)) {
            throw error;
          }
        }
        
        if (retryCount === this.maxRetries) {
          throw lastError;
        }
      }
    }

    throw lastError ?? new Error('Unknown error during retry');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
    }
  }
}