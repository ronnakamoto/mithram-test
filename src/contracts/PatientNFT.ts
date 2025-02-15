import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  Chain, 
  PublicClient, 
  WalletClient, 
  Address,
  Hash,
  Transport,
  Account
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia, hardhat } from 'viem/chains'
import { v5 as uuidv5 } from 'uuid'
import { keccak256, toBytes } from 'viem/utils'
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import axios from 'axios';

// Custom error class for NFT operations
export class NFTError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'NFTError';
  }
}

// Configuration interface
export interface NFTClientConfig {
  chain?: Chain | number;
  transport?: Transport;
  contractAddress: Address;
  privateKey: `0x${string}`;
  storage?: 'ipfs' | 'filebase' | 'datauri';
  rpcUrl?: string;
}

// Metadata types
export interface AnalysisData {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  clinicalContext?: any;
  recommendations?: any;
  error?: string;
  completedAt?: string;
  failedAt?: string;
}

export interface NFTMetadata {
  patientId: string;
  analysisId: string;
  analysis: AnalysisData;
  timestamp: string;
  previousAnalysis: string | null; // Unique identifier of the previous metadata file, or null if this is the first analysis
}

// Contract ABI
export const PATIENT_NFT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "patientId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "analysisId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "uri",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "metadataHash",
        "type": "bytes32"
      }
    ],
    "name": "safeMint",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'uri', type: 'string' },
    ],
    name: 'updateTokenURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: 'owner', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: 'uri', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'analysisId', type: 'string' }],
    name: 'getTokenByAnalysis',
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'uri', type: 'string' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'analysisId', type: 'string' }
    ],
    name: 'updateMetadata',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "patientId",
        "type": "string"
      }
    ],
    "name": "getTokenByPatient",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
] as const;

