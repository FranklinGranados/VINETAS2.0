import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { traducirErrorDePrisma } from '../common/prisma-error.util';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  // Nest inyecta PrismaService automáticamente acá porque es @Global()
  // (lo marcamos así en prisma.module.ts) — no hace falta importarlo
  // en areas.module.ts para poder usarlo.
  constructor(private readonly prisma: PrismaService) {}

  // Lista todas las áreas, incluyendo sus sub-áreas relacionadas.
  // "include" es el equivalente a un JOIN / eager loading (como el
  // ->with('subAreas') de Eloquent).
  findAll() {
    return this.prisma.areas.findMany({
      include: { sub_areas: true },
      orderBy: { codigo: 'asc' },
    });
  }

  // Busca un área por id. Si no existe, lanza un 404 en vez de devolver null,
  // así el controller no tiene que preocuparse por ese caso.
  async findOne(id: number) {
    const area = await this.prisma.areas.findUnique({
      where: { id },
      include: { sub_areas: true },
    });

    if (!area) {
      throw new NotFoundException(`No existe un área con id ${id}`);
    }

    return area;
  }

  async create(dto: CreateAreaDto) {
    try {
      return await this.prisma.areas.create({ data: dto });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe un área con código "${dto.codigo}"`,
      });
    }
  }

  async update(id: number, dto: UpdateAreaDto) {
    await this.findOne(id); // dispara 404 si el área no existe

    try {
      return await this.prisma.areas.update({ where: { id }, data: dto });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe un área con código "${dto.codigo}"`,
      });
    }
  }

  async remove(id: number) {
    await this.findOne(id); // dispara 404 si el área no existe

    try {
      return await this.prisma.areas.delete({ where: { id } });
    } catch (error) {
      traducirErrorDePrisma(error, {
        referenciaBloqueada: `No se puede eliminar el área ${id}: tiene sub-áreas registradas`,
      });
    }
  }
}
