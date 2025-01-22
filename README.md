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

   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=

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
