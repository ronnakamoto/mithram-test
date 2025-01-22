// src/index.ts
import express from 'express';
import cors from 'cors';
import cdsHooksService from './routes/cdsHooksService';

const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(express.json());
app.use('/', cdsHooksService);

app.listen(3002, () => {
    console.log('CDS Hooks service listening on port 3002');
});