import type { User, UserSummary } from '@antiverse/types';
export interface UserRow {
    id: string;
    email: string;
    password_hash: string;
    display_name: string;
    role: 'keeper' | 'researcher' | 'admin';
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export declare const UserModel: {
    findByEmail(email: string): Promise<UserRow | undefined>;
    findById(id: string): Promise<UserRow | undefined>;
    create(data: Partial<UserRow>): Promise<UserRow>;
    update(id: string, data: Partial<UserRow>): Promise<UserRow | undefined>;
    toDomain(row: UserRow): User;
    toSummary(row: UserRow): UserSummary;
};
//# sourceMappingURL=user.model.d.ts.map