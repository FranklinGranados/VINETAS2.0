import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() hace que PrismaService quede disponible en TODOS los módulos
// de la app sin tener que importar PrismaModule en cada uno. Se usa solo
// para casos como este: un recurso único y compartido por todo el sistema
// (la conexión a la base de datos).
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // exports = "otros módulos pueden inyectar esto"
})
export class PrismaModule {}
