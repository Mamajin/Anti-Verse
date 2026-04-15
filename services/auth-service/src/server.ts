import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';

async function bootstrap() {
  try {
    const app = createApp();

    app.listen(config.PORT, () => {
      logger.info(`Auth Service listening on port ${config.PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully.');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received. Shutting down gracefully.');
      process.exit(0);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to bootstrap application component');
    process.exit(1);
  }
}

bootstrap();
