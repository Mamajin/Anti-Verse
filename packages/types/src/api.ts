export interface ApiResponse<T> { data: T; }
export interface Pagination { page: number; limit: number; totalItems: number; totalPages: number; }
export interface PaginatedResponse<T> { data: T[]; pagination: Pagination; }
export interface FieldError { field: string; message: string; }
export interface ApiErrorBody { status: number; code: string; message: string; requestId?: string; details?: FieldError[]; }
export interface ApiErrorResponse { error: ApiErrorBody; }
export enum ErrorCode {
  ValidationError = 'VALIDATION_ERROR',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  GatewayTimeout = 'GATEWAY_TIMEOUT',
  InternalError = 'INTERNAL_ERROR',
}
export interface PaginationParams { page?: number; limit?: number; }
export interface HealthCheckResponse { status: 'healthy' | 'unhealthy'; service: string; version: string; uptime: number; timestamp: string; checks: Record<string, { status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }>; }
