import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export interface TransactionRecord {
    analysisId: string;
    metadataHash: string;
    transactionHash: string;
    chainId: string;
    timestamp: number;
}

export interface TransactionStoreConfig {
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    bucketName?: string;
}

export class TransactionStore {
    private s3Client: S3Client;
    private readonly bucketName: string;
    private static readonly DEFAULT_ENDPOINT = 'https://s3.filebase.com';

    constructor(config?: TransactionStoreConfig) {
        const accessKeyId = config?.accessKeyId || process.env.FILEBASE_ACCESS_KEY;
        const secretAccessKey = config?.secretAccessKey || process.env.FILEBASE_SECRET_KEY;
        const endpoint = config?.endpoint || TransactionStore.DEFAULT_ENDPOINT;
        this.bucketName = config?.bucketName || process.env.FILEBASE_BUCKET_NAME || 'mithram';

        if (!accessKeyId || !secretAccessKey) {
            throw new Error('Filebase credentials not found in environment variables or config');
        }

        this.s3Client = new S3Client({
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            region: config?.region || "us-east-1",
            forcePathStyle: true // Required for Filebase
        });
    }

    async storeTransaction(patientId: string, record: TransactionRecord): Promise<void> {
        try {
            // First, get existing records if any
            const existingRecords = await this.getPatientTransactions(patientId);
            
            // Add new record
            existingRecords.push(record);

            // Store updated records
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: `transactions/${patientId}.json`,
                Body: JSON.stringify(existingRecords),
                ContentType: "application/json"
            });

            await this.s3Client.send(command);
        } catch (error) {
            console.error(`Failed to store transaction for patient ${patientId}:`, error);
            throw error;
        }
    }

    async getPatientTransactions(patientId: string): Promise<TransactionRecord[]> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: `${patientId}.json`
            });

            try {
                const response = await this.s3Client.send(command);
                const bodyContents = await response.Body?.transformToString();
                return bodyContents ? JSON.parse(bodyContents) : [];
            } catch (error: any) {
                // If the file doesn't exist, return empty array
                if (error.name === 'NoSuchKey') {
                    return [];
                }
                throw error;
            }
        } catch (error) {
            console.error(`Failed to get transactions for patient ${patientId}:`, error);
            throw error;
        }
    }

    async getTransactionByAnalysisId(patientId: string, analysisId: string): Promise<TransactionRecord | null> {
        const records = await this.getPatientTransactions(patientId);
        return records.find(record => record.analysisId === analysisId) || null;
    }
}
