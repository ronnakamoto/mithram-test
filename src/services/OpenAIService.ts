// src/services/OpenAIService.ts
import OpenAI from 'openai';

export interface OpenAIServiceConfig {
    apiKey: string;
    baseURL?: string;
    organizationId?: string;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
}

export interface ClinicalContext {
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

export interface Specialist {
    specialty: string;
    code: string;
    justification: string;
    priority: 'routine' | 'urgent' | 'asap';
    confidence: number;
    timeframe: string;
    evidenceLevel: 'high' | 'moderate' | 'low';
    guidelines?: Array<{
        source: string;
        reference: string;
        relevance: string;
    }>;
}

export interface RecommendationResponse {
    specialists: Specialist[];
    reasoning: string;
    riskFactors: string[];
    confidenceMetrics: {
        overallConfidence: number;
        dataCompleteness: number;
        guidelineAdherence: number;
    };
}

export class OpenAIService {
    private client: OpenAI;
    private readonly maxRetries: number;
    private readonly retryDelay: number;
    private readonly defaultTimeout: number = 30000;

    constructor(config: OpenAIServiceConfig) {
        if (!this.isValidApiKey(config.apiKey)) {
            throw new Error('Invalid API key format');
        }

        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
            organization: config.organizationId,
            timeout: config.timeout || this.defaultTimeout,
            maxRetries: 0 // We handle retries ourselves
        });

