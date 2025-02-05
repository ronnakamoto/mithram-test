// src/index.ts
import express from 'express';
import cors from 'cors';
import cdsHooksService from './routes/cdsHooksService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3002; // Default to 3002 if PORT is not set

// Enable CORS for all routes
// app.use(cors());

app.use(express.json());
app.use('/', cdsHooksService);


app.listen(port, () => {
    console.log(`CDS Hooks service listening on port ${port}`);
});