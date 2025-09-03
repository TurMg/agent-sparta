import axios, { AxiosResponse } from 'axios';
import { APIResponse } from '@/types';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse<APIResponse>) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post<APIResponse>('/auth/login', credentials),
  
  register: (data: { username: string; email: string; password: string; role?: string }) =>
    api.post<APIResponse>('/auth/register', data),
  
  getMe: () => api.get<APIResponse>('/auth/me'),
  
  refreshToken: () => api.post<APIResponse>('/auth/refresh'),
};

// Documents API
export const documentsAPI = {
  getAll: () => api.get<APIResponse>('/documents'),
  
  getById: (id: string) => api.get<APIResponse>(`/documents/${id}`),
  
  generateSPH: (data: any) => api.post<APIResponse>('/documents/generate-sph', data),
  
  updateContent: (id: string, content: string, data?: any) =>
    api.patch<APIResponse>(`/documents/${id}/content`, { content, data }),
  
  saveSignature: (signatureData: string, fileName: string) =>
    api.post<APIResponse>('/documents/save-signature', { signatureData, fileName }),
  
  regeneratePDF: (id: string) =>
    api.post<APIResponse>(`/documents/${id}/regenerate-pdf`),
  
  updateStatus: (id: string, status: string) =>
    api.patch<APIResponse>(`/documents/${id}/status`, { status }),
  
  delete: (id: string) => api.delete<APIResponse>(`/documents/${id}`),
};

// AI/Chat API
export const aiAPI = {
  getSessions: () => api.get<APIResponse>('/ai/sessions'),
  
  createSession: (title?: string) => api.post<APIResponse>('/ai/sessions', { title }),
  
  getMessages: (sessionId: string) => api.get<APIResponse>(`/ai/sessions/${sessionId}/messages`),
  
  sendMessage: (sessionId: string, message: string) =>
    api.post<APIResponse>('/ai/chat', { sessionId, message }),
};

export default api;
