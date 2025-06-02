import express, { Request, Response, NextFunction } from 'express';
import Logger from './core/Logger';
import cors from 'cors';
import { corsUrl, environment } from './config';
import './database'; // initialize database
import './cache'; // initialize cache
import {
  NotFoundError,
  ApiError,
  InternalError,
  ErrorType,
} from './core/ApiError';
import routes from './routes';

process.on('uncaughtException', (e) => {
  Logger.error(e);
});

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(
  express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }),
);

// Add this middleware before your routes to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Updated CORS configuration to handle Next.js properly
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // In development, be more permissive with localhost
    if (environment === 'development') {
      const developmentOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        corsUrl,
      ].filter(Boolean);

      const isAllowed = developmentOrigins.some(
        (allowedOrigin) =>
          origin === allowedOrigin ||
          origin.startsWith(allowedOrigin as string),
      );

      if (isAllowed) {
        return callback(null, true);
      }
    } else {
      // In production, strictly use the configured CORS URL
      if (origin === corsUrl) {
        return callback(null, true);
      }
    }

    Logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Important for sending cookies and auth headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'x-api-key',
  ],
};

app.use(cors(corsOptions));

// Add request logging for debugging
if (environment === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    Logger.info(
      `${req.method} ${req.originalUrl} - Origin: ${
        req.get('Origin') || 'none'
      }`,
    );
    next();
  });
}

// Health check endpoint (useful for testing connection)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment,
    message: 'Khronos API is running',
  });
});

// API Routes with /api/v1 prefix to match your frontend configuration
app.use('/api/v1', routes);

// Also support routes without prefix for backward compatibility (optional)
app.use('/', routes);

// catch 404 and forward to error handler
app.use((req, res, next) => next(new NotFoundError()));

// Middleware Error Handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApiError) {
    ApiError.handle(err, res);
    if (err.type === ErrorType.INTERNAL)
      Logger.error(
        `500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
      );
  } else {
    Logger.error(
      `500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
    );
    Logger.error(err);
    if (environment === 'development') {
      return res.status(500).json({
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
      });
    }
    ApiError.handle(new InternalError(), res);
  }
});

export default app;
