// Tipos que reflejan exactamente el JSON que devuelve el backend (mismos
// nombres de campo en snake_case, porque así están las columnas en MySQL
// y Prisma no los transforma). No son los mismos tipos que los DTOs del
// backend: acá modelamos la RESPUESTA, allá modelaban el REQUEST de entrada.

export interface Area {
  id: number;
  codigo: string;
  nombre: string;
  // true = no cuenta para el avance del mantenimiento (Inicio y grupos).
  excluida_mantenimiento: boolean;
  sub_areas?: SubArea[];
}

export interface SubArea {
  id: number;
  area_id: number;
  codigo: string;
  nombre: string;
  // true = sus equipos llevan TAG de formato propio, escrito completo a mano
  // (ej. Caldera Mitre). Lo define un administrador en la pantalla Áreas.
  tag_especial: boolean;
  areas?: Area;
}

export interface Equipo {
  id: number;
  sub_area_id: number;
  tag: string;
  descripcion: string | null;
  informacion: string | null;
  interviene_calidad: boolean;
  // OJO: columnas DECIMAL de MySQL — Prisma las serializa como STRING en
  // JSON (precisión exacta, evita errores de punto flotante). Hay que
  // convertirlas con Number() antes de hacer cuentas o mostrarlas en un
  // input numérico.
  lrv: string | null;
  hrv: string | null;
  escala: string | null;
  eu: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  diametro: string | null;
  sello: string | null;
  cuadratico: boolean;
  en_uso: boolean;
  hibernacion: boolean;
  sub_areas?: SubArea;
}

export interface Tecnico {
  id: number;
  nombre: string;
  cod_empleado: number | null;
  // Identificador del empleado en el taller (columna "Pass" de v1).
  identificador: string | null;
  cargo: string | null;
  activo: boolean;
}

export interface Vineta {
  nvineta: number;
  equipo_id: number;
  tecnico_id: number | null;
  // Administrador que revisó el trabajo en sitio; NULL = todavía nadie.
  admin_reviso_id: number | null;
  periodo: number;
  tag: string | null;
  descripcion: string | null;
  informacion: string | null;
  // Fechas: el backend las serializa como string ISO 8601 (ej:
  // "2026-03-15T00:00:00.000Z"), no como objeto Date — eso solo existe
  // en tiempo de ejecución dentro de Node.
  fecha: string;
  proximo: string | null;
  mantenimiento: string | null;
  equipos?: Equipo;
  tecnicos?: Tecnico;
  admin_revisor?: { id: number; nombre: string } | null;
}

// ── Payloads de escritura (lo que el frontend ENVÍA) ──
// Reflejan los DTOs del backend, campo por campo.

export interface CreateEquipoPayload {
  sub_area_id: number;
  tag: string;
  descripcion: string;
  informacion: string;
}

// En PATCH hay dos cosas distintas: OMITIR un campo = "no lo toques", y
// mandarlo en null = "vacialo". Por eso los datos técnicos opcionales
// aceptan null (el @IsOptional() del backend deja pasar null sin validar,
// y la columna en MySQL es NULL-able).
export type UpdateEquipoPayload = Partial<CreateEquipoPayload> & {
  lrv?: number | null;
  hrv?: number | null;
  escala?: number | null;
  eu?: string | null;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  diametro?: string | null;
  sello?: string | null;
  cuadratico?: boolean;
  en_uso?: boolean;
  hibernacion?: boolean;
  interviene_calidad?: boolean;
};

export interface CreateTecnicoPayload {
  nombre: string;
  cod_empleado?: number;
  identificador?: string;
  cargo?: string;
}

// En PATCH, null = vaciar el campo (ej. quitar el cargo).
export type UpdateTecnicoPayload = {
  nombre?: string;
  cod_empleado?: number | null;
  identificador?: string | null;
  cargo?: string | null;
  activo?: boolean;
};

// POST /areas: el área y, opcionalmente, sus sub-áreas en una sola operación.
export interface CreateAreaPayload {
  codigo: string;
  nombre: string;
  sub_areas?: { codigo: string; nombre: string }[];
}

// POST /sub-areas: agregar una sub-área a un área existente.
export interface CreateSubAreaPayload {
  area_id: number;
  codigo: string;
  nombre: string;
}