// UUID namespace for consistent token ID generation
const TOKEN_ID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export class PatientNFTClient {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private config: Required<NFTClientConfig>;
  private account: Account;

  constructor(config: NFTClientConfig) {
    this.validateConfig(config);
    console.log("Chain config:", {chain: config.chain, rpcUrl: config.rpcUrl})
    
    // Determine chain configuration
    let chainConfig: Chain;
    if (typeof config.chain === 'number') {
      switch(config.chain) {
        case 1337:
          chainConfig = {
            ...hardhat,
            id: 1337,
            rpcUrls: {
              default: { http: [config.rpcUrl || 'http://127.0.0.1:8545'] },
              public: { http: [config.rpcUrl || 'http://127.0.0.1:8545'] }
            }
          };
          break;
        case 11155111: // Sepolia
          chainConfig = {
            ...sepolia,
            rpcUrls: {
              default: { http: [config.rpcUrl || sepolia.rpcUrls.default.http[0]] },
              public: { http: [config.rpcUrl || sepolia.rpcUrls.public.http[0]] }
            }
          };
          break;
        default:
          throw new Error(`Unsupported chain ID: ${config.chain}`);
      }
    } else if (config.chain) {
      chainConfig = config.chain;
    } else {
      // Default to hardhat local network
      chainConfig = {
        ...hardhat,
        id: 31337,
        rpcUrls: {
          default: { http: [config.rpcUrl || 'http://127.0.0.1:8545'] },
          public: { http: [config.rpcUrl || 'http://127.0.0.1:8545'] }
        }
      };
    }

    this.config = {
      chain: chainConfig,
      transport: config.transport || http(config.rpcUrl || chainConfig.rpcUrls.default.http[0]),
      contractAddress: config.contractAddress,
      privateKey: config.privateKey,
      storage: config.storage || 'datauri',
      rpcUrl: config.rpcUrl || chainConfig.rpcUrls.default.http[0]
    };

    console.log("Chain configuration:", {
      chainId: this.config.chain.id,
      name: this.config.chain.name,
      rpcUrl: this.config.rpcUrl
    });

    this.account = privateKeyToAccount(this.config.privateKey);
    
    this.publicClient = createPublicClient({
      chain: this.config.chain,
      transport: this.config.transport
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.config.chain,
      transport: this.config.transport
    });
  }

  private validateConfig(config: NFTClientConfig): void {
    if (!config.contractAddress) {
      throw new NFTError('Contract address is required', 'INVALID_CONFIG');
    }
    if (!config.privateKey) {
      throw new NFTError('Private key is required', 'INVALID_CONFIG');
    }
  }

  private async storeMetadata(metadata: NFTMetadata): Promise<string> {
    if (this.config.storage === 'ipfs') {
      const filebaseAccessKeyId = process.env.FILEBASE_ACCESS_KEY;
      const filebaseSecretAccessKey = process.env.FILEBASE_SECRET_KEY;
      const filebaseBucketName = process.env.FILEBASE_BUCKET_NAME || 'mithram';
      const filebaseEndpoint = 'https://s3.filebase.com';

      if (!filebaseAccessKeyId || !filebaseSecretAccessKey) {
        throw new NFTError('Filebase credentials not found in environment variables', 'CONFIGURATION_ERROR');
      }

      try {
        const s3Client = new S3Client({
          endpoint: filebaseEndpoint,
          region: 'us-east-1',
          credentials: {
            accessKeyId: filebaseAccessKeyId,
            secretAccessKey: filebaseSecretAccessKey,
          },
        });

        const objectKey = `metadata/${metadata.analysisId}-${Date.now()}.json`;
        const putObjectParams = {
          Bucket: filebaseBucketName,
          Key: objectKey,
          Body: JSON.stringify(metadata),
          ContentType: 'application/json',
        };

        const command = new PutObjectCommand(putObjectParams);
        await s3Client.send(command);

        return `https://${filebaseBucketName}.s3.filebase.com/${objectKey}`;
      } catch (error) {
        console.error('Error uploading to Filebase:', error);
        throw new NFTError(`Failed to upload metadata to Filebase: ${error.message}`, 'STORAGE_ERROR');
      }
    }

    // Store as data URI (default fallback)
    return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
  }

  async mintPatientNFT(patientId: string, metadata: NFTMetadata): Promise<{ tokenId: bigint; hash: Hash }> {
    try {
      if (!metadata.analysisId) {
        throw new NFTError('Analysis ID is required', 'INVALID_METADATA');
      }

      const tokenURI = await this.storeMetadata(metadata);
      
      // Generate metadata hash using keccak256
      const metadataHash = keccak256(toBytes(JSON.stringify(metadata)));

      // Simulate the contract write first
      const { request } = await this.publicClient.simulateContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'safeMint',
        args: [this.account.address, patientId, metadata.analysisId, tokenURI, metadataHash],
        account: this.account
      });

      // Execute the contract write if simulation succeeds
      const hash = await this.walletClient.writeContract(request);

      // Get the token ID from the contract using the analysis ID
      const tokenId = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'getTokenByAnalysis',
        args: [metadata.analysisId]
      });

      return { tokenId, hash };
    } catch (error) {
      console.error('Error minting patient NFT:', error);
      throw error instanceof NFTError ? error : new NFTError(
        'Failed to mint NFT',
        'MINT_ERROR'
      );
    }
  }

  async updateMetadata(analysisId: string, metadata: NFTMetadata): Promise<Hash> {
    try {
      // Get token ID using patient ID since the analysis ID won't exist yet
      const tokenId = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'getTokenByPatient',
        args: [metadata.patientId]
      });

      const tokenURI = await this.storeMetadata(metadata);

      // Generate metadata hash using keccak256
      const metadataHash = keccak256(toBytes(JSON.stringify(metadata)));

      // Simulate the contract write first
      const { request } = await this.publicClient.simulateContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'updateMetadata',
        args: [tokenId, tokenURI, metadataHash, metadata.analysisId],
        account: this.account
      });

      // Execute the contract write if simulation succeeds
      return await this.walletClient.writeContract(request);
    } catch (error) {
      console.error('Error updating metadata:', error);
      throw error instanceof NFTError ? error : new NFTError(
        'Failed to update metadata',
        'UPDATE_ERROR'
      );
    }
  }

  async getMetadata(analysisId: string): Promise<NFTMetadata> {
    try {
      // Get token ID from contract using analysis ID
      const tokenId = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'getTokenByAnalysis',
        args: [analysisId]
      });

      // Get token URI
      const tokenURI = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'tokenURI',
        args: [tokenId]
      });

      // Parse metadata from URI
      if (this.config.storage === 'datauri') {
        const base64Data = tokenURI.split(',')[1];
        const jsonStr = Buffer.from(base64Data, 'base64').toString();
        return JSON.parse(jsonStr);
      } else if (this.config.storage === 'ipfs') {
        try {
          const filebaseAccessKeyId = process.env.FILEBASE_ACCESS_KEY;
          const filebaseSecretAccessKey = process.env.FILEBASE_SECRET_KEY;
          const filebaseBucketName = process.env.FILEBASE_BUCKET_NAME || 'mithram';
          const filebaseEndpoint = 'https://s3.filebase.com';

          if (!filebaseAccessKeyId || !filebaseSecretAccessKey) {
            throw new NFTError('Filebase credentials not found in environment variables', 'CONFIGURATION_ERROR');
          }

          // If we're getting a previous version, construct the full object key
          let objectKey: string;
          if (tokenURI.includes('/metadata/')) {
            objectKey = new URL(tokenURI).pathname.slice(1); // Current version
          } else {
            // Previous version - construct the full path
            objectKey = `metadata/${tokenURI}.json`;
          }

          // Create S3 client for Filebase
          const s3Client = new S3Client({
            endpoint: filebaseEndpoint,
            region: 'us-east-1',
            credentials: {
              accessKeyId: filebaseAccessKeyId,
              secretAccessKey: filebaseSecretAccessKey,
            },
          });

          // Get the object from Filebase
          const command = new GetObjectCommand({
            Bucket: filebaseBucketName,
            Key: objectKey,
          });

          const response = await s3Client.send(command);
          const bodyContents = await this.streamToString(response.Body);
          return JSON.parse(bodyContents);
        } catch (error) {
          console.error('Error fetching from Filebase:', error);
          throw new NFTError(`Failed to fetch metadata from Filebase: ${error.message}`, 'STORAGE_ERROR');
        }
      }

      throw new NFTError('Unsupported storage type', 'CONFIGURATION_ERROR');
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw error instanceof NFTError ? error : new NFTError(
        'Failed to get metadata',
        'METADATA_ERROR'
      );
    }
  }

  async getMetadataByPatientId(patientId: string): Promise<NFTMetadata> {
    try {
      // Get token ID for the patient
      const tokenId = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'getTokenByPatient',
        args: [patientId]
      });

      // Get token URI
      const tokenUri = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'tokenURI',
        args: [tokenId]
      });

      console.log('Token URI:', tokenUri);

      // Parse metadata from URI based on storage type
      if (this.config.storage === 'datauri') {
        const base64Data = tokenUri.split(',')[1];
        const jsonStr = Buffer.from(base64Data, 'base64').toString();
        return JSON.parse(jsonStr);
      } else if (this.config.storage === 'ipfs' || this.config.storage === 'filebase') {
        const filebaseAccessKeyId = process.env.FILEBASE_ACCESS_KEY;
        const filebaseSecretAccessKey = process.env.FILEBASE_SECRET_KEY;
        const filebaseBucketName = process.env.FILEBASE_BUCKET_NAME || 'mithram';
        const filebaseEndpoint = 'https://s3.filebase.com';

        if (!filebaseAccessKeyId || !filebaseSecretAccessKey) {
          throw new NFTError('Filebase credentials not found in environment variables', 'CONFIGURATION_ERROR');
        }

        // Extract object key from the tokenUri
        const objectKey = new URL(tokenUri).pathname.slice(1); // Remove leading slash

        // Create S3 client for Filebase
        const s3Client = new S3Client({
          endpoint: filebaseEndpoint,
          region: 'us-east-1',
          credentials: {
            accessKeyId: filebaseAccessKeyId,
            secretAccessKey: filebaseSecretAccessKey,
          },
        });

        // Get the object from Filebase
        const command = new GetObjectCommand({
          Bucket: filebaseBucketName,
          Key: objectKey,
        });

        const response = await s3Client.send(command);
        const jsonStr = await this.streamToString(response.Body);
        return JSON.parse(jsonStr);
      } else {
        // Direct HTTP fetch for other storage types
        const response = await axios.get(tokenUri);
        return response.data as NFTMetadata;
      }
    } catch (error: any) {
      console.error('Error fetching metadata:', error);
      // Check if it's a contract revert error for patient not found
      if (error.message?.includes('Patient not found')) {
        throw new NFTError('Patient not found', 'PATIENT_NOT_FOUND');
      }
      if (error instanceof NFTError) {
        throw error;
      }
      throw new NFTError(`Failed to fetch metadata for patient ${patientId}: ${error.message}`, 'METADATA_FETCH_ERROR');
    }
  }

  async getTokenURI(analysisId: string): Promise<string> {
    try {
      // Get token ID from contract using analysis ID
      const tokenId = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'getTokenByAnalysis',
        args: [analysisId]
      });

      // Get token URI
      return await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'tokenURI',
        args: [tokenId]
      });
    } catch (error) {
      console.error('Error getting token URI:', error);
      throw error instanceof NFTError ? error : new NFTError(
        'Failed to get token URI',
        'URI_ERROR'
      );
    }
  }

  async verifyOwnership(analysisId: string, address: Address): Promise<boolean> {
    try {
      // Get token ID from contract using analysis ID
      const tokenId = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'getTokenByAnalysis',
        args: [analysisId]
      });

      const owner = await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'ownerOf',
        args: [tokenId]
      });

      return owner.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Error verifying ownership:', error);
      return false;
    }
  }

  async exists(analysisId: string): Promise<boolean> {
    try {
      // Try to get token ID from contract using analysis ID
      await this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: PATIENT_NFT_ABI,
        functionName: 'getTokenByAnalysis',
        args: [analysisId]
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getMetadataFromFilebase(objectKey: string): Promise<NFTMetadata> {
    try {
      console.log('Fetching metadata from Filebase:', objectKey);
      const filebaseAccessKeyId = process.env.FILEBASE_ACCESS_KEY;
      const filebaseSecretAccessKey = process.env.FILEBASE_SECRET_KEY;
      const filebaseBucketName = process.env.FILEBASE_BUCKET_NAME || 'mithram';
      const filebaseEndpoint = 'https://s3.filebase.com';

      if (!filebaseAccessKeyId || !filebaseSecretAccessKey) {
        throw new NFTError('Filebase credentials not found in environment variables', 'CONFIGURATION_ERROR');
      }

      // Create S3 client for Filebase
      const s3Client = new S3Client({
        endpoint: filebaseEndpoint,
        region: 'us-east-1',
        credentials: {
          accessKeyId: filebaseAccessKeyId,
          secretAccessKey: filebaseSecretAccessKey,
        },
      });

      // Get the object from Filebase
      const command = new GetObjectCommand({
        Bucket: filebaseBucketName,
        Key: objectKey,
      });

      const response = await s3Client.send(command);
      const bodyContents = await this.streamToString(response.Body);
      return JSON.parse(bodyContents);
    } catch (error) {
      console.error('Error fetching from Filebase:', error);
      throw new NFTError(`Failed to fetch metadata from Filebase: ${error.message}`, 'STORAGE_ERROR');
    }
  }

  private async streamToString(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk: any) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }
}
