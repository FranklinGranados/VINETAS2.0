import { api } from './client';
import type { CreateTecnicoPayload, Tecnico, UpdateTecnicoPayload } from './types';

// Mismo molde que equiposApi: una función por endpoint del
// TecnicosController del backend.
export const tecnicosApi = {
  getAll: () => api.get<Tecnico[]>('/tecnicos').then((res) => res.data),

  getOne: (id: number) =>
    api.get<Tecnico>(`/tecnicos/${id}`).then((res) => res.data),

  create: (payload: CreateTecnicoPayload) =>
    api.post<Tecnico>('/tecnicos', payload).then((res) => res.data),

  update: (id: number, payload: UpdateTecnicoPayload) =>
    api.patch<Tecnico>(`/tecnicos/${id}`, payload).then((res) => res.data),

  remove: (id: number) => api.delete(`/tecnicos/${id}`),
};
