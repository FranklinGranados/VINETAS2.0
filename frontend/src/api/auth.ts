import { api } from './client';
import type { LoginPayload, LoginResponse } from './types';

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', payload).then((res) => res.data),
};
