import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { traducirErrorDePrisma } from '../common/prisma-error.util';
import { CreateVinetaDto } from './dto/create-vineta.dto';
import { UpdateVinetaDto } from './dto/update-vineta.dto';
import { FindVinetasQueryDto } from './dto/find-vinetas-query.dto';
import { TECNICO_SELECT_PUBLICO } from '../tecnicos/tecnico-public-fields';

// include reutilizable: trae el equipo, el técnico y el encargado que
// revisó (si ya la revisó alguien) relacionados, para que el frontend no
// tenga que pedirlos aparte.
//
// tecnicos/tecnico_revisor usan "select" (no "true" a secas) para excluir
// password_hash — "include: { tecnicos: true }" trae la fila completa tal
// cual, hash incluido, y eso se filtraba sin querer en el JSON de /vinetas.
//
// equipos incluye su sub-área y área: el listado de viñetas se filtra y
// agrupa por área, y sin esto el frontend tendría que cruzar a mano con
// el listado de equipos.
const INCLUDE_RELACIONES = {
  equipos: { include: { sub_areas: { include: { areas: true } } } },
  tecnicos: { select: TECNICO_SELECT_PUBLICO },
  tecnico_revisor: { select: TECNICO_SELECT_PUBLICO },
} satisfies Prisma.vinetasInclude;

@Injectable()
export class VinetasService {
  constructor(private readonly prisma: PrismaService) {}

  // Acepta filtros opcionales por periodo y/o equipo_id (query params).
  // Prisma ignora las claves con valor undefined en "where", así que si
  // no se pasa un filtro, simplemente no se aplica.
  findAll(filtros: FindVinetasQueryDto = {}) {
    return this.prisma.vinetas.findMany({
      where: {
        periodo: filtros.periodo,
        equipo_id: filtros.equipo_id,
      },
      include: INCLUDE_RELACIONES,
      orderBy: { nvineta: 'desc' },
    });
  }

  async findOne(nvineta: number) {
    const vineta = await this.prisma.vinetas.findUnique({
      where: { nvineta },
      include: INCLUDE_RELACIONES,
    });

    if (!vineta) {
      throw new NotFoundException(`No existe una viñeta con nvineta ${nvineta}`);
    }

    return vineta;
  }

  async create(dto: CreateVinetaDto) {
    // Traemos el equipo para copiar su "foto" (tag, descripcion, informacion)
    // dentro de la viñeta. Lo hacemos con un findUnique aparte (en vez de
    // dejar que Prisma falle por FK) porque igual necesitamos leer esos
    // datos para copiarlos.
    const equipo = await this.prisma.equipos.findUnique({
      where: { id: dto.equipo_id },
    });

    if (!equipo) {
      throw new BadRequestException(`El equipo ${dto.equipo_id} no existe`);
    }

    const fecha = new Date(dto.fecha);

    try {
      return await this.prisma.vinetas.create({
        data: {
          equipo_id: dto.equipo_id,
          tecnico_id: dto.tecnico_id,
          // decisión: periodo = año de fecha. getUTCFullYear y NO
          // getFullYear: new Date('2027-01-01') es medianoche UTC, que en
          // la hora local de Guatemala (UTC−6) todavía es 31/12/2026 — una
          // viñeta del 1° de enero quedaba en el periodo anterior.
          periodo: fecha.getUTCFullYear(),
          tag: equipo.tag,
          descripcion: equipo.descripcion,
          informacion: equipo.informacion,
          fecha,
          proximo: dto.proximo ? new Date(dto.proximo) : undefined,
          mantenimiento: dto.mantenimiento,
        },
        // Con relaciones, igual que findAll/findOne: el frontend imprime la
        // viñeta apenas se crea y necesita el nombre del técnico ("Realizó").
        include: INCLUDE_RELACIONES,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        referenciaInvalida: `El técnico ${dto.tecnico_id} no existe`,
      });
    }
  }

  async update(nvineta: number, dto: UpdateVinetaDto) {
    await this.findOne(nvineta); // dispara 404 si la viñeta no existe

    const fecha = dto.fecha ? new Date(dto.fecha) : undefined;

    try {
      return await this.prisma.vinetas.update({
        where: { nvineta },
        data: {
          tecnico_id: dto.tecnico_id,
          fecha,
          // Si se edita fecha, periodo se recalcula para seguir siendo
          // consistente (periodo = año de fecha). Si no se edita fecha,
          // periodo queda undefined y Prisma no lo toca.
          periodo: fecha?.getUTCFullYear(), // UTC: ver nota en create()
          proximo: dto.proximo ? new Date(dto.proximo) : undefined,
          mantenimiento: dto.mantenimiento,
        },
        // Con relaciones, igual que findAll/findOne: el frontend imprime la
        // viñeta apenas se crea y necesita el nombre del técnico ("Realizó").
        include: INCLUDE_RELACIONES,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        referenciaInvalida: `El técnico ${dto.tecnico_id} no existe`,
      });
    }
  }

  async remove(nvineta: number) {
    await this.findOne(nvineta); // dispara 404 si la viñeta no existe

    return this.prisma.vinetas.delete({ where: { nvineta } });
  }

  // Marca la viñeta como revisada por el encargado (admin) que hizo el
  // request — tecnicoRevisorId sale del JWT (ver AdminActual), nunca de
  // algo que el cliente pueda mandar en el body, para que nadie pueda
  // marcar una viñeta como "revisada por" otra persona.
  async marcarRevisada(nvineta: number, tecnicoRevisorId: number) {
    await this.findOne(nvineta); // dispara 404 si la viñeta no existe

    return this.prisma.vinetas.update({
      where: { nvineta },
      data: { tecnico_reviso_id: tecnicoRevisorId },
      include: INCLUDE_RELACIONES,
    });
  }

  // Revierte una revisión marcada por error — cualquier admin puede
  // quitarla, no solo quien la puso (igual que puede editar/borrar
  // cualquier técnico o área, no solo lo que "es suyo").
  async quitarRevision(nvineta: number) {
    await this.findOne(nvineta); // dispara 404 si la viñeta no existe

    return this.prisma.vinetas.update({
      where: { nvineta },
      data: { tecnico_reviso_id: null },
      include: INCLUDE_RELACIONES,
    });
  }
}
