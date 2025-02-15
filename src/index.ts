// src/index.ts
import express from 'express';
import cors from 'cors';
import cdsHooksService from './routes/cdsHooksService';
import chatService from './routes/chatService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3002; // Default to 3002 if PORT is not set

// Enable CORS with specific configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Enable credentials (cookies, authorization headers, etc)
}));

app.use(express.json());

// Routes
app.use('/', cdsHooksService);
app.use('/', chatService); // Add chat service routes


app.listen(port, () => {
    console.log(`CDS Hooks service listening on port ${port}`);
});