import { api } from './client';
import type { AvanceMantenimiento, InstrumentosSubArea, ResumenCalibracion } from './types';

export const dashboardApi = {
  resumenCalibracion: () =>
    api
      .get<ResumenCalibracion>('/dashboard/resumen-calibracion')
      .then((res) => res.data),

  // Avance general + por grupo + por área/sub-área de un periodo.
  avance: (periodo: number) =>
    api
      .get<AvanceMantenimiento>('/dashboard/avance', { params: { periodo } })
      .then((res) => res.data),

  // Instrumentos de una sub-área con su viñeta del periodo (o pendientes).
  instrumentosDeSubArea: (subAreaId: number, periodo: number) =>
    api
      .get<InstrumentosSubArea>(`/dashboard/sub-areas/${subAreaId}/instrumentos`, {
        params: { periodo },
      })
      .then((res) => res.data),
};
