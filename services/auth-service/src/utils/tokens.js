"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.hashToken = hashToken;
exports.getRefreshTokenExpiry = getRefreshTokenExpiry;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, config_1.config.JWT_ACCESS_SECRET, {
        expiresIn: config_1.config.JWT_ACCESS_TTL,
    });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, config_1.config.JWT_ACCESS_SECRET);
}
/**
 * Generates a strong opaque refresh token.
 * Returns both the cleartext token (for the user) and the SHA-256 hash (for the DB).
 */
function generateRefreshToken() {
    const token = crypto_1.default.randomBytes(64).toString('hex');
    const hash = hashToken(token);
    return { token, hash };
}
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
/**
 * Calculates the expiration date based on the JWT_REFRESH_TTL string (e.g. '7d').
 */
function getRefreshTokenExpiry() {
    const ttl = config_1.config.JWT_REFRESH_TTL;
    const match = ttl.match(/^(\d+)([dhms])$/);
    if (!match)
        throw new Error(`Invalid JWT_REFRESH_TTL format: ${ttl}`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = {
        'd': 24 * 60 * 60 * 1000,
        'h': 60 * 60 * 1000,
        'm': 60 * 1000,
        's': 1000,
    };
    return new Date(Date.now() + value * multipliers[unit]);
}
//# sourceMappingURL=tokens.js.map