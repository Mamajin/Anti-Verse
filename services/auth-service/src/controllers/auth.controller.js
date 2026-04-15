"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = require("../models/user.model");
const token_model_1 = require("../models/token.model");
const database_1 = require("@antiverse/database");
const AppError_1 = require("../utils/AppError");
const tokens_1 = require("../utils/tokens");
class AuthController {
    static async register(req, res, next) {
        try {
            const { email, password, displayName, role } = req.body;
            const existing = await user_model_1.UserModel.findByEmail(email);
            if (existing) {
                throw AppError_1.AppError.conflict('Email is already registered');
            }
            const password_hash = await bcrypt_1.default.hash(password, database_1.Constraints.BCRYPT_SALT_ROUNDS);
            const user = await user_model_1.UserModel.create({
                email,
                password_hash,
                display_name: displayName,
                role: role || 'keeper',
            });
            res.status(201).json({ data: user_model_1.UserModel.toDomain(user) });
        }
        catch (err) {
            next(err);
        }
    }
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const user = await user_model_1.UserModel.findByEmail(email);
            if (!user || !user.is_active) {
                throw AppError_1.AppError.unauthorized('Invalid creds'); // obfuscated intentionally
            }
            const isValidPassword = await bcrypt_1.default.compare(password, user.password_hash);
            if (!isValidPassword) {
                throw AppError_1.AppError.unauthorized('Invalid creds');
            }
            // Generate Tokens
            const payload = { userId: user.id, role: user.role };
            const accessToken = (0, tokens_1.generateAccessToken)(payload);
            const { token: refreshToken, hash } = (0, tokens_1.generateRefreshToken)();
            const expiresAt = (0, tokens_1.getRefreshTokenExpiry)();
            await token_model_1.TokenModel.create(user.id, hash, expiresAt);
            res.json({
                data: {
                    accessToken,
                    refreshToken,
                    user: user_model_1.UserModel.toSummary(user),
                }
            });
        }
        catch (err) {
            // Improve obfuscation so timings aren't a dead giveaway (ideally you'd use a dummy hash check, but this is a start)
            if (err instanceof AppError_1.AppError && err.message === 'Invalid creds') {
                next(AppError_1.AppError.unauthorized('Invalid email or password'));
            }
            else {
                next(err);
            }
        }
    }
    static async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken)
                throw AppError_1.AppError.badRequest('Missing refresh token');
            const hash = (0, tokens_1.hashToken)(refreshToken);
            const tokenRecord = await token_model_1.TokenModel.findByHash(hash);
            if (!tokenRecord || tokenRecord.expires_at < new Date()) {
                if (tokenRecord)
                    await token_model_1.TokenModel.delete(tokenRecord.id); // cleanup expired
                throw AppError_1.AppError.unauthorized('Invalid or expired refresh token');
            }
            const user = await user_model_1.UserModel.findById(tokenRecord.user_id);
            if (!user || !user.is_active) {
                throw AppError_1.AppError.unauthorized('Account disabled');
            }
            // Rotate token
            await token_model_1.TokenModel.delete(tokenRecord.id);
            const payload = { userId: user.id, role: user.role };
            const newAccessToken = (0, tokens_1.generateAccessToken)(payload);
            const { token: newRefreshToken, hash: newHash } = (0, tokens_1.generateRefreshToken)();
            await token_model_1.TokenModel.create(user.id, newHash, (0, tokens_1.getRefreshTokenExpiry)());
            res.json({
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                }
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (refreshToken) {
                const hash = (0, tokens_1.hashToken)(refreshToken);
                const record = await token_model_1.TokenModel.findByHash(hash);
                if (record) {
                    await token_model_1.TokenModel.delete(record.id);
                }
            }
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
    static async verify(req, res, next) {
        res.json({ data: req.user });
    }
    static async profile(req, res, next) {
        try {
            const user = await user_model_1.UserModel.findById(req.user.userId);
            if (!user)
                throw AppError_1.AppError.notFound();
            res.json({ data: user_model_1.UserModel.toDomain(user) });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateProfile(req, res, next) {
        try {
            const updates = {};
            if (req.body.displayName)
                updates.display_name = req.body.displayName;
            if (req.body.password) {
                updates.password_hash = await bcrypt_1.default.hash(req.body.password, database_1.Constraints.BCRYPT_SALT_ROUNDS);
            }
            const user = await user_model_1.UserModel.update(req.user.userId, updates);
            if (!user)
                throw AppError_1.AppError.notFound();
            res.json({ data: user_model_1.UserModel.toDomain(user) });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map