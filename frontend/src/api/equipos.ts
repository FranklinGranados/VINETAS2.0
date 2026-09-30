import { api } from './client';
import type { CreateEquipoPayload, Equipo, UpdateEquipoPayload } from './types';

// Cada función corresponde 1 a 1 con un endpoint del EquiposController
// del backend. api.get<Equipo[]> le dice a axios (y a TypeScript) qué
// forma esperar en response.data, sin necesidad de castear a mano.
export const equiposApi = {
  getAll: () => api.get<Equipo[]>('/equipos').then((res) => res.data),

  getOne: (id: number) =>
    api.get<Equipo>(`/equipos/${id}`).then((res) => res.data),

  create: (payload: CreateEquipoPayload) =>
    api.post<Equipo>('/equipos', payload).then((res) => res.data),

  update: (id: number, payload: UpdateEquipoPayload) =>
    api.patch<Equipo>(`/equipos/${id}`, payload).then((res) => res.data),

  remove: (id: number) => api.delete(`/equipos/${id}`),
};
