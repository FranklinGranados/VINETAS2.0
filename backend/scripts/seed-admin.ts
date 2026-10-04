// Script de arranque: crea (o resetea) un ADMINISTRADOR directo en la base de
// datos. Hace falta para el primero: una vez protegidos los endpoints de
// administración, no hay forma de crear un admin desde la API sin ya tener
// sesión de admin — alguien tiene que ser el primero, y eso se hace acá. Los
// siguientes se pueden crear desde la pantalla Administración → Administradores.
//
// Uso (desde backend/):
//   npm run seed:admin -- <usuario> "<nombre completo>" <clave> [cod_empleado]
// Con Docker, desde la raíz:
//   docker compose exec backend node dist/scripts/seed-admin.js <usuario> "<nombre>" <clave> [cod_empleado]
//
// Ejemplos:
//   npm run seed:admin -- fgranados "Franklin Granados" "MiClave2026"
//   npm run seed:admin -- fgranados "Franklin Granados" "MiClave2026" 1001
//     ↑ el 4to argumento (opcional) lo vincula al técnico con ese código de
//       empleado, si ese administrador también saca viñetas.
//
// Si el usuario ya existe, le resetea la contraseña y lo reactiva (el mismo
// comando sirve para "crear el primero" y para "olvidé la contraseña").

import 'dotenv/config'; // carga backend/.env en process.env — Nest lo hace
// automáticamente al arrancar la app (ConfigModule), pero este script corre
// suelto, así que hay que cargarlo a mano.
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;

async function main() {
  const [usuarioArg, nombre, password, codEmpleadoArg] = process.argv.slice(2);

  if (!usuarioArg || !nombre || !password) {
    console.error(
      'Uso: seed-admin <usuario> "<nombre completo>" <clave> [cod_empleado]',
    );
    process.exit(1);
  }
  const usuario = usuarioArg.trim();
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(usuario)) {
    console.error(
      'El usuario debe tener 3-50 letras, números, punto, guion o guion bajo (sin espacios)',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
  });
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  try {
    // Técnico a vincular (opcional): debe existir.
    let tecnicoId: number | null = null;
    if (codEmpleadoArg) {
      const tecnico = await prisma.tecnicos.findUnique({
        where: { cod_empleado: Number(codEmpleadoArg) },
      });
      if (!tecnico) {
        console.error(
          `No existe un técnico con código de empleado ${codEmpleadoArg}`,
        );
        process.exit(1);
      }
      tecnicoId = tecnico.id;
    }

    const admin = await prisma.administradores.upsert({
      where: { usuario },
      update: {
        nombre,
        password_hash: passwordHash,
        activo: true,
        ...(tecnicoId !== null && { tecnico_id: tecnicoId }),
      },
      create: {
        usuario,
        nombre,
        password_hash: passwordHash,
        tecnico_id: tecnicoId,
      },
      select: { id: true, usuario: true, nombre: true, tecnico_id: true },
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
