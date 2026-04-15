import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';

export function createApp() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  // Routes
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'auth-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/auth', authRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
}
