import axios from 'axios';

// The Vite frontend connects directly to individual service ports via environment config,
// or ideally an API gateway. For Anti-Verse we'll export individual clients.

export const authApiClient = axios.create({
  baseURL: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3001/api/auth',
});

export const colonyApiClient = axios.create({
  baseURL: import.meta.env.VITE_COLONY_SERVICE_URL || 'http://localhost:3002/api/colonies',
});

export const logApiClient = axios.create({
  baseURL: import.meta.env.VITE_LOG_SERVICE_URL || 'http://localhost:3003/api/logs',
});

export const mediaApiClient = axios.create({
  baseURL: import.meta.env.VITE_MEDIA_SERVICE_URL || 'http://localhost:3004/api/media',
});

// Request interceptor to eagerly attach JWT
const authInterceptor = (config: any) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

authApiClient.interceptors.request.use(authInterceptor);
colonyApiClient.interceptors.request.use(authInterceptor);
logApiClient.interceptors.request.use(authInterceptor);
mediaApiClient.interceptors.request.use(authInterceptor);
