import { api } from './client';
import type { CreateGrupoPayload, GrupoTrabajo } from './types';

// Una función por endpoint del GruposController del backend. Lectura
// abierta; crear/editar/borrar/asignar requieren sesión de admin (el token
// lo agrega solo el interceptor de api/client.ts).
export const gruposApi = {
  getAll: (periodo: number) =>
    api.get<GrupoTrabajo[]>('/grupos', { params: { periodo } }).then((res) => res.data),

  create: (payload: CreateGrupoPayload) =>
    api.post<GrupoTrabajo>('/grupos', payload).then((res) => res.data),

  renombrar: (id: number, nombre: string) =>
    api.patch<GrupoTrabajo>(`/grupos/${id}`, { nombre }).then((res) => res.data),

  remove: (id: number) => api.delete(`/grupos/${id}`),

  // PUT: reemplazan la lista completa (ver AsignarTecnicosDto del backend).
  asignarTecnicos: (id: number, tecnicoIds: number[]) =>
    api
      .put<GrupoTrabajo>(`/grupos/${id}/tecnicos`, { tecnico_ids: tecnicoIds })
      .then((res) => res.data),

  asignarSubAreas: (id: number, subAreaIds: number[]) =>
    api
      .put<GrupoTrabajo>(`/grupos/${id}/sub-areas`, { sub_area_ids: subAreaIds })
      .then((res) => res.data),
};
