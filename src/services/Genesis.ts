import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

interface AnalysisHistory {
  analysisId: string;
  timestamp: string;
  metadata: Record<string, any>;
}

interface DynamicPrompt {
  perspective: string;
  instruction: string;
}

interface SynthesizedAnalysis {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
}

export class GenesisService {
  private llm: ChatOpenAI;
  private promptGeneratorTemplate: PromptTemplate;
  private analysisTemplate: PromptTemplate;
  private synthesisTemplate: PromptTemplate;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      openAIApiKey: apiKey,
    });

    // Template for generating dynamic prompts
    this.promptGeneratorTemplate = PromptTemplate.fromTemplate(`
      Given the following patient analysis history, generate an array of diverse prompt instructions.
      Each prompt should focus on a different perspective of patient care.
      Format the output as a JSON array of objects with 'perspective' and 'instruction' fields.
      
      Patient History:
      {history}
      
      Generate 4 different perspectives for analysis.
    `);

    // Template for individual analysis
    this.analysisTemplate = PromptTemplate.fromTemplate(`
      Analyze the following patient history from this perspective: {perspective}
      
      Patient History:
      {history}
      
      Specific Instructions: {instruction}
      
      Provide a detailed analysis focusing on this perspective.
    `);

    // Template for final synthesis
    this.synthesisTemplate = PromptTemplate.fromTemplate(`
      Synthesize the following analyses into a comprehensive summary:
      
      {analyses}
      
      Provide a concise summary with key insights, recommendations, and risk factors.
      Format the output as JSON with 'summary', 'recommendations', and 'riskFactors' fields.
    `);
  }

  async generateDynamicPrompts(history: string): Promise<DynamicPrompt[]> {
    const promptChain = RunnableSequence.from([
      this.promptGeneratorTemplate,
      this.llm,
      new JsonOutputParser<DynamicPrompt[]>(),
    ]);

    return await promptChain.invoke({ history });
  }

  async analyzeFromPerspective(
    history: string,
    perspective: string,
    instruction: string
  ): Promise<string> {
    const analysisChain = RunnableSequence.from([
      this.analysisTemplate,
      this.llm,
    ]);

    const response = await analysisChain.invoke({
      history,
      perspective,
      instruction,
    });

    // Handle both string and MessageContent[] types
    if (typeof response.content === 'string') {
      return response.content;
    } else if (Array.isArray(response.content)) {
      // Join all message content parts into a single string
      return response.content.map(part => 
        typeof part === 'string' ? part : JSON.stringify(part)
      ).join(' ');
    }
    return '';
  }

  async synthesizeAnalyses(analyses: string[]): Promise<SynthesizedAnalysis> {
    const synthesisChain = RunnableSequence.from([
      this.synthesisTemplate,
      this.llm,
      new JsonOutputParser<SynthesizedAnalysis>(),
    ]);

    return await synthesisChain.invoke({
      analyses: analyses.join('\n\n'),
    });
  }

  async processAnalysisHistory(histories: AnalysisHistory[]): Promise<SynthesizedAnalysis> {
    // Get the top 2 most recent analyses
    const recentHistories = histories
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 2);

    // Prepare history context
    const historyContext = recentHistories
      .map(h => `Analysis ID: ${h.analysisId}\nTimestamp: ${h.timestamp}\nMetadata: ${JSON.stringify(h.metadata)}`)
      .join('\n\n');

    // Generate dynamic prompts
    const dynamicPrompts = await this.generateDynamicPrompts(historyContext);

    // Run analyses in parallel
    const analysisPromises = dynamicPrompts.map(prompt =>
      this.analyzeFromPerspective(
        historyContext,
        prompt.perspective,
        prompt.instruction
      )
    );

    const analyses = await Promise.all(analysisPromises);

    // Synthesize all analyses
    return await this.synthesizeAnalyses(analyses);
  }
}
