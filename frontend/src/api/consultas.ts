import { queryOptions } from '@tanstack/react-query';
import { dashboardApi } from './dashboard';
import { equiposApi } from './equipos';
import { vinetasApi } from './vinetas';

// Definición ÚNICA de las consultas que se precargan (al pasar el mouse por
// el menú o por una sub-área del Inicio, ver rutas/precarga.ts).
//
// Por qué un archivo aparte: la precarga solo sirve si usa EXACTAMENTE la
// misma queryKey que el useQuery de la pantalla — si una dijera ['equipos']
// y la otra ['equipo'], se pediría dos veces. queryOptions() junta key +
// función en un objeto que se reusa en los dos lados:
//   useQuery(consultaEquipos())  /  queryClient.prefetchQuery(consultaEquipos())

export const consultaEquipos = () =>
  queryOptions({ queryKey: ['equipos'], queryFn: equiposApi.getAll });

export const consultaVinetas = () =>
  queryOptions({ queryKey: ['vinetas'], queryFn: () => vinetasApi.getAll() });

// Bajo el prefijo 'dashboard': crear una viñeta invalida ['dashboard'] y
// estas consultas se refrescan solas.
export const consultaAvance = (periodo: number) =>
  queryOptions({
    queryKey: ['dashboard', 'avance', periodo],
    queryFn: () => dashboardApi.avance(periodo),
  });

export const consultaInstrumentosSubArea = (subAreaId: number, periodo: number) =>
  queryOptions({
    queryKey: ['dashboard', 'sub-area', subAreaId, periodo],
    queryFn: () => dashboardApi.instrumentosDeSubArea(subAreaId, periodo),
  });
