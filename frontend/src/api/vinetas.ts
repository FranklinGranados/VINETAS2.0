import { api } from './client';
import type { CreateVinetaPayload, UpdateVinetaPayload, Vineta } from './types';

// Filtros opcionales que acepta GET /vinetas (ver FindVinetasQueryDto del
// backend). Ambos son opcionales porque la pantalla puede pedir el listado
// completo o acotado por periodo/equipo.
export interface FindVinetasParams {
  periodo?: number;
  equipo_id?: number;
}

export const vinetasApi = {
  getAll: (params?: FindVinetasParams) =>
    api.get<Vineta[]>('/vinetas', { params }).then((res) => res.data),

  getOne: (nvineta: number) =>
    api.get<Vineta>(`/vinetas/${nvineta}`).then((res) => res.data),

  create: (payload: CreateVinetaPayload) =>
    api.post<Vineta>('/vinetas', payload).then((res) => res.data),

  update: (nvineta: number, payload: UpdateVinetaPayload) =>
    api.patch<Vineta>(`/vinetas/${nvineta}`, payload).then((res) => res.data),

  remove: (nvineta: number) => api.delete(`/vinetas/${nvineta}`),

  // Requieren sesión de admin (AdminAuthGuard) — ver comentario en
  // VinetasController. El backend saca el id del encargado del propio
  // token, no de nada que se mande acá.
  marcarRevisada: (nvineta: number) =>
    api.patch<Vineta>(`/vinetas/${nvineta}/revisar`).then((res) => res.data),

  quitarRevision: (nvineta: number) =>
    api.delete<Vineta>(`/vinetas/${nvineta}/revisar`).then((res) => res.data),
};
