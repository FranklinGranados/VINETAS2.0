// Diagnóstico de SOLO LECTURA de la base de datos original (SQL Server).
//
// Sirve para verificar, antes de programar el adaptador de SQL Server, que:
//   1. la conexión y las credenciales funcionan (instancia con nombre
//      \SQLEXPRESS, cifrado, firewall...);
//   2. las tablas existen y cuántos registros tienen;
//   3. cómo son los datos reales (filas de ejemplo), para mapearlos bien.
//
// Solo ejecuta SELECT: nunca escribe ni modifica nada en la base de datos.
//
// Uso (la cadena de conexión va en la variable SQLSERVER_URL, en .env):
//   Con Node, desde backend/:   npx ts-node scripts/probar-sqlserver.ts
//   Con Docker, desde la raíz:  docker compose exec backend node dist/scripts/probar-sqlserver.js
//
// Formato de SQLSERVER_URL (ver .env.example):
//   Server=IP\SQLEXPRESS;Database=Vinetas;User Id=usuario;Password=clave;Encrypt=false;TrustServerCertificate=true

import 'dotenv/config';
import * as sql from 'mssql';

// Columnas que NUNCA se muestran en pantalla (contraseñas de v1).
const COLUMNAS_OCULTAS = new Set(['pass', 'password']);

function titulo(texto: string) {
  console.log(`\n=== ${texto} ${'='.repeat(Math.max(0, 70 - texto.length))}`);
}

// Oculta la contraseña de la cadena de conexión antes de mostrarla.
function cadenaSinClave(cadena: string): string {
  return cadena.replace(/(password|pwd)\s*=\s*[^;]*/gi, '$1=****');
}

// Filas de ejemplo en formato tabla, sin columnas sensibles y con los
// textos recortados (en v1 muchas columnas son CHAR con espacios de relleno).
function mostrarFilas(filas: Record<string, unknown>[]) {
  const limpias = filas.map((fila) =>
    Object.fromEntries(
      Object.entries(fila)
        .filter(([columna]) => !COLUMNAS_OCULTAS.has(columna.toLowerCase()))
        .map(([columna, valor]) => [
          columna,
          valor instanceof Date
            ? valor.toISOString().slice(0, 10)
            : typeof valor === 'string'
              ? valor.trim()
              : valor,
        ]),
    ),
  );
  console.table(limpias);
}

// Explica en español qué revisar según el código de error de mssql/tedious.
function pista(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case 'ELOGIN':
      return 'Usuario o contraseña incorrectos, o el usuario no tiene acceso a esa base de datos.';
    case 'EINSTLOOKUP':
      return 'No se encontró la instancia (\\SQLEXPRESS). Verificar que el servicio "SQL Server Browser" esté iniciado en el servidor y que el firewall permita UDP 1434; o usar el puerto fijo: Server=IP,PUERTO';
    case 'ETIMEOUT':
    case 'ESOCKET':
      return 'No hay conexión de red con el servidor. Verificar la IP, que esta PC esté en la red de la empresa, y que el firewall del servidor permita el puerto de SQL Server (TCP 1433 o el de la instancia).';
    default:
      if (
        error.message?.toLowerCase().includes('ssl') ||
        error.message?.toLowerCase().includes('tls')
      ) {
        return 'Problema de cifrado: probar con Encrypt=false;TrustServerCertificate=true en la cadena de conexión.';
      }
      return 'Revisar el mensaje de error de arriba.';
  }
}

async function main() {
  const cadena = process.env.SQLSERVER_URL;
  if (!cadena) {
    console.error('Falta la variable SQLSERVER_URL (ver .env.example).');
    process.exit(1);
  }

  titulo('Conexión');
  console.log('Cadena:', cadenaSinClave(cadena));

  let pool: sql.ConnectionPool;
  try {
    pool = await sql.connect(cadena);
  } catch (e) {
    const error = e as { code?: string; message?: string };
    console.error(
      `✗ No se pudo conectar [${error.code ?? 'sin código'}]: ${error.message}`,
    );
    console.error(`  → ${pista(error)}`);
    process.exit(1);
  }
  const version = await pool
    .request()
    .query<{ v: string }>('SELECT @@VERSION AS v');
  console.log('✓ Conectado.', version.recordset[0].v.split('\n')[0]);

  titulo('Tablas y cantidad de registros');
  const tablas = await pool.request().query<{ tabla: string; filas: number }>(`
    SELECT t.name AS tabla, SUM(p.rows) AS filas
    FROM sys.tables t
    JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
    GROUP BY t.name
    ORDER BY t.name`);
  console.table(tablas.recordset);

  // Solo se consultan tablas que existen (los nombres salen de sys.tables,
  // no de texto escrito por el usuario — por eso es seguro armarlos en el SQL).
  const existe = (nombre: string) =>
    tablas.recordset.some(
      (t) => t.tabla.toLowerCase() === nombre.toLowerCase(),
    );

  for (const tabla of ['equipos', 'vinetas', 'Instrumentistas', 'Areas']) {
    if (!existe(tabla)) continue;
    titulo(`Ejemplo: ${tabla} (3 filas)`);
    const orden = tabla === 'vinetas' ? 'ORDER BY Nvineta DESC' : '';
    mostrarFilas(
      (await pool.request().query(`SELECT TOP 3 * FROM [${tabla}] ${orden}`))
        .recordset,
    );
  }

  if (existe('equipos')) {
    titulo('Equipos: estados');
    mostrarFilas(
      (
        await pool.request().query(`
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN EnUSO = 1 THEN 1 ELSE 0 END) AS en_uso,
            SUM(CASE WHEN Hibernacion = 1 THEN 1 ELSE 0 END) AS hibernacion,
            SUM(CASE WHEN EnUSO = 1 AND Hibernacion = 1 THEN 1 ELSE 0 END) AS en_uso_y_hibernacion,
            SUM(CASE WHEN MITRE = 1 THEN 1 ELSE 0 END) AS mitre
          FROM equipos`)
      ).recordset,
    );

    titulo('Equipos con TAG repetido');
    const repetidos = await pool.request().query<Record<string, unknown>>(`
      SELECT LTRIM(RTRIM(TAG)) AS tag, COUNT(*) AS veces
      FROM equipos
      GROUP BY LTRIM(RTRIM(TAG))
      HAVING COUNT(*) > 1
      ORDER BY veces DESC, tag`);
    if (repetidos.recordset.length === 0) console.log('Ninguno.');
    else {
      console.log(`${repetidos.recordset.length} TAG repetidos (primeros 20):`);
      mostrarFilas(repetidos.recordset.slice(0, 20));
    }
  }

  if (existe('vinetas')) {
    titulo('Viñetas activas: rango');
    mostrarFilas(
      (
        await pool.request().query(`
          SELECT MIN(Nvineta) AS nvineta_min, MAX(Nvineta) AS nvineta_max,
                 MIN(Fecha) AS fecha_min, MAX(Fecha) AS fecha_max,
                 COUNT(DISTINCT ID) AS equipos_distintos
          FROM vinetas`)
      ).recordset,
    );
  }

  await pool.close();
  console.log('\n✓ Diagnóstico terminado (solo lectura, no se modificó nada).');
}

main().catch((e) => {
  console.error('Error inesperado:', (e as Error).message);
  process.exit(1);
});
