# CDS Hooks Service

A Clinical Decision Support (CDS) Hooks service implementation using FHIR, built with TypeScript and Express.js.

## Features

- CDS Hooks service implementation
- FHIR integration using FHIR Kit Client
- OpenAI integration for intelligent analysis
- Message queue system for asynchronous processing
- TypeScript for type safety
- Express.js for REST API
- CORS enabled
- Rate limiting
- Security with Helmet.js

## Project Structure

```
test-mithram/
├── src/
│   ├── config/
│   │   └── index.ts         # Configuration settings
│   ├── routes/
│   │   └── cdsHooksService.ts # CDS Hooks endpoints
│   ├── services/
│   │   ├── AnalysisQueue.ts   # Queue management
│   │   ├── FHIRClient.ts      # FHIR service
│   │   └── OpenAIService.ts   # OpenAI integration
│   ├── types/
│   │   └── cds-hooks.ts       # Type definitions
│   ├── utils/
│   │   └── FHIRClient.ts      # FHIR utilities
│   └── index.ts               # Application entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- RabbitMQ server
- OpenAI API key
- FHIR server endpoint

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   AMQP_URL=amqp://localhost:5672
   AMQP_QUEUE=analysis-queue

   FHIR_SERVER_URL=http://fhir-server/fhir
   FHIR_AUTH_TOKEN=

   OPENAI_API_KEY=your-api-key-here
   OPENAI_MODEL=gpt-4
   OPENAI_TEMPERATURE=0.7
   OPENAI_MAX_TOKENS=2000

   SYSTEM_ID=ai-expert-panel-system
   ```
4. Start the development server:

## Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with hot-reload
- `npm run build`: Build the TypeScript code
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

## API Endpoints

### CDS Services Discovery
```

GET /cds-services

```
Returns available CDS services metadata.

### Patient View Hook
```

POST /cds-services/patient-view

````
Processes patient view events and returns relevant cards.

## CDS Hooks Service Flow

### 1. Service Discovery (`GET /cds-services`)
The discovery endpoint returns metadata about available services:
```json
{
  "services": [{
    "hook": "patient-view",
    "title": "AI Expert Panel Analysis",
    "description": "Provides AI-powered specialist panel recommendations",
    "id": "ai-expert-panel",
    "prefetch": {
      "patient": "Patient/{{context.patientId}}",
      "conditions": "Condition?patient={{context.patientId}}",
      "medications": "MedicationStatement?patient={{context.patientId}}",
      "observations": "Observation?patient={{context.patientId}}",
      "encounters": "Encounter?patient={{context.patientId}}"
    }
  }]
}
```

### 2. Service Invocation (`POST /cds-services/:id`)

#### Request Flow:
1. **Request Validation**
   - Validates incoming hook request structure
   - Checks for required context parameters
   - Verifies patient data availability

2. **Data Processing**
   - Extracts patient data from prefetch or FHIR server
   - Validates data completeness and format
   - Prepares clinical context for analysis

3. **Analysis Queue**
   - Creates an analysis task with unique ID
   - Queues task for asynchronous processing
   - Mints NFT for the analysis task
   - Updates task status in FHIR server

4. **Response Generation**
   - Returns CDS Hooks cards with:
     - Task ID and status
     - Initial recommendations (if available)
     - Links to detailed results
     - Error information (if any)

#### Response Format:
```json
{
  "cards": [{
    "summary": "AI Analysis In Progress",
    "indicator": "info",
    "detail": "Analysis task created. ID: {taskId}",
    "source": {
      "label": "AI Expert Panel",
      "url": "https://example.com"
    },
    "links": [{
      "label": "View Analysis Status",
      "url": "/task/{taskId}/status"
    }]
  }]
}
```

### 3. Task Status (`GET /task/:taskId/status`)
Retrieves the current status and results of an analysis task using NFT metadata:

#### Response Format:
```json
{
  "cards": [
    {
      "summary": "Analysis completed",
      "indicator": "success",
      "detail": "Analysis completed at 2025-01-30T08:15:03Z. High confidence recommendations based on comprehensive patient data.",
      "source": {
        "label": "AI Expert Panel",
        "url": "https://example.com"
      },
      "suggestions": [
        {
          "label": "Document Risk Factors",
          "uuid": "550e8400-e29b-41d4-a716-446655440000",
          "actions": [{
            "type": "create",
            "description": "Document identified risk factors",
            "resource": {
              "resourceType": "RiskAssessment",
              "status": "final",
              "prediction": [
                { "outcome": { "text": "High cardiovascular risk" } }
              ]
            }
          }]
        }
      ]
    },
    {
      "summary": "Specialist Recommendations",
      "indicator": "info",
      "detail": "Cardiology (urgent)\nJustification: Acute onset chest pain with elevated troponin\nTimeframe: 24 hours\nConfidence: 95.0%",
      "suggestions": [
        {
          "label": "Refer to Cardiology",
          "uuid": "550e8400-e29b-41d4-a716-446655440001",
          "actions": [{
            "type": "create",
            "description": "Create cardiology referral",
            "resource": {
              "resourceType": "ServiceRequest",
              "status": "draft",
              "intent": "plan",
              "priority": "urgent",
              "code": {
                "coding": [{
                  "system": "http://snomed.info/sct",
                  "code": "394579002",
                  "display": "Cardiology"
                }]
              }
            }
          }]
        }
      ]
    }
  ]
}
```

#### Status Indicators:
- `success`: Analysis completed successfully
- `info`: Analysis in progress
- `warning`: Analysis status unknown or incomplete
- `critical`: Analysis failed

#### Features:
- **NFT Integration**: Uses NFT metadata for immutable status tracking
- **Rich Response Format**: Includes detailed analysis results and recommendations
- **FHIR Resources**: Generates FHIR-compliant resource suggestions
- **Actionable Suggestions**: Provides ready-to-use clinical actions
- **Evidence-Based**: Includes confidence scores and clinical reasoning

#### Error Responses:
- `404`: Task not found
- `500`: Server error retrieving status

### 4. Error Handling
- Validation errors return 400 status with descriptive cards
- Processing errors return 500 status with error details
- Missing data returns 422 status with data requirements
- All errors include actionable information in card format

### 5. Security
- All endpoints require valid authentication
- Rate limiting prevents abuse
- CORS protection for allowed origins
- Sensitive data handled securely

## Development

The project uses TypeScript for type safety and better developer experience. Key components include:

- **CDS Hooks Service**: Implements the CDS Hooks specification
- **FHIR Client**: Handles FHIR server communication
- **Analysis Queue**: Manages asynchronous processing of requests
- **OpenAI Service**: Integrates with OpenAI for intelligent analysis

## Testing

Tests are written using Jest. Run the test suite with:

```bash
npm test
````

## Security

The service implements several security measures:

- CORS protection
- Rate limiting
- Helmet.js for HTTP headers
- Environment variables for sensitive data

## License

ISC

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
