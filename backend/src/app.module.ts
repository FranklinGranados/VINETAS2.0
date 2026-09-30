import { Module } from '@nestjs/common';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
