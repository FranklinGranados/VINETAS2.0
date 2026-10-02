import { api } from './client';
import type { Area } from './types';

// Una función por endpoint del AreasController. Lectura abierta; editar
// requiere sesión de admin (el token lo agrega el interceptor de client.ts).
export const areasApi = {
  getAll: () => api.get<Area[]>('/areas').then((res) => res.data),

  getOne: (id: number) => api.get<Area>(`/areas/${id}`).then((res) => res.data),

  // Por ahora la pantalla solo cambia si el área cuenta para el avance.
  update: (id: number, payload: Partial<Pick<Area, 'nombre' | 'excluida_mantenimiento'>>) =>
    api.patch<Area>(`/areas/${id}`, payload).then((res) => res.data),
};
