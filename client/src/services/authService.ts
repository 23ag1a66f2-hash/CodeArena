import { apiClient } from '@/lib/apiClient';

export interface AuthResponse {
  token: string;
  user: any;
}

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/login', { email, password }),
  signup: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/api/auth/signup', { email, password }),
  me: () => apiClient.get<any>('/api/auth/user'),
  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}; 