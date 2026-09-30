import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Module({
  imports: [
    // registerAsync (en vez de JwtModule.register({...}) fijo) porque el
    // secreto sale de ConfigService — así no hay que hardcodear ni el
    // secreto ni el tiempo de expiración en el código.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        // expiresIn en segundos (número), no string tipo "12h": @nestjs/jwt
        // solo acepta strings con un formato muy específico (paquete "ms"),
        // y un número simple es más fácil de leer/configurar sin adivinar
        // ese formato.
        signOptions: { expiresIn: Number(config.getOrThrow('JWT_EXPIRES_IN')) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminAuthGuard],
  // JwtModule se re-exporta para que AdminAuthGuard sea usable desde otros
  // módulos (TecnicosModule, AreasModule) sin que cada uno tenga que
  // configurar su propio JwtModule.
  exports: [JwtModule, AdminAuthGuard],
})
export class AuthModule {}
