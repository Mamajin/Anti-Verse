export enum UserRole { Keeper = 'keeper', Researcher = 'researcher', Admin = 'admin' }
export interface User { id: string; email: string; displayName: string; role: UserRole; isActive: boolean; createdAt: string; updatedAt: string; }
export interface UserSummary { id: string; email: string; displayName: string; role: UserRole; }
export interface AuthTokens { accessToken: string; refreshToken: string; }
export interface LoginResponse extends AuthTokens { user: UserSummary; }
export interface RefreshResponse extends AuthTokens {}
export interface VerifyTokenResult { userId: string; role: UserRole; }
export interface RegisterRequest { email: string; password: string; displayName: string; role?: 'keeper' | 'researcher'; }
export interface LoginRequest { email: string; password: string; }
export interface UpdateProfileRequest { displayName?: string; password?: string; }
