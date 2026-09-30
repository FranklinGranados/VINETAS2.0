import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

// Guard simple hecho a mano en vez de @nestjs/passport: acá solo hay un
// esquema de autenticación (JWT en el header Authorization) y un solo rol
// a validar (esAdmin), así que Passport + su capa de "estrategias" sería
// una abstracción de más para lo que este proyecto necesita — este guard
// hace exactamente lo mismo en menos código, y es más fácil de leer de
// principio a fin.
//
// Se aplica con @UseGuards(AdminAuthGuard) en los controllers que
// requieren sesión de administrador (tecnicos y areas, por ahora).
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extraerToken(request);

    if (!token) {
      throw new UnauthorizedException('Falta el token de sesión');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    // Fuera del try/catch a propósito: si esto lanzara dentro, el catch de
    // arriba lo taparía con el mensaje genérico de "sesión inválida".
    if (!payload.esAdmin) {
      throw new UnauthorizedException('Esta acción requiere permisos de administrador');
    }

    // Queda disponible como request.admin en el controller/service si en
    // el futuro se necesita (ej. auditoría de quién hizo el cambio).
    (request as Request & { admin: JwtPayload }).admin = payload;
    return true;
  }

  private extraerToken(request: Request): string | undefined {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' ? token : undefined;
  }
}
