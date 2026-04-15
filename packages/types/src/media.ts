export enum MediaStatus { Pending = 'pending', Ready = 'ready', Failed = 'failed' }
export interface MediaFile { id: string; colonyId: string; userId: string; logEntryId: string | null; filename: string; contentType: string; sizeBytes: number; caption: string | null; url: string; status: MediaStatus; createdAt: string; }
export interface UploadRequest { colonyId: string; logEntryId?: string; filename: string; contentType: string; sizeBytes: number; caption?: string; }
export interface UploadResponse { id: string; uploadUrl: string; fileKey: string; }
export interface ConfirmUploadResponse { id: string; status: MediaStatus; url: string; filename: string; contentType: string; sizeBytes: number; caption: string | null; createdAt: string; }
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES] as const;
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];
export const MIME_TO_EXT: Record<AllowedMediaType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' };
