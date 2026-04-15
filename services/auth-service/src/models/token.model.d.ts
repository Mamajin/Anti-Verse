export interface RefreshTokenRow {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    created_at: Date;
}
export declare const TokenModel: {
    create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
    findByHash(tokenHash: string): Promise<RefreshTokenRow | undefined>;
    delete(id: string): Promise<void>;
    deleteAllForUser(userId: string): Promise<void>;
    cleanupExpired(): Promise<number>;
};
//# sourceMappingURL=token.model.d.ts.map