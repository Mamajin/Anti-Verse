import { create } from 'zustand';
import axios from 'axios';
import { mediaApiClient } from '../utils/api';
import type { MediaFile } from '@antiverse/types';

interface MediaState {
  files: MediaFile[];
  uploads: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  fetchMedia: (colonyId: string) => Promise<void>;
  uploadFile: (colonyId: string, file: File) => Promise<void>;
  deleteMedia: (colonyId: string, mediaId: string) => Promise<void>;
}

export const useMediaStore = create<MediaState>()((set, get) => ({
  files: [],
  uploads: {},
  isLoading: false,
  error: null,

  fetchMedia: async (colonyId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mediaApiClient.get(`/?colonyId=${colonyId}`);
      set({ files: res.data.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      console.error('Failed to fetch vault contents:', error);
    }
  },

  uploadFile: async (colonyId, file) => {
    const tempId = Math.random().toString(36).substr(2, 9);
    set(state => ({ uploads: { ...state.uploads, [tempId]: 0 } }));
    
    try {
      // 1. Get presigned URL
      const reqRes = await mediaApiClient.post('/upload', {
        colonyId,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size
      });
      const { uploadUrl, mediaId } = reqRes.data.data;

      // 2. Upload directly to S3
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
          set(state => ({ uploads: { ...state.uploads, [tempId]: percentCompleted } }));
        }
      });

      // 3. Confirm completion
      await mediaApiClient.post(`/${mediaId}/confirm?colonyId=${colonyId}`);

      // Refresh gallery
      await get().fetchMedia(colonyId);
    } catch (error: any) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      // Clean up progress
      set(state => {
        const newUploads = { ...state.uploads };
        delete newUploads[tempId];
        return { uploads: newUploads };
      });
    }
  },
  
  deleteMedia: async (colonyId, mediaId) => {
     try {
         await mediaApiClient.delete(`/${mediaId}?colonyId=${colonyId}`);
         await get().fetchMedia(colonyId);
     } catch (err) {
         console.error('Deletion failed: ', err);
     }
  }
}));
