import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    // MySQL compara el usuario sin distinguir mayúsculas (collation _ci):
    // "FGranados" y "fgranados" son el mismo.
    const admin = await this.prisma.administradores.findUnique({
      where: { usuario: dto.usuario.trim() },
      include: { tecnicos: { select: { activo: true } } },
    });

    // Mismo mensaje genérico si el usuario no existe o si la contraseña no
    // coincide: distinguir esos casos le regalaría a un atacante qué
    // usuarios son válidos.
    const credencialesInvalidas = () =>
      new UnauthorizedException('Usuario o contraseña incorrectos');

    if (!admin) {
      throw credencialesInvalidas();
    }

    const passwordCorrecta = await bcrypt.compare(
      dto.password,
      admin.password_hash,
    );
    if (!passwordCorrecta) {
      throw credencialesInvalidas();
    }

    // Recién con la contraseña correcta se informa el motivo específico
    // (ya no revela nada a quien no conoce la clave). Si está vinculado a un
    // técnico desactivado, también queda sin acceso.
    if (!admin.activo || admin.tecnicos?.activo === false) {
      throw new UnauthorizedException(
        'Este acceso de administrador está desactivado',
      );
    }

    const payload: JwtPayload = {
      sub: admin.id, // id del ADMINISTRADOR (queda como "revisó" en las viñetas)
      nombre: admin.nombre,
      esAdmin: true, // solo los administradores pueden iniciar sesión
    };

    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
