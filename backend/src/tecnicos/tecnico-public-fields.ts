import { Prisma } from '@prisma/client';

// select reutilizable con los campos "públicos" de un técnico. Cualquier
// consulta que traiga un técnico, directo o vía relación (ej.
// vinetas.include.tecnicos / tecnico_revisor), usa esto en vez de "true" a
// secas: así la respuesta lleva solo lo pensado para mostrarse.
//
// (Historia: antes la contraseña de administrador vivía en tecnicos y un
// "include: { tecnicos: true }" la filtraba en el JSON. Hoy está en la tabla
// administradores, pero el select explícito se mantiene como protección.)
export const TECNICO_SELECT_PUBLICO = {
  id: true,
  nombre: true,
  cod_empleado: true,
  identificador: true,
  cargo: true,
  activo: true,
} satisfies Prisma.tecnicosSelect;
