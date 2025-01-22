// src/services/OpenAIService.ts
import OpenAI from 'openai';

interface ClinicalContext {
    patient: {
        id: string;
        birthDate?: string;
        gender?: string;
    };
    conditions?: Array<{
        code?: string;
        display?: string;
        status?: string;
        severity?: string;
        onsetDate?: string;
    }>;
    observations?: Array<{
        code?: string;
        display?: string;
        value?: number;
        unit?: string;
        date?: string;
        interpretation?: string;
    }>;
    medications?: Array<{
        code?: string;
        display?: string;
        status?: string;
        startDate?: string;
    }>;
}

interface Specialist {
    specialty: string;
    code: string;
    justification: string;
    priority: 'routine' | 'urgent' | 'asap';
    confidence: number;
    timeframe: string;
}

interface RecommendationResponse {
    specialists: Specialist[];
    reasoning: string;
    riskFactors: string[];
}

export class OpenAIService {
    private client: OpenAI;
    private maxRetries: number = 3;
    private retryDelay: number = 1000;

    constructor(apiKey: string) {
        this.client = new OpenAI({
            apiKey: apiKey
        });
    }

    async generateRecommendations(clinicalContext: ClinicalContext): Promise<RecommendationResponse> {
        let attempt = 0;
        while (attempt < this.maxRetries) {
            try {
                const prompt = this.constructPrompt(clinicalContext);
                const completion = await this.client.chat.completions.create({
                    model: "gpt-4-turbo-preview",
                    messages: [
                        {
                            role: "system",
                            content: `You are a clinical decision support system that specializes in 
                                    determining appropriate specialist referrals based on patient data. 
                                    Your recommendations must:
                                    1. Be evidence-based and clinically appropriate
                                    2. Consider condition severity and urgency
                                    3. Account for comorbidities
                                    4. Include clear clinical justification
                                    5. Specify appropriate timeframes
                                    6. Use standard specialty codes
                                    Prioritize patient safety and clinical necessity in your recommendations.`
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 1000,
                    response_format: { type: "json_object" }
                });

                const content = completion.choices[0].message.content;
                if (!content) {
                    throw new Error('OpenAI returned empty content');
                }
                
                const response = JSON.parse(content);
                return this.validateResponse(response);

            } catch (error) {
                attempt++;
                if (attempt === this.maxRetries) {
                    throw this.handleError(error);
                }
                await this.sleep(this.retryDelay * attempt);
            }
        }
        throw new Error('Failed to generate recommendations after retries');
    }

    private constructPrompt(context: ClinicalContext): string {
        const patientAge = context.patient.birthDate ? 
            this.calculateAge(context.patient.birthDate) : 'unknown';

        return JSON.stringify({
            task: "specialist_recommendations",
            patient_context: {
                age: patientAge,
                gender: context.patient.gender,
                active_conditions: context.conditions?.filter(c => c.status === 'active').map(c => ({
                    condition: c.display,
                    severity: c.severity,
                    duration: c.onsetDate ? 
                        this.calculateDuration(c.onsetDate) : 'unknown'
                })),
                recent_observations: context.observations?.sort((a, b) => 
                    new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
                ).slice(0, 10).map(o => ({
                    test: o.display,
                    value: o.value,
                    unit: o.unit,
                    interpretation: o.interpretation
                })),
                current_medications: context.medications?.filter(m => 
                    m.status === 'active'
                ).map(m => m.display)
            },
            requirements: {
                specialty_codes: "Use SNOMED CT codes for specialties",
                priority_levels: ["routine", "urgent", "asap"],
                include_timeframes: true,
                include_justification: true
            }
        });
    }

    private validateResponse(response: any): RecommendationResponse {
        if (!response.specialists || !Array.isArray(response.specialists)) {
            throw new Error('Invalid response format: missing specialists array');
        }

        // Validate each specialist recommendation
        response.specialists = response.specialists.map((specialist: any) => {
            if (!specialist.specialty || !specialist.code || !specialist.justification) {
                throw new Error('Invalid specialist format: missing required fields');
            }

            if (!['routine', 'urgent', 'asap'].includes(specialist.priority)) {
                specialist.priority = 'routine';
            }

            if (typeof specialist.confidence !== 'number' || 
                specialist.confidence < 0 || 
                specialist.confidence > 1) {
                specialist.confidence = 0.8;
            }

            return specialist;
        });

        return {
            specialists: response.specialists,
            reasoning: response.reasoning || 'No additional reasoning provided',
            riskFactors: Array.isArray(response.riskFactors) ? 
                response.riskFactors : []
        };
    }

    private handleError(error: any): Error {
        if (error instanceof OpenAI.APIError) {
            switch (error.status) {
                case 429:
                    return new Error('Rate limit exceeded. Please try again later.');
                case 400:
                    return new Error('Invalid request format: ' + error.message);
                case 401:
                    return new Error('Authentication error. Check API key configuration.');
                case 500:
                    return new Error('OpenAI service error. Please try again later.');
                default:
                    return new Error(`OpenAI API error: ${error.message}`);
            }
        }
        return error;
    }

    private calculateAge(birthDate: string): number {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    private calculateDuration(startDate: string): string {
        const start = new Date(startDate);
        const now = new Date();
        const diffYears = now.getFullYear() - start.getFullYear();
        const diffMonths = now.getMonth() - start.getMonth();
        
        if (diffYears > 0) {
            return `${diffYears} year${diffYears > 1 ? 's' : ''}`;
        } else if (diffMonths > 0) {
            return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
        } else {
            const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default OpenAIService;