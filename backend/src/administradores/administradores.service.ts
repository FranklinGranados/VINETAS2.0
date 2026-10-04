import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { traducirErrorDePrisma } from '../common/prisma-error.util';
import { TECNICO_SELECT_PUBLICO } from '../tecnicos/tecnico-public-fields';
import { CreateAdministradorDto } from './dto/create-administrador.dto';
import { UpdateAdministradorDto } from './dto/update-administrador.dto';

// Cuántas rondas de hashing (más = más lento de romper por fuerza bruta, y
// más lento cada login). 10 es el estándar; igual que en seed-admin.ts.
const BCRYPT_SALT_ROUNDS = 10;

// Lo que se devuelve de un administrador: NUNCA password_hash.
const SELECT_ADMIN = {
  id: true,
  usuario: true,
  nombre: true,
  activo: true,
  creado_en: true,
  tecnico_id: true,
  tecnicos: { select: TECNICO_SELECT_PUBLICO },
} satisfies Prisma.administradoresSelect;

@Injectable()
export class AdministradoresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.administradores.findMany({
      select: SELECT_ADMIN,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const admin = await this.prisma.administradores.findUnique({
      where: { id },
      select: SELECT_ADMIN,
    });
    if (!admin) throw new NotFoundException(`No existe el administrador ${id}`);
    return admin;
  }

  async create(dto: CreateAdministradorDto) {
    if (dto.tecnico_id) await this.verificarTecnicoLibre(dto.tecnico_id);
    try {
      return await this.prisma.administradores.create({
        data: {
          usuario: dto.usuario.trim(),
          nombre: dto.nombre.trim(),
          tecnico_id: dto.tecnico_id ?? null,
          password_hash: await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS),
        },
        select: SELECT_ADMIN,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `El usuario "${dto.usuario}" ya existe`,
        referenciaInvalida: `El técnico ${dto.tecnico_id} no existe`,
      });
    }
  }

  // adminActualId: quién hace el cambio (sale del token, ver controller).
  async update(id: number, dto: UpdateAdministradorDto, adminActualId: number) {
    const admin = await this.findOne(id);

    // Protecciones para que nadie deje el sistema sin administradores.
    if (dto.activo === false && admin.activo) {
      if (id === adminActualId) {
        throw new BadRequestException('No puedes desactivar tu propio acceso');
      }
      const activos = await this.prisma.administradores.count({
        where: { activo: true },
      });
      if (activos <= 1) {
        throw new ConflictException(
          'No se puede desactivar al último administrador activo',
        );
      }
    }
    if (dto.tecnico_id) await this.verificarTecnicoLibre(dto.tecnico_id, id);

    // password no es columna: se convierte a password_hash.
    const { password, ...resto } = dto;
    try {
      return await this.prisma.administradores.update({
        where: { id },
        data: {
          ...resto,
          usuario: resto.usuario?.trim(),
          nombre: resto.nombre?.trim(),
          ...(password !== undefined && {
            password_hash: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
          }),
        },
        select: SELECT_ADMIN,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `El usuario "${dto.usuario}" ya existe`,
        referenciaInvalida: `El técnico ${dto.tecnico_id} no existe`,
      });
    }
  }

  // Un técnico puede tener un solo acceso de administrador (UNIQUE en la
  // BD). Se revisa antes para responder con el usuario que ya lo tiene, en
  // vez del 409 genérico de la restricción.
  private async verificarTecnicoLibre(
    tecnicoId: number,
    exceptoAdminId?: number,
  ) {
    const otro = await this.prisma.administradores.findFirst({
      where: { tecnico_id: tecnicoId, id: { not: exceptoAdminId } },
      select: { usuario: true },
    });
    if (otro) {
      throw new ConflictException(
        `Ese técnico ya está vinculado al administrador "${otro.usuario}"`,
      );
    }
  }
}
