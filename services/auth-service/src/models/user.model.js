"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const db_1 = require("../db");
const database_1 = require("@antiverse/database");
exports.UserModel = {
    async findByEmail(email) {
        return (0, db_1.db)(database_1.Tables.AUTH_USERS)
            .where({ email: email.toLowerCase() })
            .first();
    },
    async findById(id) {
        return (0, db_1.db)(database_1.Tables.AUTH_USERS).where({ id }).first();
    },
    async create(data) {
        const [user] = await (0, db_1.db)(database_1.Tables.AUTH_USERS)
            .insert(data)
            .returning('*');
        return user;
    },
    async update(id, data) {
        const [user] = await (0, db_1.db)(database_1.Tables.AUTH_USERS)
            .where({ id })
            .update({ ...data, updated_at: new Date() })
            .returning('*');
        return user;
    },
    toDomain(row) {
        return {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            role: row.role,
            isActive: row.is_active,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
        };
    },
    toSummary(row) {
        return {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            role: row.role,
        };
    }
};
//# sourceMappingURL=user.model.js.map