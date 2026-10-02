import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { traducirErrorDePrisma } from '../common/prisma-error.util';
import { TECNICO_SELECT_PUBLICO } from '../tecnicos/tecnico-public-fields';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';

// include reutilizable: cada grupo viene con sus integrantes (sin
// password_hash, ver TECNICO_SELECT_PUBLICO) y sus sub-áreas con el área
// padre — lo que necesitan tanto la pantalla de grupos como el dashboard.
const INCLUDE_GRUPO = {
  grupo_tecnicos: {
    include: { tecnicos: { select: TECNICO_SELECT_PUBLICO } },
    orderBy: { tecnicos: { nombre: 'asc' } },
  },
  grupo_sub_areas: {
    include: { sub_areas: { include: { areas: true } } },
  },
} satisfies Prisma.grupos_trabajoInclude;

@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(periodo: number) {
    return this.prisma.grupos_trabajo.findMany({
      where: { periodo },
      include: INCLUDE_GRUPO,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const grupo = await this.prisma.grupos_trabajo.findUnique({
      where: { id },
      include: INCLUDE_GRUPO,
    });
    if (!grupo) throw new NotFoundException(`No existe el grupo ${id}`);
    return grupo;
  }

  async create(dto: CreateGrupoDto) {
    const nombre = dto.nombre.trim();
    try {
      return await this.prisma.grupos_trabajo.create({
        data: { periodo: dto.periodo, nombre },
        include: INCLUDE_GRUPO,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe un grupo llamado "${nombre}" en ${dto.periodo}`,
      });
    }
  }

  async update(id: number, dto: UpdateGrupoDto) {
    const grupo = await this.findOne(id);
    const nombre = dto.nombre.trim();
    try {
      return await this.prisma.grupos_trabajo.update({
        where: { id },
        data: { nombre },
        include: INCLUDE_GRUPO,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe un grupo llamado "${nombre}" en ${grupo.periodo}`,
      });
    }
  }

  // Borrar el grupo borra también sus integrantes y asignaciones
  // (ON DELETE CASCADE en las FK). No borra técnicos, sub-áreas ni equipos.
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.grupos_trabajo.delete({ where: { id } });
  }

  // Reemplaza la lista completa de integrantes del grupo.
  async asignarTecnicos(id: number, tecnicoIds: number[]) {
    const grupo = await this.findOne(id);

    // Regla: un técnico en un solo grupo por periodo. Se verifica ANTES de
    // escribir para dar un mensaje con nombres ("X ya está en el grupo Y").
    // La garantía final es el UNIQUE (tecnico_id, periodo) de la BD.
    const enOtroGrupo = await this.prisma.grupo_tecnicos.findMany({
      where: {
        periodo: grupo.periodo,
        tecnico_id: { in: tecnicoIds },
        grupo_id: { not: id },
      },
      include: { tecnicos: { select: { nombre: true } }, grupos_trabajo: true },
    });
    if (enOtroGrupo.length > 0) {
      const detalle = enOtroGrupo
        .map(
          (g) =>
            `${g.tecnicos.nombre} ya está en el grupo "${g.grupos_trabajo.nombre}"`,
        )
        .join('; ');
      throw new ConflictException(detalle);
    }

    try {
      // $transaction: borrar los integrantes anteriores e insertar los nuevos
      // es una sola operación — si algo falla a la mitad, no queda el grupo
      // vacío ni a medio armar.
      await this.prisma.$transaction([
        this.prisma.grupo_tecnicos.deleteMany({ where: { grupo_id: id } }),
        this.prisma.grupo_tecnicos.createMany({
          data: tecnicoIds.map((tecnico_id) => ({
            grupo_id: id,
            tecnico_id,
            periodo: grupo.periodo,
          })),
        }),
      ]);
    } catch (error) {
      traducirErrorDePrisma(error, {
        // Dos admins guardando a la vez: el chequeo de arriba pasó para los
        // dos, pero el UNIQUE de la BD frena al segundo.
        duplicado:
          'Uno de los técnicos acaba de ser asignado a otro grupo. Recarga e intenta de nuevo.',
        referenciaInvalida: 'Alguno de los técnicos no existe',
      });
    }
    return this.findOne(id);
  }

  // Reemplaza la lista completa de sub-áreas del grupo. Misma lógica que
  // asignarTecnicos: una sub-área pertenece a un solo grupo por periodo.
  async asignarSubAreas(id: number, subAreaIds: number[]) {
    const grupo = await this.findOne(id);

    const enOtroGrupo = await this.prisma.grupo_sub_areas.findMany({
      where: {
        periodo: grupo.periodo,
        sub_area_id: { in: subAreaIds },
        grupo_id: { not: id },
      },
      include: {
        sub_areas: { include: { areas: true } },
        grupos_trabajo: true,
      },
    });
    if (enOtroGrupo.length > 0) {
      const detalle = enOtroGrupo
        .map(
          (g) =>
            `${g.sub_areas.areas.nombre} / ${g.sub_areas.nombre} ya está asignada al grupo "${g.grupos_trabajo.nombre}"`,
        )
        .join('; ');
      throw new ConflictException(detalle);
    }

    try {
      await this.prisma.$transaction([
        this.prisma.grupo_sub_areas.deleteMany({ where: { grupo_id: id } }),
        this.prisma.grupo_sub_areas.createMany({
          data: subAreaIds.map((sub_area_id) => ({
            grupo_id: id,
            sub_area_id,
            periodo: grupo.periodo,
          })),
        }),
      ]);
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado:
          'Una de las sub-áreas acaba de ser asignada a otro grupo. Recarga e intenta de nuevo.',
        referenciaInvalida: 'Alguna de las sub-áreas no existe',
      });
    }
    return this.findOne(id);
  }
}
