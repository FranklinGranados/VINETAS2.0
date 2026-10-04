import { lazy } from 'react';
import {
  cargarAcercaDe,
  cargarAdministradores,
  cargarAreas,
  cargarEquipos,
  cargarGrupos,
  cargarTecnicos,
  cargarVinetas,
} from './cargaPantallas';

// Carga diferida de pantallas (code splitting). Sin esto, el navegador
// descarga TODO el código de la app (formularios, impresión, código de
// barras, administración...) antes de mostrar el Inicio. Con React.lazy,
// Vite separa cada pantalla en su propio archivo .js que se baja recién
// al entrar a ella; mientras tanto se ve <PantallaDeCarga /> (el Suspense
// de AppLayout).
//
// Inicio (DashboardPage) y Login NO van acá: son la primera pantalla que se
// abre, y diferirlas solo agregaría una espera más al arrancar.

// Las pantallas son exports con nombre; React.lazy espera un "default".
export const EquiposPage = lazy(() => cargarEquipos().then((m) => ({ default: m.EquiposPage })));
export const VinetasPage = lazy(() => cargarVinetas().then((m) => ({ default: m.VinetasPage })));
export const GruposPage = lazy(() => cargarGrupos().then((m) => ({ default: m.GruposPage })));
export const AreasPage = lazy(() => cargarAreas().then((m) => ({ default: m.AreasPage })));
export const TecnicosPage = lazy(() => cargarTecnicos().then((m) => ({ default: m.TecnicosPage })));
export const AcercaDePage = lazy(() => cargarAcercaDe().then((m) => ({ default: m.AcercaDePage })));
export const AdministradoresPage = lazy(() =>
  cargarAdministradores().then((m) => ({ default: m.AdministradoresPage })),
);
