import { api } from './client';
import type { Area } from './types';

// AreasController solo expone lectura (GET) — no hay create/update/delete
// todavía, por eso este archivo no tiene los otros 3 métodos como
// equiposApi/tecnicosApi/vinetasApi.
export const areasApi = {
  getAll: () => api.get<Area[]>('/areas').then((res) => res.data),

  getOne: (id: number) => api.get<Area>(`/areas/${id}`).then((res) => res.data),
};
