import type { QueryClient } from '@tanstack/react-query';
import { consultaAvance, consultaEquipos, consultaVinetas } from '../api/consultas';
import {
  cargarAcercaDe,
  cargarAdministradores,
  cargarAreas,
  cargarGrupos,
  cargarEquipos,
  cargarTecnicos,
  cargarVinetas,
} from './cargaPantallas';

// Qué se adelanta al pasar el mouse por cada opción del menú: el código de
// la pantalla y, en las que más datos traen, su consulta principal (Equipos
// son +1000 instrumentos en la base real). Al hacer clic, la pantalla
// aparece con los datos ya cargados en vez de mostrar el spinner.
//
// prefetchQuery NO repite la petición si los datos siguen frescos
// (staleTime en main.tsx): pasar el mouse diez veces = una sola petición.
// Si la precarga falla, no muestra nada: la pantalla lo reintentará y
// mostrará el error con su propio ErrorDeCarga.
const PRECARGAS: Record<string, (qc: QueryClient) => void> = {
  '/': (qc) => void qc.prefetchQuery(consultaAvance(new Date().getFullYear())),
  '/equipos': (qc) => {
    void cargarEquipos();
    void qc.prefetchQuery(consultaEquipos());
  },
  '/vinetas': (qc) => {
    void cargarVinetas();
    void qc.prefetchQuery(consultaVinetas());
  },
  '/acerca-de': () => void cargarAcercaDe(),
  // Administración: solo el código (sus listas son cortas).
  '/grupos': () => void cargarGrupos(),
  '/areas': () => void cargarAreas(),
  '/tecnicos': () => void cargarTecnicos(),
  '/administradores': () => void cargarAdministradores(),
};

export function precargarRuta(ruta: string, queryClient: QueryClient) {
  PRECARGAS[ruta]?.(queryClient);
}
