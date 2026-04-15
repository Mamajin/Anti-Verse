"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const logger_1 = require("./logger");
async function bootstrap() {
    try {
        const app = (0, app_1.createApp)();
        app.listen(config_1.config.PORT, () => {
            logger_1.logger.info(`Auth Service listening on port ${config_1.config.PORT}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM received. Shutting down gracefully.');
            process.exit(0);
        });
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT received. Shutting down gracefully.');
            process.exit(0);
        });
    }
    catch (err) {
        logger_1.logger.fatal({ err }, 'Failed to bootstrap application component');
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=server.js.map