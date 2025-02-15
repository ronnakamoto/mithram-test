// src/routes/chatService.ts
import express, { Request, Response } from 'express';
import { ChatService } from '../services/ChatService';
import { config } from '../config';
import authMiddleware from '../middleware/authMiddleware';
import { AnalysisHistoryManager, AnalysisHistoryItem } from '../utils/analysisHistory';
import { NFTManager } from '../services/NFTManager';
import type { AnalysisHistory } from '../services/Genesis';

const router = express.Router();

// Initialize services
const chatService = new ChatService(config.analysisQueue.openai.apiKey);
const nftManager = new NFTManager({
    contractAddress: process.env.NFT_CONTRACT_ADDRESS as `0x${string}`,
    privateKey: process.env.NFT_PRIVATE_KEY as `0x${string}`,
    chain: process.env.NFT_CHAIN_ID ? parseInt(process.env.NFT_CHAIN_ID) : 31337,
    rpcUrl: process.env.NFT_RPC_URL || 'http://127.0.0.1:8545',
    storage: process.env.NFT_STORAGE_TYPE as 'ipfs' | 'datauri'
});
const analysisHistoryManager = new AnalysisHistoryManager(nftManager);

/**
 * Convert AnalysisHistoryItem to AnalysisHistory format
 */
function convertToAnalysisHistory(items: AnalysisHistoryItem[]): AnalysisHistory[] {
    return items.map(item => ({
        analysisId: item.analysisId,
        timestamp: item.analysis.completedAt || new Date().toISOString(),
        metadata: {
            ...item.analysis,
            patientId: item.patientId,
            depth: item.depth
        }
    }));
}

// Initialize chat context for a patient
router.post('/chat/:patientId/init', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const { analysisId } = req.body;
        
        if (!patientId || !analysisId) {
            return res.status(400).json({ error: 'Patient ID and Analysis ID are required' });
        }

        // Get patient's analysis history
        const historyItems = await analysisHistoryManager.getAnalysisHistory(analysisId);
        
        // Convert to the format expected by ChatService
        const analysisHistory = convertToAnalysisHistory(historyItems);
        
        // Initialize chat context with patient's analysis history
        const context = await chatService.initializeContext(analysisHistory);

        res.json({
            status: 'success',
            message: 'Chat context initialized successfully',
            context: {
                analysisHistory,
                patientId,
                analysisId
            }
        });
    } catch (error) {
        console.error('Error initializing chat context:', error);
        res.status(500).json({
            error: 'Failed to initialize chat context',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Process chat message
router.post('/chat/:patientId/message', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const { message, context } = req.body;
        
        if (!patientId || !message || !context) {
            return res.status(400).json({ error: 'Patient ID, message, and context are required' });
        }

        // Initialize chat context with patient's analysis history
        await chatService.initializeContext(context.analysisHistory);

        // Process the message
        const response = await chatService.processQuery(message);

        res.json({
            status: 'success',
            response,
            context // Return the context back
        });
    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get chat history
router.get('/chat/:patientId/history', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;

        if (!patientId) {
            return res.status(400).json({ error: 'Patient ID is required' });
        }

        const history = chatService.getChatHistory();

        res.json({
            status: 'success',
            history
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({
            error: 'Failed to fetch chat history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Clear chat history and context
router.delete('/chat/:patientId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;

        if (!patientId) {
            return res.status(400).json({ error: 'Patient ID is required' });
        }

        // Clear chat history and vector store
        chatService.clearChatHistory();
        await chatService.clearVectorStore();

        res.json({
            status: 'success',
            message: 'Chat history and context cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing chat data:', error);
        res.status(500).json({
            error: 'Failed to clear chat data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Export the router
export default router;
