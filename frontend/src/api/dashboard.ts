import { api } from './client';
import type { ResumenCalibracion } from './types';

export const dashboardApi = {
  resumenCalibracion: () =>
    api
      .get<ResumenCalibracion>('/dashboard/resumen-calibracion')
      .then((res) => res.data),
};
