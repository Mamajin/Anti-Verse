"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./src/config");
const knexConfig = {
    development: {
        client: 'postgresql',
        connection: {
            host: config_1.config.DATABASE_HOST,
            port: config_1.config.DATABASE_PORT,
            database: config_1.config.DATABASE_NAME,
            user: config_1.config.DATABASE_USER,
            password: config_1.config.DATABASE_PASSWORD,
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'auth_service_migrations',
            directory: './migrations',
            extension: 'ts',
        },
        seeds: {
            directory: './seeds',
            extension: 'ts',
        },
    },
    production: {
        client: 'postgresql',
        connection: {
            host: config_1.config.DATABASE_HOST,
            port: config_1.config.DATABASE_PORT,
            database: config_1.config.DATABASE_NAME,
            user: config_1.config.DATABASE_USER,
            password: config_1.config.DATABASE_PASSWORD,
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: 'auth_service_migrations',
            directory: './migrations',
            extension: 'ts',
        },
        seeds: {
            directory: './seeds',
            extension: 'ts',
        },
    },
};
exports.default = knexConfig;
//# sourceMappingURL=knexfile.js.map