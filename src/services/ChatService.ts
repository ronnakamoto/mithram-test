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
    private queryAnalyzer: RunnableSequence;
    private directResponseTemplate: PromptTemplate;
    private basicQueryTemplate: PromptTemplate;

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

        // Initialize query analyzer to determine if specialist consultation is needed
        const queryAnalyzerTemplate = PromptTemplate.fromTemplate(`
            Analyze if the following clinician query requires specialist medical consultation.
            Many queries can be answered directly from the patient context without specialist input.

            Query from Clinician: {query}
            Patient Context: {context}

            Examples of queries that DON'T need specialist consultation:
            - Patient demographic and history inquiries
            - Lab result interpretations within normal ranges
            - Standard medication information and current prescriptions
            - Basic disease progression tracking
            - Administrative or documentation queries
            - Standard protocol confirmations
            - Basic differential diagnosis support

            Examples of queries that DO need specialist consultation:
            - Complex case analysis requiring multi-specialty input
            - Unusual lab results or imaging findings
            - Treatment plan modifications for complex cases
            - Rare disease management
            - Drug interaction analysis in complex cases
            - Novel therapeutic approaches
            - Cases with multiple comorbidities

            Format your response as JSON:
            {
                "needsSpecialist": boolean,
                "reasoning": "string explaining clinical rationale for specialist consultation decision",
                "confidence": number between 0 and 1
            }
        `);

        this.queryAnalyzer = RunnableSequence.from([
            queryAnalyzerTemplate,
            this.llm,
            new JsonOutputParser()
        ]);

        // Template for direct responses (no specialist needed)
        this.directResponseTemplate = PromptTemplate.fromTemplate(`
            You are a medical AI assistant supporting a clinician. Provide a professional, evidence-based response using the available patient context.
            Focus on clinical relevance and be precise with medical terminology.

            Query from Clinician: {query}
            Patient Context: {context}

            Respond in a clinically appropriate manner. Include relevant metrics, lab values, and clinical observations where applicable.
            If any information is unclear or requires specialist interpretation, note this explicitly.
        `);

        // Simple template for basic queries
        this.basicQueryTemplate = PromptTemplate.fromTemplate(`
            You are a medical AI assistant helping a clinician. Answer the following query using only the provided context.
            Be concise and direct. Use clinical terminology.

            Query: {query}
            Patient Context: {context}

            Respond with just the relevant information, no explanations needed unless specifically asked.
        `);

        // Initialize specialty analyzer
        const specialtyTemplate = PromptTemplate.fromTemplate(`
            Analyze the following clinician query and patient context to determine which medical specialists should be consulted.
            Consider both explicit and implicit clinical factors in the query.

            Query from Clinician: {query}
            Patient Context: {context}

            You must respond with a valid JSON array containing up to 3 medical specialties.
            Each specialty must have exactly these fields:
            - specialty: string with the specialist title (e.g. "Cardiologist")
            - relevance: number between 0 and 1 indicating clinical significance
            - reasoning: string explaining clinical rationale for consultation

            Format your response as a JSON array like this:
            [
                {
                    "specialty": "Cardiologist",
                    "relevance": 0.9,
                    "reasoning": "Complex arrhythmia pattern requires electrophysiology expertise"
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
            You are a {specialty} consulting on the following case:

            Query from Clinician: {query}
            Patient Context: {context}
            Current Clinical Insights: {currentInsights}

            Provide a thorough clinical analysis and evidence-based recommendations.
            Consider interactions with existing conditions and current treatment protocols.
            
            Format your response as JSON:
            {
                "specialty": "your specialty",
                "analysis": "detailed clinical assessment",
                "recommendations": ["specific clinical action items"],
                "confidence": number (0-1) based on available evidence
            }
        `);

        // Initialize summary template
        this.summaryTemplate = PromptTemplate.fromTemplate(`
            As the lead consultant, synthesize the following specialist consultations into a comprehensive clinical assessment:

            Query from Clinician: {query}
            Specialist Consultations: {consultations}

            Provide an evidence-based synthesis that supports clinical decision-making.
            Format your response as JSON:
            {
                "primarySpecialist": "string (lead consultant)",
                "consultingSpecialists": ["specialist1", "specialist2"],
                "diagnosis": "string (clinical assessment)",
                "recommendations": ["specific clinical actions"],
                "followUpSuggestions": ["clinical monitoring points"],
                "patientNotes": "string (additional clinical considerations)"
            }
        `);
    }

    /**
     * Process a user query through the panel of AI doctors
     */
    async processQuery(query: string): Promise<string> {
        // Add user message to history
        await this.addMessage('user', query);

        // Get enriched context
        const context = await this.getEnrichedContext(query);
        
        try {
            // Fast track for basic demographic queries
            const basicDemographicPatterns = {
                age: /age|how old|years old/i,
                gender: /gender|sex/i,
                name: /name|called/i,
                dob: /date of birth|born|dob/i,
                height: /height|tall/i,
                weight: /weight|heavy|pounds|kilos/i,
                vitals: /vitals|blood pressure|temperature|pulse|bp|temp|heart rate/i,
                allergies: /allerg(y|ies)/i,
                medications: /medications|drugs|prescriptions|meds/i
            };

            // Check if query matches any basic pattern
            for (const [type, pattern] of Object.entries(basicDemographicPatterns)) {
                if (pattern.test(query)) {
                    const value = this.extractBasicInfo(type, context);
                    if (value) {
                        const response = `${value}`;
                        await this.addMessage('assistant', response);
                        return response;
                    }
                    break;
                }
            }

            // For other simple queries, use basic LLM response
            if (this.isSimpleQuery(query)) {
                const response = await this.llm.invoke(
                    await this.basicQueryTemplate.format({
                        query,
                        context: JSON.stringify(context)
                    })
                );
                await this.addMessage('assistant', response.content);
                return response.content;
            }

            // Complex query path - needs specialist consultation
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
            const response = this.formatConsultationResponse(finalResponse);
            await this.addMessage('assistant', response);
            return response;

        } catch (error) {
            console.error('Error processing query:', error);
            const errorMessage = 'I apologize, but I encountered an error while processing your query. Please try again.';
            await this.addMessage('assistant', errorMessage);
            throw error;
        }
    }

    private isSimpleQuery(query: string): boolean {
        // Patterns that indicate a complex query needing specialist consultation
        const complexPatterns = [
            /diagnosis/i,
            /treatment/i,
            /recommend/i,
            /should (we|i|the patient)/i,
            /consult/i,
            /specialist/i,
            /symptoms/i,
            /prognosis/i,
            /complications/i,
            /differential/i
        ];

        return !complexPatterns.some(pattern => pattern.test(query));
    }

    private formatConsultationResponse(consultation: ConsultationSummary): string {
        return `
Based on your query, I consulted with our panel of specialists including ${consultation.consultingSpecialists.join(', ')}, led by our ${consultation.primarySpecialist}.

${consultation.diagnosis}

Key Recommendations:
${consultation.recommendations.map(rec => `• ${rec}`).join('\n')}

Follow-up Actions:
${consultation.followUpSuggestions.map(sug => `• ${sug}`).join('\n')}

Additional Notes:
${consultation.patientNotes}`;
    }

    /**
     * Extract basic demographic information from context
     */
    private extractBasicInfo(type: string, context: any): string | null {
        try {
            switch (type) {
                case 'age':
                    const dob = context.patient?.birthDate;
                    if (dob) {
                        const age = Math.floor((new Date().getTime() - new Date(dob).getTime()) / 31557600000);
                        return `Patient age: ${age} years`;
                    }
                    break;
                case 'gender':
                    return context.patient?.gender ? `Patient gender: ${context.patient.gender}` : null;
                case 'name':
                    const name = context.patient?.name?.[0];
                    if (name) {
                        return `Patient name: ${name.given?.join(' ')} ${name.family}`;
                    }
                    break;
                case 'dob':
                    return context.patient?.birthDate ? `Date of birth: ${context.patient.birthDate}` : null;
                case 'height':
                    const height = context.vitals?.height;
                    return height ? `Height: ${height}` : null;
                case 'weight':
                    const weight = context.vitals?.weight;
                    return weight ? `Weight: ${weight}` : null;
                case 'vitals':
                    const vitals = context.vitals;
                    if (vitals) {
                        return `Current vitals:\n${Object.entries(vitals)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join('\n')}`;
                    }
                    break;
                case 'allergies':
                    const allergies = context.allergies;
                    if (allergies?.length) {
                        return `Allergies:\n${allergies.join('\n')}`;
                    }
                    return 'No known allergies';
                case 'medications':
                    const medications = context.medications;
                    if (medications?.length) {
                        return `Current medications:\n${medications.join('\n')}`;
                    }
                    return 'No current medications';
            }
        } catch (error) {
            console.error('Error extracting basic info:', error);
        }
        return null;
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
