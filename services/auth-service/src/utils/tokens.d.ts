import type { UserRole } from '@antiverse/types';
export interface TokenPayload {
    userId: string;
    role: UserRole;
}
export declare function generateAccessToken(payload: TokenPayload): string;
export declare function verifyAccessToken(token: string): TokenPayload;
/**
 * Generates a strong opaque refresh token.
 * Returns both the cleartext token (for the user) and the SHA-256 hash (for the DB).
 */
export declare function generateRefreshToken(): {
    token: string;
    hash: string;
};
export declare function hashToken(token: string): string;
/**
 * Calculates the expiration date based on the JWT_REFRESH_TTL string (e.g. '7d').
 */
export declare function getRefreshTokenExpiry(): Date;
//# sourceMappingURL=tokens.d.ts.map