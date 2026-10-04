import { api } from './client';
import type {
  Administrador,
  CreateAdministradorPayload,
  UpdateAdministradorPayload,
} from './types';

// Una función por endpoint de AdministradoresController (todos requieren
// sesión de admin; el token lo agrega el interceptor de client.ts). Sin
// remove: un administrador se desactiva con update({ activo: false }).
export const administradoresApi = {
  getAll: () =>
    api.get<Administrador[]>('/administradores').then((res) => res.data),

  create: (payload: CreateAdministradorPayload) =>
    api.post<Administrador>('/administradores', payload).then((res) => res.data),

  update: (id: number, payload: UpdateAdministradorPayload) =>
    api.patch<Administrador>(`/administradores/${id}`, payload).then((res) => res.data),
};
