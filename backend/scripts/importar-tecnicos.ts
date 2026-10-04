// Carga los técnicos de la base de datos ORIGINAL (SQL Server, tabla
// Instrumentistas) en la base nueva (MySQL, tabla tecnicos).
//
// Reglas:
//  - Solo LEE la base original: no la modifica.
//  - Nunca BORRA técnicos de la base nueva: crea los que faltan y actualiza
//    los que ya existen.
//  - Por defecto es una SIMULACIÓN: muestra qué haría sin escribir nada.
//    Para aplicar los cambios hay que agregar --aplicar.
//  - Se puede correr varias veces: el resultado es el mismo (no duplica).
//
// Cómo se une cada empleado con un técnico existente:
//  1. por código de empleado (CodEmp → cod_empleado), si lo tiene;
//  2. si no tiene código, por nombre (sin distinguir mayúsculas/espacios).
//
// Qué se copia: nombre, código de empleado, identificador (columna "Pass"
// de v1, que no es una contraseña), cargo y activo (= no Inactivo).
//
// Uso (desde backend/; SQLSERVER_URL y DATABASE_URL en .env):
//   npx ts-node scripts/importar-tecnicos.ts             ← simulación
//   npx ts-node scripts/importar-tecnicos.ts --aplicar   ← escribe
// Con Docker, desde la raíz:
//   docker compose exec backend node dist/scripts/importar-tecnicos.js [--aplicar]

import 'dotenv/config';
import * as sql from 'mssql';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

interface Instrumentista {
  ID: number;
  nombre: string | null;
  CodEmp: number | null;
  pass: string | null;
  cargo: string | null;
  inactivo: boolean | null;
}

// "  JUAN  Pérez " → "juan pérez" (para comparar nombres de forma tolerante)
const normalizar = (texto: string) =>
  texto.trim().replace(/\s+/g, ' ').toLowerCase();

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  if (!process.env.SQLSERVER_URL)
    throw new Error('Falta SQLSERVER_URL (ver .env.example)');
  if (!process.env.DATABASE_URL)
    throw new Error('Falta DATABASE_URL (ver .env.example)');

  console.log(
    aplicar
      ? '=== APLICANDO cambios ==='
      : '=== SIMULACIÓN (no se escribe nada; agregar --aplicar para escribir) ===',
  );

  // ── 1. Leer Instrumentistas (solo lectura) ──
  const origen = await sql.connect(process.env.SQLSERVER_URL);
  // La columna Inactivo se agregó después en producción: si no existe, se
  // considera a todos activos.
  const tieneInactivo =
    (
      await origen
        .request()
        .query<{ existe: number | null }>(
          "SELECT COL_LENGTH('Instrumentistas', 'Inactivo') AS existe",
        )
    ).recordset[0].existe !== null;
  const filas = (
    await origen.request().query<Instrumentista>(`
      SELECT ID,
             LTRIM(RTRIM(Instrumentistas)) AS nombre,
             CodEmp,
             LTRIM(RTRIM(Pass))  AS pass,
             LTRIM(RTRIM(cargo)) AS cargo,
             ${tieneInactivo ? 'Inactivo' : 'CAST(0 AS bit)'} AS inactivo
      FROM Instrumentistas
      ORDER BY ID`)
  ).recordset;
  await origen.close();
  console.log(`Instrumentistas leídos: ${filas.length}`);

  // ── 2. Comparar con los técnicos de la base nueva ──
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL),
  });
  const existentes = await prisma.tecnicos.findMany();

  const resumen = { crear: 0, actualizar: 0, sinCambios: 0, omitidos: 0 };
  try {
    for (const fila of filas) {
      // Nombre limpio: sin espacios de relleno ni espacios dobles internos.
      const nombre = fila.nombre?.trim().replace(/\s+/g, ' ');
      if (!nombre) {
        console.log(`  ⚠ ID ${fila.ID}: sin nombre → se omite`);
        resumen.omitidos++;
        continue;
      }
      // CodEmp 0 o vacío = sin código (así lo trata el programa de Rutinas).
      const codEmpleado = fila.CodEmp && fila.CodEmp > 0 ? fila.CodEmp : null;
      const datos = {
        nombre,
        cod_empleado: codEmpleado,
        identificador: fila.pass?.trim() || null,
        cargo: fila.cargo?.trim() || null,
        activo: !fila.inactivo,
      };

      const existente =
        (codEmpleado !== null &&
          existentes.find((t) => t.cod_empleado === codEmpleado)) ||
        existentes.find(
          (t) =>
            t.cod_empleado === null &&
            normalizar(t.nombre) === normalizar(nombre),
        );

      if (!existente) {
        console.log(
          `  + crear: ${nombre} (código ${codEmpleado ?? '—'}${datos.activo ? '' : ', inactivo'})`,
        );
        resumen.crear++;
        if (aplicar)
          existentes.push(await prisma.tecnicos.create({ data: datos }));
        continue;
      }

      // Qué campos cambian (para mostrarlo y para no escribir si no hace falta).
      const cambios = (Object.keys(datos) as (keyof typeof datos)[]).filter(
        (campo) => existente[campo] !== datos[campo],
      );
      if (cambios.length === 0) {
        resumen.sinCambios++;
        continue;
      }
      console.log(
        `  ~ actualizar: ${existente.nombre} → ` +
          cambios
            .map((c) => `${c}: ${String(existente[c])} → ${String(datos[c])}`)
            .join(', '),
      );
      resumen.actualizar++;
      if (aplicar)
        await prisma.tecnicos.update({
          where: { id: existente.id },
          data: datos,
        });
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    `\nResumen: ${resumen.crear} a crear, ${resumen.actualizar} a actualizar, ` +
      `${resumen.sinCambios} sin cambios, ${resumen.omitidos} omitidos.` +
      (aplicar ? ' (aplicado)' : ' (simulación: nada se escribió)'),
  );
}

main().catch((e) => {
  console.error('Error:', (e as Error).message);
  process.exit(1);
});