export interface CreateVinetaPayload {
  equipo_id: number;
  tecnico_id?: number;
  fecha: string;
  proximo?: string;
  mantenimiento?: string;
}

export interface UpdateVinetaPayload {
  fecha?: string;
  tecnico_id?: number;
  proximo?: string;
  mantenimiento?: string;
}

// Respuesta de GET /dashboard/resumen-calibracion — replica el "Faltan X de
// Y, Z%" que mostraba la barra de estado del formulario principal en v1.
export interface ResumenCalibracion {
  periodo: number;
  totalActivos: number;
  completados: number;
  faltan: number;
  porcentaje: number;
}

// ── Grupos de trabajo (por periodo) ──

export interface GrupoTrabajo {
  id: number;
  periodo: number;
  nombre: string;
  // Tablas intermedias tal como las devuelve Prisma (include anidado).
  grupo_tecnicos: { tecnico_id: number; tecnicos: Tecnico }[];
  grupo_sub_areas: { sub_area_id: number; sub_areas: SubArea & { areas: Area } }[];
}

export interface CreateGrupoPayload {
  periodo: number;
  nombre: string;
}

// ── Avance del mantenimiento (GET /dashboard/avance) ──

// Totales de cualquier agrupación: todo, un grupo, un área, una sub-área.
export interface Avance {
  total: number;
  completados: number;
  pendientes: number;
  porcentaje: number;
  // Avanzado "esta semana": desde el corte del jueves anterior hasta hoy.
  semana: { completados: number; porcentaje: number };
}

export interface AvanceSubArea extends Avance {
  id: number;
  codigo: string;
  nombre: string;
  // null = la sub-área no está asignada a ningún grupo en el periodo.
  grupo: { id: number; nombre: string } | null;
}

export interface AvanceArea extends Avance {
  id: number;
  codigo: string;
  nombre: string;
  sub_areas: AvanceSubArea[];
}

export interface AvanceGrupo extends Avance {
  id: number;
  nombre: string;
  tecnicos: { id: number; nombre: string }[];
}

export interface AvanceMantenimiento extends Avance {
  periodo: number;
  hoy: string; // "AAAA-MM-DD" en la hora local de la planta
  corteSemanal: string; // jueves anterior, "AAAA-MM-DD"
  vinetasHoy: number;
  vinetasSemana: number; // impresas desde el corte hasta hoy
  grupos: AvanceGrupo[];
  sinGrupo: Avance;
  areas: AvanceArea[];
  areasExcluidas: { id: number; codigo: string; nombre: string }[];
}

// GET /dashboard/sub-areas/:id/instrumentos — cada instrumento es un Equipo
// más su viñeta del periodo (null = pendiente).
export interface InstrumentoConVineta extends Equipo {
  vineta: { nvineta: number; fecha: string; tecnicos: { id: number; nombre: string } | null } | null;
}

export interface InstrumentosSubArea {
  periodo: number;
  total: number;
  completados: number;
  pendientes: number;
  porcentaje: number;
  area: { id: number; codigo: string; nombre: string; excluida_mantenimiento: boolean };
  sub_area: { id: number; codigo: string; nombre: string };
  grupo: { id: number; nombre: string } | null;
  instrumentos: InstrumentoConVineta[];
}

// POST /auth/login
export interface LoginPayload {
  usuario: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

// ── Administradores (GET/POST/PATCH /administradores, solo con sesión) ──
// Tabla aparte de técnicos: login por usuario + contraseña. Algunos
// también sacan viñetas, por eso el vínculo opcional a su técnico.
export interface Administrador {
  id: number;
  usuario: string;
  nombre: string;
  activo: boolean;
  creado_en: string;
  tecnico_id: number | null;
  tecnicos: Tecnico | null;
}

export interface CreateAdministradorPayload {
  usuario: string;
  nombre: string;
  password: string;
  tecnico_id?: number;
}

// Omitir = no tocar; tecnico_id null = quitar el vínculo; password = nueva clave.
export type UpdateAdministradorPayload = Partial<Omit<CreateAdministradorPayload, 'tecnico_id'>> & {
  activo?: boolean;
  tecnico_id?: number | null;
};
