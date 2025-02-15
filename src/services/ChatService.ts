import { GenesisService } from './Genesis';
import type { AnalysisHistory, SynthesizedAnalysis } from './Genesis';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface EnrichedContext {
    relevantAnalyses: string[];
    synthesizedInsights: SynthesizedAnalysis;
}

interface DoctorSpecialty {
    specialty: string;
    relevance: number; // 0-1 score
    reasoning: string;
}

interface DoctorConsultation {
    specialty: string;
    analysis: string;
    recommendations: string[];
    confidence: number; // 0-1 score
}

interface ConsultationSummary {
    primarySpecialist: string;
    consultingSpecialists: string[];
    diagnosis: string;
    recommendations: string[];
    followUpSuggestions: string[];
    patientNotes: string;
}

export class ChatService {
    private genesis: GenesisService;
    private vectorStore: MemoryVectorStore;
    private embeddings: OpenAIEmbeddings;
    private chatHistory: ChatMessage[] = [];
    private llm: ChatOpenAI;
    private specialtyAnalyzer: RunnableSequence;
    private consultationTemplate: PromptTemplate;
    private summaryTemplate: PromptTemplate;

    constructor(apiKey: string) {
        this.genesis = new GenesisService(apiKey);
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: apiKey,
            modelName: 'text-embedding-3-small'
        });
        this.vectorStore = new MemoryVectorStore(this.embeddings);
        this.llm = new ChatOpenAI({
            modelName: 'gpt-4o-mini',
            temperature: 0.2,
            openAIApiKey: apiKey
        });

        // Initialize specialty analyzer
        const specialtyTemplate = PromptTemplate.fromTemplate(`
            Analyze the following patient query and medical context to determine which medical specialists should be consulted.
            Consider both the explicit and implicit medical aspects of the query.

            Query: {query}
            Patient Context: {context}

            You must respond with a valid JSON array containing up to 3 medical specialties.
            Each specialty must have exactly these fields:
            - specialty: string with the specialist title (e.g. "Cardiologist")
            - relevance: number between 0 and 1
            - reasoning: string explaining why this specialist is needed

            Format your response as a JSON array like this:
            [
                {
                    "specialty": "Cardiologist",
                    "relevance": 0.9,
                    "reasoning": "Patient's symptoms suggest potential cardiac issues"
                }
            ]
        `);

        this.specialtyAnalyzer = RunnableSequence.from([
            specialtyTemplate,
            this.llm,
            new JsonOutputParser<DoctorSpecialty[]>()
        ]);

        // Initialize consultation template
        this.consultationTemplate = PromptTemplate.fromTemplate(`
            You are a {specialty} analyzing the following patient case:

            Patient Query: {query}
            Medical Context: {context}
            Current Insights: {currentInsights}

            Provide your specialist analysis and recommendations. Be thorough yet concise.
            Focus on aspects relevant to your specialty.
            Consider interactions with other conditions and treatments.
            
            Format your response as JSON:
            \`\`\`json
            {
                "specialty": "your specialty",
                "analysis": "your detailed analysis",
                "recommendations": ["recommendation1", "recommendation2", ...],
                "confidence": number (0-1)
            }
            \`\`\`
        `);

        // Initialize summary template
        this.summaryTemplate = PromptTemplate.fromTemplate(`
            As the head physician, synthesize the following specialist consultations into a comprehensive response:

            Patient Query: {query}
            Specialist Consultations: {consultations}

            Provide a clear, authoritative summary that a patient can understand.
            Format your response as JSON:
            \`\`\`json
            {
                "primarySpecialist": "string (lead specialist)",
                "consultingSpecialists": ["specialist1", "specialist2"],
                "diagnosis": "string (clear explanation)",
                "recommendations": ["recommendation1", "recommendation2"],
                "followUpSuggestions": ["followup1", "followup2"],
                "patientNotes": "string (additional important notes)"
            }
            \`\`\`
        `);
    }

    /**
     * Process a user query through the panel of AI doctors
     */
    async processQuery(query: string): Promise<string> {
        // Get enriched context
        const context = await this.getEnrichedContext(query);
        
        // Determine required specialists
        const specialists = await this.specialtyAnalyzer.invoke({
            query,
            context: JSON.stringify(context)
        });

        // Get consultation from each specialist
        const consultations: DoctorConsultation[] = await Promise.all(
            specialists.map(async (spec) => {
                const consultation = await this.llm.invoke(
                    await this.consultationTemplate.format({
                        specialty: spec.specialty,
                        query,
                        context: JSON.stringify(context),
                        currentInsights: JSON.stringify(context.synthesizedInsights)
                    })
                );
                return JSON.parse(consultation.content);
            })
        );

        // Generate final summary
        const summary = await this.llm.invoke(
            await this.summaryTemplate.format({
                query,
                consultations: JSON.stringify(consultations)
            })
        );

        const finalResponse = JSON.parse(summary.content) as ConsultationSummary;

        // Format the response in a user-friendly way
        const response = `
Based on your query, I consulted with our panel of specialists including ${finalResponse.consultingSpecialists.join(', ')}, led by our ${finalResponse.primarySpecialist}.

${finalResponse.diagnosis}

Key Recommendations:
${finalResponse.recommendations.map(rec => `• ${rec}`).join('\n')}

Follow-up Actions:
${finalResponse.followUpSuggestions.map(sug => `• ${sug}`).join('\n')}

Additional Notes:
${finalResponse.patientNotes}

Feel free to ask any questions about these recommendations or request clarification from any of our specialists.`;

        // Add to chat history
        await this.addMessage('assistant', response);

        return response;
    }

    /**
     * Initialize the RAG context with patient analyses
     */
    async initializeContext(patientAnalyses: AnalysisHistory[]) {
        // Convert analyses to documents for vector store
        const documents = patientAnalyses.map(analysis => new Document({
            pageContent: JSON.stringify(analysis.metadata),
            metadata: {
                analysisId: analysis.analysisId,
                timestamp: analysis.timestamp
            }
        }));

        // Store documents in vector store
        await this.vectorStore.addDocuments(documents);
    }

    /**
     * Get enriched context for the current chat message
     */
    async getEnrichedContext(query: string): Promise<EnrichedContext> {
        // Get relevant documents from vector store
        const relevantDocs = await this.vectorStore.similaritySearch(query, 3);
        
        // Extract analyses from relevant documents
        const relevantAnalyses = relevantDocs.map(doc => {
            const analysis = JSON.parse(doc.pageContent);
            return analysis;
        });

        // Convert to AnalysisHistory format
        const analysisHistories = relevantDocs.map(doc => ({
            analysisId: doc.metadata.analysisId,
            timestamp: doc.metadata.timestamp,
            metadata: JSON.parse(doc.pageContent)
        }));

        // Use Genesis to synthesize insights
        const synthesizedInsights = await this.genesis.processAnalysisHistory(analysisHistories);

        return {
            relevantAnalyses: relevantAnalyses,
            synthesizedInsights
        };
    }

    /**
     * Add a message to the chat history
     */
    async addMessage(role: 'user' | 'assistant', content: string) {
        this.chatHistory.push({
            role,
            content,
            timestamp: new Date()
        });
    }

    /**
     * Get the chat history
     */
    getChatHistory(): ChatMessage[] {
        return this.chatHistory;
    }

    /**
     * Clear the chat history
     */
    clearChatHistory() {
        this.chatHistory = [];
    }

    /**
     * Clear the vector store
     */
    async clearVectorStore() {
        await this.vectorStore.delete();
    }
}
