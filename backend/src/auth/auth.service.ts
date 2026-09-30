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
    const tecnico = await this.prisma.tecnicos.findUnique({
      where: { cod_empleado: dto.cod_empleado },
    });

    // Mismo mensaje genérico tanto si el código de empleado no existe como
    // si la contraseña no coincide (y también si el técnico existe pero
    // nunca se le configuró password_hash, es decir, no es administrador).
    // Distinguir esos casos en el mensaje de error le regalaría a un
    // atacante qué códigos de empleado son válidos.
    const credencialesInvalidas = () =>
      new UnauthorizedException('Código de empleado o contraseña incorrectos');

    if (!tecnico || !tecnico.password_hash) {
      throw credencialesInvalidas();
    }

    const passwordCorrecta = await bcrypt.compare(
      dto.password,
      tecnico.password_hash,
    );
    if (!passwordCorrecta) {
      throw credencialesInvalidas();
    }

    if (!tecnico.activo) {
      throw new UnauthorizedException('Este técnico está desactivado');
    }

    const payload: JwtPayload = {
      sub: tecnico.id,
      nombre: tecnico.nombre,
      esAdmin: tecnico.es_admin,
    };

    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
