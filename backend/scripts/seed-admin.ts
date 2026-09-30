// Script de arranque único: crea (o promueve a admin) el primer técnico
// administrador. Es necesario porque, una vez protegidos los endpoints de
// escritura de /tecnicos con AdminAuthGuard, no hay forma de crear un admin
// *desde la API* sin ya tener sesión de admin — alguien tiene que ser el
// primero, y eso se hace acá, directo contra la base de datos, no vía HTTP.
//
// Uso (desde backend/):
//   npx ts-node scripts/seed-admin.ts <cod_empleado> <nombre> <password>
//
// Ejemplo:
//   npx ts-node scripts/seed-admin.ts 1001 "Duvan Granados" "secreto123"
//
// Si ya existe un técnico con ese cod_empleado, lo actualiza (le pone la
// contraseña y lo marca es_admin=true) en vez de crear uno duplicado —
// así el mismo comando sirve para "crear el primer admin" y para
// "resetear la contraseña de un admin que la olvidó".

import 'dotenv/config'; // carga backend/.env en process.env — Nest lo hace
// automáticamente al arrancar la app (ConfigModule), pero este script corre
// suelto con ts-node, así que hay que cargarlo a mano.
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;

async function main() {
  const [codEmpleadoArg, nombre, password] = process.argv.slice(2);

  if (!codEmpleadoArg || !nombre || !password) {
    console.error(
      'Uso: npx ts-node scripts/seed-admin.ts <cod_empleado> <nombre> <password>',
    );
    process.exit(1);
  }

  const codEmpleado = Number(codEmpleadoArg);
  if (!Number.isInteger(codEmpleado) || codEmpleado <= 0) {
    console.error('cod_empleado debe ser un número entero positivo');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('La contraseña debe tener al menos 6 caracteres');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
  });
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  try {
    const admin = await prisma.tecnicos.upsert({
      where: { cod_empleado: codEmpleado },
      update: { nombre, password_hash: passwordHash, es_admin: true, activo: true },
      create: {
        nombre,
        cod_empleado: codEmpleado,
        password_hash: passwordHash,
        es_admin: true,
      },
      select: { id: true, nombre: true, cod_empleado: true, es_admin: true },
    });

    console.log('Administrador listo:', admin);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
