import api from '@/api/axios';
import { User } from '@/types';

export const authApi = {
  sendCode: (email: string) =>
    api.post('/auth/send-code', { email }),

  signUp: (email: string, verificationCode: string) =>
    api.post<{ data: User }>('/auth/signup', { email, verificationCode }),

  signIn: (email: string, verificationCode: string) =>
    api.post<{ data: { accessToken: string; user: User } }>('/auth/signin', { email, verificationCode }),

  getMe: () =>
    api.get<{ data: User }>('/auth/me'),

  updateProfile: (userId: string, data: { displayName?: string; avatar?: string }) =>
    api.put<{ data: User }>(`/users/${userId}`, data),
};
