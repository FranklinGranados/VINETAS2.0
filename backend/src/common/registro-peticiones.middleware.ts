import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// Registra en el log cada petición HTTP que recibe el backend, al terminar:
//
//   [HTTP] POST /equipos 201 - 12ms
//   [HTTP] PATCH /equipos/5 409 - 8ms        ← advertencia (4xx)
//   [HTTP] GET /dashboard/avance 500 - 31ms  ← error (5xx)
//
// Sirve para seguir en tiempo real qué está pasando (ver-logs.bat): qué
// pantalla pidió qué, qué falló y qué está lento.
//
// IMPORTANTE: solo se registra método, ruta, código y duración. NUNCA el
// body ni los headers: ahí viajan contraseñas (login) y el token de sesión.
@Injectable()
export class RegistroPeticionesMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const inicio = Date.now();

    // 'finish' se dispara cuando la respuesta ya se envió: recién ahí se
    // conoce el código de estado final y cuánto tardó.
    res.on('finish', () => {
      const linea = `${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - inicio}ms`;
      if (res.statusCode >= 500) this.logger.error(linea);
      else if (res.statusCode >= 400) this.logger.warn(linea);
      else this.logger.log(linea);
    });

    next();
  }
}
