import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { traducirErrorDePrisma } from '../common/prisma-error.util';
import { CreateTecnicoDto } from './dto/create-tecnico.dto';
import { UpdateTecnicoDto } from './dto/update-tecnico.dto';
import { TECNICO_SELECT_PUBLICO } from './tecnico-public-fields';

// Número de "salt rounds" de bcrypt: cuántas veces se repite el hashing
// internamente. Más alto = más lento de calcular (más resistente a fuerza
// bruta) pero también más lento en cada login. 10 es el estándar razonable
// para una app de este tamaño (no es un banco).
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class TecnicosService {
  constructor(private readonly prisma: PrismaService) {}

  // Nunca se selecciona password_hash en las respuestas — ni al listar ni
  // al leer uno solo. No hay ninguna pantalla que necesite mostrarlo, y
  // exponerlo (aunque esté hasheado) es una superficie de ataque que no
  // vale la pena abrir sin necesidad.
  private static readonly SELECT_SIN_PASSWORD = TECNICO_SELECT_PUBLICO;

  findAll() {
    return this.prisma.tecnicos.findMany({
      orderBy: { nombre: 'asc' },
      select: TecnicosService.SELECT_SIN_PASSWORD,
    });
  }

  async findOne(id: number) {
    const tecnico = await this.prisma.tecnicos.findUnique({
      where: { id },
      select: TecnicosService.SELECT_SIN_PASSWORD,
    });

    if (!tecnico) {
      throw new NotFoundException(`No existe un técnico con id ${id}`);
    }

    return tecnico;
  }

  async create(dto: CreateTecnicoDto) {
    const { password, ...resto } = dto;

    try {
      return await this.prisma.tecnicos.create({
        data: {
          ...resto,
          password_hash: password
            ? await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
            : undefined,
        },
        select: TecnicosService.SELECT_SIN_PASSWORD,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe un técnico con código de empleado ${dto.cod_empleado}`,
      });
    }
  }

  async update(id: number, dto: UpdateTecnicoDto) {
    await this.findOne(id); // dispara 404 si el técnico no existe

    const { password, ...resto } = dto;

    try {
      return await this.prisma.tecnicos.update({
        where: { id },
        data: {
          ...resto,
          password_hash: password
            ? await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
            : undefined,
        },
        select: TecnicosService.SELECT_SIN_PASSWORD,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe un técnico con código de empleado ${dto.cod_empleado}`,
      });
    }
  }

  async remove(id: number) {
    await this.findOne(id); // dispara 404 si el técnico no existe

    try {
      return await this.prisma.tecnicos.delete({
        where: { id },
        select: TecnicosService.SELECT_SIN_PASSWORD,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        referenciaBloqueada: `No se puede eliminar el técnico ${id}: tiene viñetas registradas`,
      });
    }
  }
}
