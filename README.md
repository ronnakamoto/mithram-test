# Mithram - AI-Powered Medical Analysis Platform

Mithram is an advanced medical analysis Clinical Decision Support (CDS) Hooks service that leverages artificial intelligence to provide comprehensive, multi-perspective analysis of patient medical data. The service implements the novel GENESIS (Generative Enrichment via NFT and Synthesis) protocol for enhanced medical insights.

GENESIS (Generative Enrichment via NFT and Synthesis) is an innovative protocol that combines advanced AI techniques with blockchain technology to provide comprehensive medical analysis. It utilizes multi-perspective AI analysis, dynamic prompt generation, and NFT-based metadata integration to create a robust, secure, and enriched patient data analysis system.

## Features

- **GENESIS Protocol Implementation**
  - Multi-perspective AI analysis
  - Dynamic prompt generation
  - Parallel analysis processing
  - Result synthesis and enrichment
  - NFT-based metadata integration

- **Clinical Decision Support (CDS) Hooks**
  - SMART on FHIR authentication
  - Token-based session management
  - Secure API endpoints
  - Protected patient data handling

- **Modern UI/UX**
  - Responsive design
  - Intuitive navigation
  - Real-time loading states
  - Heroicons integration
  - Tailwind CSS styling

## Technical Stack

### Backend
- TypeScript
- Express.js
- LangChain
- FHIR Kit Client

### Frontend
- React
- Wouter (Routing)
- Tailwind CSS
- Heroicons

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ronnakamoto/mithram.git
cd mithram
```

2. Install dependencies:
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend/smart-app
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Running the Application

1. Start the backend server:
```bash
npm run dev
```

2. Start the frontend application:
```bash
cd frontend/smart-app
npm start
```

## API Endpoints

### Analysis Endpoints
- `POST /analysis/:analysisId/deep-analysis`: Generate deep analysis using GENESIS protocol
- `GET /analysis/:analysisId`: Retrieve analysis details
- `GET /analysis/:analysisId/history`: Get analysis history

### CDS Hooks Service
- `POST /cds-services`: Main CDS Hooks discovery point
- `POST /cds-services/:id`: Primary CDS hook endpoint

## Security

- SMART on FHIR authentication
- Token-based session management
- Secure API endpoints
- Protected patient data handling

## Research Foundation

The GENESIS protocol implementation is based on the GenRead+ idea discussed in the research paper (https://arxiv.org/abs/2209.10063) and extends traditional medical analysis techniques with advanced AI capabilities along with blockchain technologies.

## License

This project is licensed under the MIT License
