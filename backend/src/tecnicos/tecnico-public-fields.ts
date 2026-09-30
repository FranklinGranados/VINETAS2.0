import { Prisma } from '@prisma/client';

// select reutilizable con los campos "públicos" de un técnico — todo menos
// password_hash. Cualquier consulta que traiga un técnico, directo o vía
// relación (ej. vinetas.include.tecnicos / tecnico_revisor), debe usar
// esto en vez de "true" a secas: "include: { tecnicos: true }" trae la fila
// completa, password_hash incluido, y eso se filtra tal cual en el JSON de
// respuesta de la API — pasó exactamente eso antes de agregar este archivo.
export const TECNICO_SELECT_PUBLICO = {
  id: true,
  nombre: true,
  cod_empleado: true,
  cargo: true,
  activo: true,
  es_admin: true,
} satisfies Prisma.tecnicosSelect;