        this.maxRetries = config.maxRetries || 3;
        this.retryDelay = config.retryDelay || 1000;
    }

    async generateRecommendations(clinicalContext: ClinicalContext): Promise<RecommendationResponse> {
        let attempt = 0;
        while (attempt < this.maxRetries) {
            try {
                const prompt = this.constructPrompt(clinicalContext);
                const completion = await this.client.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: this.getSystemPrompt()
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
                await this.sleep(this.retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
            }
        }
        throw new Error('Failed to generate recommendations after retries');
    }

    private getSystemPrompt(): string {
        return `You are an advanced clinical decision support system specializing in specialist referral recommendations.
Your task is to analyze patient data and provide evidence-based specialist referrals following these strict guidelines.
You must respond with a valid JSON object following the exact format shown in the example below.

1. Clinical Assessment Requirements:
   - Evaluate condition severity and urgency
   - Consider comorbidities and interactions
   - Assess risk factors and complications
   - Review medication impacts

2. Recommendation Format:
   - Use SNOMED CT codes for specialties
   - Provide clear clinical justification
   - Reference specific medical guidelines
   - Include confidence metrics

3. Priority Levels:
   - routine: Standard referral, seen within 4-12 weeks
   - urgent: Requires attention within 1-2 weeks
   - asap: Immediate attention needed (24-48 hours)

4. Evidence Levels:
   - high: Multiple RCTs or systematic reviews
   - moderate: Single RCT or multiple cohort studies
   - low: Expert opinion or case studies

Example JSON Response:
{
    "specialists": [{
        "specialty": "Cardiology",
        "code": "394579002",
        "justification": "Acute onset chest pain with elevated troponin",
        "priority": "asap",
        "confidence": 0.95,
        "timeframe": "24 hours",
        "evidenceLevel": "high",
        "guidelines": [{
            "source": "ACC/AHA",
            "reference": "2021 Chest Pain Guideline",
            "relevance": "Class I recommendation for acute coronary syndrome"
        }]
    }],
    "reasoning": "Patient presents with acute chest pain and elevated cardiac markers indicating possible ACS",
    "riskFactors": ["Age > 65", "Hypertension", "Diabetes"],
    "confidenceMetrics": {
        "overallConfidence": 0.95,
        "dataCompleteness": 0.9,
        "guidelineAdherence": 0.95
    }
}`;
    }

    private constructPrompt(context: ClinicalContext): string {
        const patientAge = context.patient.birthDate ? 
            this.calculateAge(context.patient.birthDate) : 'unknown';

        const activeConditions = this.processConditions(context.conditions);
        const relevantObservations = this.processObservations(context.observations);
        const currentMedications = this.processMedications(context.medications);

        return JSON.stringify({
            task: "specialist_recommendations",
            patient_context: {
                age: patientAge,
                gender: context.patient.gender,
                active_conditions: activeConditions,
                recent_observations: relevantObservations,
                current_medications: currentMedications
            },
            requirements: {
                specialty_codes: "SNOMED CT",
                priority_levels: ["routine", "urgent", "asap"],
                evidence_levels: ["high", "moderate", "low"],
                include: {
                    timeframes: true,
                    justification: true,
                    guidelines: true,
                    confidence_metrics: true
                }
            }
        });
    }

    private processConditions(conditions?: ClinicalContext['conditions']) {
        if (!conditions) return [];
        return conditions
            .filter(c => c.status === 'active')
            .map(c => ({
                condition: c.display,
                code: c.code,
                severity: c.severity,
                duration: c.onsetDate ? 
                    this.calculateDuration(c.onsetDate) : 'unknown'
            }));
    }

    private processObservations(observations?: ClinicalContext['observations']) {
        if (!observations) return [];
        return observations
            .sort((a, b) => 
                new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
            )
            .slice(0, 10)
            .map(o => ({
                test: o.display,
                code: o.code,
                value: o.value,
                unit: o.unit,
                interpretation: o.interpretation,
                date: o.date
            }));
    }

    private processMedications(medications?: ClinicalContext['medications']) {
        if (!medications) return [];
        return medications
            .filter(m => m.status === 'active')
            .map(m => ({
                medication: m.display,
                code: m.code,
                startDate: m.startDate
            }));
    }

    private validateResponse(response: any): RecommendationResponse {
        if (!response.specialists || !Array.isArray(response.specialists)) {
            throw new Error('Invalid response format: missing specialists array');
        }

        // Validate each specialist recommendation
        response.specialists = response.specialists.map((specialist: any) => {
            if (!this.isValidSpecialist(specialist)) {
                throw new Error('Invalid specialist format: missing required fields');
            }

            return {
                ...specialist,
                priority: this.validatePriority(specialist.priority),
                confidence: this.validateConfidence(specialist.confidence),
                evidenceLevel: this.validateEvidenceLevel(specialist.evidenceLevel)
            };
        });

        return {
            specialists: response.specialists,
            reasoning: response.reasoning || 'No additional reasoning provided',
            riskFactors: Array.isArray(response.riskFactors) ? response.riskFactors : [],
            confidenceMetrics: this.validateConfidenceMetrics(response.confidenceMetrics)
        };
    }

    private isValidSpecialist(specialist: any): boolean {
        return Boolean(
            specialist.specialty &&
            specialist.code &&
            specialist.justification &&
            specialist.priority &&
            specialist.timeframe
        );
    }

    private validatePriority(priority: string): 'routine' | 'urgent' | 'asap' {
        return ['routine', 'urgent', 'asap'].includes(priority) ? 
            priority as 'routine' | 'urgent' | 'asap' : 
            'routine';
    }

    private validateConfidence(confidence: number): number {
        return typeof confidence === 'number' && confidence >= 0 && confidence <= 1 ?
            confidence : 0.8;
    }

    private validateEvidenceLevel(level: string): 'high' | 'moderate' | 'low' {
        return ['high', 'moderate', 'low'].includes(level) ?
            level as 'high' | 'moderate' | 'low' :
            'moderate';
    }

    private validateConfidenceMetrics(metrics: any): RecommendationResponse['confidenceMetrics'] {
        return {
            overallConfidence: this.validateConfidence(metrics?.overallConfidence || 0.8),
            dataCompleteness: this.validateConfidence(metrics?.dataCompleteness || 0.8),
            guidelineAdherence: this.validateConfidence(metrics?.guidelineAdherence || 0.8)
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

    private isValidApiKey(apiKey: string): boolean {
        return typeof apiKey === 'string' && 
               (apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-')) && 
               apiKey.length >= 40;
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
        const diffInMonths = (now.getFullYear() - start.getFullYear()) * 12 + 
            (now.getMonth() - start.getMonth());
        
        if (diffInMonths < 1) {
            const diffInDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return `${diffInDays} days`;
        } else if (diffInMonths < 12) {
            return `${diffInMonths} months`;
        } else {
            const years = Math.floor(diffInMonths / 12);
            const remainingMonths = diffInMonths % 12;
            return remainingMonths > 0 ? 
                `${years} years, ${remainingMonths} months` : 
                `${years} years`;
        }
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default OpenAIService;