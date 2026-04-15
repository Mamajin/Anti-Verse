"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("./logger");
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
function createApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({ origin: config_1.config.CORS_ORIGIN }));
    app.use(express_1.default.json());
    app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
    // Routes
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'auth-service',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });
    app.use('/api/auth', auth_routes_1.default);
    // Error handling
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map