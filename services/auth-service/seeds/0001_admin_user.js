"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("@antiverse/database");
async function seed(knex) {
    const hash = await bcrypt_1.default.hash('admin123456', database_1.Constraints.BCRYPT_SALT_ROUNDS);
    await knex(database_1.Tables.AUTH_USERS)
        .insert({
        email: 'admin@antiverse.local',
        password_hash: hash,
        display_name: 'System Admin',
        role: 'admin',
    })
        .onConflict('email')
        .ignore();
    console.log('✅ Auth seed complete: admin@antiverse.local / admin123456');
}
//# sourceMappingURL=0001_admin_user.js.map