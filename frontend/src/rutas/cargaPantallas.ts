// Descarga del código de cada pantalla diferida (ver pantallas.tsx). Cada
// import() está en su propia función para usarla en dos lugares:
// - React.lazy, al entrar a la pantalla (pantallas.tsx).
// - Al pasar el mouse por el menú (rutas/precarga.ts): el navegador
//   recuerda el módulo ya descargado, así que cuando React.lazy lo pide,
//   está listo.
// Archivo aparte (no dentro de pantallas.tsx) porque la recarga en caliente
// de Vite solo funciona en archivos que exportan únicamente componentes.

export const cargarEquipos = () => import('../modulos/equipos/EquiposPage');
export const cargarVinetas = () => import('../modulos/vinetas/VinetasPage');
export const cargarGrupos = () => import('../modulos/grupos/GruposPage');
export const cargarAreas = () => import('../modulos/areas/AreasPage');
export const cargarTecnicos = () => import('../modulos/tecnicos/TecnicosPage');
export const cargarAcercaDe = () => import('../modulos/acerca-de/AcercaDePage');
export const cargarAdministradores = () => import('../modulos/administradores/AdministradoresPage');
