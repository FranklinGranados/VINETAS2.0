import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AreasModule } from './areas/areas.module';
import { EquiposModule } from './equipos/equipos.module';
import { TecnicosModule } from './tecnicos/tecnicos.module';
import { VinetasModule } from './vinetas/vinetas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';
import { GruposModule } from './grupos/grupos.module';
import { AdministradoresModule } from './administradores/administradores.module';
import { RegistroPeticionesMiddleware } from './common/registro-peticiones.middleware';

@Module({
  imports: [
    // isGlobal: true = process.env queda disponible en cualquier módulo
    // sin tener que importar ConfigModule en cada uno (igual que hicimos
    // con @Global() en PrismaModule).
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AreasModule,
    EquiposModule,
    TecnicosModule,
    VinetasModule,
    DashboardModule,
    AuthModule,
    GruposModule,
    AdministradoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  // Registro de cada petición HTTP en el log (para seguir errores en tiempo
  // real con ver-logs.bat). forRoutes('*') = todas las rutas.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RegistroPeticionesMiddleware).forRoutes('*');
  }
}
