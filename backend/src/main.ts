import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: por defecto el navegador bloquea que un sitio en un origen
  // (ej: http://localhost:5173, el frontend Vite) llame a una API en
  // otro origen (http://localhost:3000, este backend).
  //
  // - Producción: solo los orígenes de FRONTEND_URL (se pueden poner
  //   varios separados por coma).
  // - Desarrollo: además, CUALQUIER puerto de localhost/127.0.0.1. Si Vite
  //   arrancaba en otro puerto (5174 porque el 5173 estaba ocupado), el
  //   navegador bloqueaba todo y la app mostraba "No se pudo conectar con
  //   el servidor" aunque el backend estuviera funcionando.
  const origenesPermitidos = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim());
  const esProduccion = process.env.NODE_ENV === 'production';
  const LOCALHOST_CUALQUIER_PUERTO = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

  app.enableCors({
    origin: esProduccion
      ? origenesPermitidos
      : [...origenesPermitidos, LOCALHOST_CUALQUIER_PUERTO],
  });

  // ValidationPipe global: valida el body de CADA request contra el DTO
  // declarado en el controller (los decoradores @IsString(), @IsInt(), etc.).
  //   whitelist: true            → elimina del objeto cualquier propiedad
  //                                 que no esté declarada en el DTO.
  //   forbidNonWhitelisted: true → en vez de solo eliminarla, responde 400
  //                                 si el request trae un campo que no
  //                                 pedimos (ayuda a detectar errores del
  //                                 lado del cliente en vez de ignorarlos).
  //   transform: true            → convierte el JSON plano recibido en una
  //                                 instancia real de la clase DTO, para que
  //                                 los decoradores de class-validator
  //                                 puedan leer los tipos correctamente.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
