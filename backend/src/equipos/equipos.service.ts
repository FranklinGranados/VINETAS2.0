import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { traducirErrorDePrisma } from '../common/prisma-error.util';
import { formatoTag, formatoTitulo } from '../common/formato-texto';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

// include reutilizable: trae la sub-área y, dentro de ella, el área padre.
// Así el JSON de respuesta ya viene con el nombre del área/sub-área sin que
// el frontend tenga que pedirlos aparte.
const INCLUDE_UBICACION = {
  sub_areas: { include: { areas: true } },
} satisfies Prisma.equiposInclude;

@Injectable()
export class EquiposService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.equipos.findMany({
      include: INCLUDE_UBICACION,
      orderBy: { tag: 'asc' },
    });
  }

  async findOne(id: number) {
    const equipo = await this.prisma.equipos.findUnique({
      where: { id },
      include: INCLUDE_UBICACION,
    });

    if (!equipo) {
      throw new NotFoundException(`No existe un equipo con id ${id}`);
    }

    return equipo;
  }

  async create(dto: CreateEquipoDto) {
    const datos = this.aplicarFormato(dto);
    try {
      return await this.prisma.equipos.create({ data: datos });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe un equipo con TAG "${datos.tag}"`,
        referenciaInvalida: `La sub-área ${dto.sub_area_id} no existe`,
      });
    }
  }

  async update(id: number, dto: UpdateEquipoDto) {
    await this.findOne(id); // dispara 404 si el equipo no existe

    const datos = this.aplicarExclusionDeEstados(this.aplicarFormato(dto));
    try {
      return await this.prisma.equipos.update({
        where: { id },
        data: datos,
      });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe un equipo con TAG "${datos.tag}"`,
        referenciaInvalida: `La sub-área ${dto.sub_area_id} no existe`,
      });
    }
  }

  async remove(id: number) {
    await this.findOne(id); // dispara 404 si el equipo no existe

    try {
      return await this.prisma.equipos.delete({ where: { id } });
    } catch (error) {
      traducirErrorDePrisma(error, {
        referenciaBloqueada: `No se puede eliminar el equipo ${id}: tiene viñetas registradas`,
      });
    }
  }

  // Regla de negocio: "en uso" y "hibernación" se excluyen entre sí — un
  // equipo en hibernación no está en uso. El formulario del frontend ya lo
  // respeta, pero la regla vive ACÁ para que se cumpla sin importar quién
  // llame a la API (curl, otro cliente, el job de sincronización...).
  //
  // Como PATCH es parcial, se decide solo con lo que llegó en el request:
  //   { hibernacion: true } → además en_uso = false
  //   { en_uso: true }      → además hibernacion = false (sale de hibernación)
  //   los dos en true       → contradicción: 400, no se adivina cuál quiso
  private aplicarExclusionDeEstados(dto: UpdateEquipoDto): UpdateEquipoDto {
    if (dto.hibernacion === true && dto.en_uso === true) {
      throw new BadRequestException(
        'Un equipo no puede estar en uso y en hibernación a la vez',
      );
    }
    if (dto.hibernacion === true) return { ...dto, en_uso: false };
    if (dto.en_uso === true) return { ...dto, hibernacion: false };
    return dto;
  }

  // Formato obligatorio (ver common/formato-texto.ts): TAG en mayúsculas y
  // descripción con mayúscula inicial en cada palabra. Solo toca los campos
  // que vienen en el request (en un PATCH parcial, el resto no se envía).
  private aplicarFormato<T extends { tag?: string; descripcion?: string }>(
    dto: T,
  ): T {
    return {
      ...dto,
      ...(dto.tag !== undefined && { tag: formatoTag(dto.tag) }),
      ...(dto.descripcion !== undefined && {
        descripcion: formatoTitulo(dto.descripcion),
      }),
    };
  }
}
