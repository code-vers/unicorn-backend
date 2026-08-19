import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';

import config from './app/config';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import router from './app/routes';
import sendResponse from './app/utils/sendResponse';
import { generateSwaggerDocs } from './app/utils/swagger';
import prisma from './app/utils/prisma';

const app: Application = express();
app.set('trust proxy', config.trustProxy);

// CORS fix: wildcard '*' + credentials:true is blocked by browsers.
// When CORS_ORIGIN=*, we allow all origins without credentials.
// When specific origins are listed, credentials (cookies/auth headers) are enabled.
const corsOptions: CorsOptions =
  config.corsOrigin === '*'
    ? { origin: '*', credentials: false }
    : {
        origin: config.corsOrigin.split(',').map((origin) => origin.trim()),
        credentials: true
      };

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(cookieParser());

// IMPORTANT: Stripe webhook needs raw body for signature verification.
// This MUST be registered before express.json() parses the body.
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads/documents', (_req, res) => {
  res.status(404).json({ success: false, message: 'File not found.' });
});

// Public media only. Identity documents are served through an authenticated route.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Setup Swagger Docs
const swaggerDocs = generateSwaggerDocs();
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.get('/health', (_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Server is healthy.',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, message: 'Server is ready.' });
  } catch {
    res.status(503).json({ success: false, message: 'Database is unavailable.' });
  }
});

app.use('/api/v1', router);
app.use(notFound);
app.use(globalErrorHandler);

export default app;
