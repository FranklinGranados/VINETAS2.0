import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

// AdminAuthGuard, al validar el token, deja el payload en request.admin
// (ver admin-auth.guard.ts). Este decorador es el equivalente a @Body()
// o @Param() pero para leer ese dato — así un controller puede pedir
// "quién es el admin logueado" con @AdminActual() en vez de tener que
// inyectar @Req() y castear el request a mano cada vez.
//
// Solo tiene sentido usarlo en rutas que ya llevan @UseGuards(AdminAuthGuard)
// — si se usa en una ruta sin el guard, request.admin nunca se llenó y esto
// devuelve undefined.
export const AdminActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { admin: JwtPayload }>();
    return request.admin;
  },
);
