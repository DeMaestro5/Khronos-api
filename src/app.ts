import express, { Request, Response, NextFunction } from 'express';
import Logger from './core/Logger';
import cors from 'cors';
import { corsUrl, environment } from './config';
import './database'; // initialize database
import './cache'; // initialize cache
import passport from './config/passport';

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

// Initialize Passport middleware
app.use(passport.initialize());

// Add this middleware before your routes to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Updated CORS configuration to handle Next.js properly
// Updated CORS configuration to handle Vercel domains properly
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Define allowed origins
    const allowedOrigins = [
      'https://khronos-client.vercel.app', // Your main Vercel domain
      corsUrl, // Your configured CORS URL from config
      'http://localhost:3000', // Development
      'http://127.0.0.1:3000', // Development alternative
    ].filter(Boolean); // Remove any undefined values

    // Check for exact matches first
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check for Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      // You can add additional validation here if needed
      // For example, check if it starts with your project name
      if (origin.includes('khronos')) {
        // Replace 'khronos' with your project name
        return callback(null, true);
      }
    }

    // In development, be more permissive
    if (environment === 'development') {
      // Allow any localhost with different ports
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
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
