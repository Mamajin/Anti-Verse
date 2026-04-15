"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenModel = void 0;
const db_1 = require("../db");
const database_1 = require("@antiverse/database");
exports.TokenModel = {
    async create(userId, tokenHash, expiresAt) {
        await (0, db_1.db)(database_1.Tables.AUTH_REFRESH_TOKENS).insert({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt,
        });
    },
    async findByHash(tokenHash) {
        return (0, db_1.db)(database_1.Tables.AUTH_REFRESH_TOKENS)
            .where({ token_hash: tokenHash })
            .first();
    },
    async delete(id) {
        await (0, db_1.db)(database_1.Tables.AUTH_REFRESH_TOKENS).where({ id }).delete();
    },
    async deleteAllForUser(userId) {
        await (0, db_1.db)(database_1.Tables.AUTH_REFRESH_TOKENS).where({ user_id: userId }).delete();
    },
    async cleanupExpired() {
        return (0, db_1.db)(database_1.Tables.AUTH_REFRESH_TOKENS)
            .where('expires_at', '<', new Date())
            .delete();
    }
};
//# sourceMappingURL=token.model.js.map