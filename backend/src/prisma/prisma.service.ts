import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// PrismaService extiende PrismaClient (la clase que Prisma generó a partir
// de prisma/schema.prisma, y que vive en node_modules/@prisma/client).
// Al extenderla, esta clase hereda automáticamente todos los métodos de
// consulta: this.areas.findMany(), this.equipos.create(), etc.
//
// Desde Prisma 7, PrismaClient ya no se conecta solo leyendo DATABASE_URL:
// hay que pasarle explícitamente un "driver adapter", que es el paquete
// que sabe hablar el protocolo de la base de datos. Para MySQL/MariaDB
// se usa @prisma/adapter-mariadb.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
    });
  }

  // Se ejecuta una vez, cuando Nest termina de armar todos los módulos.
  // Abrimos la conexión a MySQL acá (no en el constructor) para que quede
  // lista antes de que cualquier request la use.
  async onModuleInit() {
    await this.$connect();
  }

  // Se ejecuta cuando la app se apaga (Ctrl+C, redeploy, etc.).
  // Cerramos la conexión de forma prolija en vez de dejarla colgada.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
