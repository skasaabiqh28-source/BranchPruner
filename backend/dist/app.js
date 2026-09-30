import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { webhookRouter } from './routes/webhook.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { csrfMiddleware } from './middlewares/csrf.middleware.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function createApp() {
    const app = express();
    // Security headers
    app.use(helmet({
        contentSecurityPolicy: false // Allow Swagger UI inline styles and scripts
    }));
    // Strict CORS configuration
    const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, or server-to-server)
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                callback(null, true);
            }
            else {
                callback(new Error(`Origin ${origin} not allowed by strict CORS allowlist`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Idempotency-Key',
            'x-hub-signature-256',
            'x-github-event',
            'x-csrf-token',
            'Accept'
        ]
    }));
    // Parse cookies
    app.use(cookieParser());
    // Capture raw body for webhook HMAC signature verification
    app.use(express.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        }
    }));
    app.use(express.urlencoded({ extended: true }));
    // CSRF protection for cookie-based state-mutating requests
    app.use(csrfMiddleware);
    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'BranchPruner Controller',
            version: '2.4.0-stable'
        });
    });
    // Serve OpenAPI Swagger Docs at /docs
    try {
        const openapiCandidates = [
            path.join(__dirname, 'docs', 'openapi.json'),
            path.join(__dirname, '..', 'src', 'docs', 'openapi.json'),
            path.resolve(process.cwd(), 'src', 'docs', 'openapi.json')
        ];
        const openapiPath = openapiCandidates.find((p) => fs.existsSync(p));
        if (openapiPath) {
            const openapiSpec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
            app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
        }
    }
    catch (err) {
        console.warn('Could not load openapi.json for /docs:', err);
    }
    // Public webhook route support at /webhooks/github as well as /api/webhooks/github
    app.use('/', webhookRouter);
    // Mount API router
    app.use('/api', apiRouter);
    // Centralized Error Handler
    app.use(errorHandler);
    return app;
}
