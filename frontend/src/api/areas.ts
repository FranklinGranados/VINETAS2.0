import { api } from './client';
import type { Area, CreateAreaPayload, CreateSubAreaPayload, SubArea } from './types';

// Una función por endpoint del AreasController. Lectura abierta; editar
// requiere sesión de admin (el token lo agrega el interceptor de client.ts).
export const areasApi = {
  getAll: () => api.get<Area[]>('/areas').then((res) => res.data),

  getOne: (id: number) => api.get<Area>(`/areas/${id}`).then((res) => res.data),

  // Crea el área con sus sub-áreas (si vienen) en una sola operación.
  create: (payload: CreateAreaPayload) => api.post<Area>('/areas', payload).then((res) => res.data),

  // El código no se cambia desde la pantalla (es el final de los TAG ya
  // existentes); solo el nombre y si cuenta para el avance.
  update: (id: number, payload: Partial<Pick<Area, 'nombre' | 'excluida_mantenimiento'>>) =>
    api.patch<Area>(`/areas/${id}`, payload).then((res) => res.data),

  // POST /sub-areas (solo admin)
  crearSubArea: (payload: CreateSubAreaPayload) =>
    api.post<SubArea>('/sub-areas', payload).then((res) => res.data),

  // PATCH /sub-areas/:id (SubAreasController, solo admin)
  actualizarSubArea: (id: number, payload: Partial<Pick<SubArea, 'nombre' | 'tag_especial'>>) =>
    api.patch<SubArea>(`/sub-areas/${id}`, payload).then((res) => res.data),
};
