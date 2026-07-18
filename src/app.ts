import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express, { type Application, type Request, type Response } from 'express';
// import rateLimit from 'express-rate-limit'; // unused during development
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import config from './app/config';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import router from './app/routes';
import sendResponse from './app/utils/sendResponse';
import { generateSwaggerDocs } from './app/utils/swagger';

const app: Application = express();

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

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (like uploaded images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Setup Swagger Docs
const swaggerDocs = generateSwaggerDocs();
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Rate limiting — disabled during development. Uncomment before going to production.
// app.use(
//   '/api',
//   rateLimit({
//     windowMs: config.rateLimit.windowMs,
//     limit: config.rateLimit.max,
//     standardHeaders: 'draft-8',
//     legacyHeaders: false,
//     message: {
//       success: false,
//       message: 'Too many requests. Please try again later.'
//     }
//   })
// );

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

app.use('/api/v1', router);
app.use(notFound);
app.use(globalErrorHandler);

export default app;
