import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import logRoutes from './routes/log.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'log-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/logs', logRoutes);

  app.use(errorHandler);

  return app;
}
