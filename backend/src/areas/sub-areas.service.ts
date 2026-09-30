import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { traducirErrorDePrisma } from '../common/prisma-error.util';
import { CreateSubAreaDto } from './dto/create-sub-area.dto';
import { UpdateSubAreaDto } from './dto/update-sub-area.dto';

@Injectable()
export class SubAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const subArea = await this.prisma.sub_areas.findUnique({ where: { id } });

    if (!subArea) {
      throw new NotFoundException(`No existe una sub-área con id ${id}`);
    }

    return subArea;
  }

  async create(dto: CreateSubAreaDto) {
    try {
      return await this.prisma.sub_areas.create({ data: dto });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe una sub-área con código "${dto.codigo}" en esa área`,
        referenciaInvalida: `El área ${dto.area_id} no existe`,
      });
    }
  }

  async update(id: number, dto: UpdateSubAreaDto) {
    await this.findOne(id); // dispara 404 si la sub-área no existe

    try {
      return await this.prisma.sub_areas.update({ where: { id }, data: dto });
    } catch (error) {
      traducirErrorDePrisma(error, {
        duplicado: `Ya existe una sub-área con código "${dto.codigo}" en esa área`,
        referenciaInvalida: `El área ${dto.area_id} no existe`,
      });
    }
  }

  async remove(id: number) {
    await this.findOne(id); // dispara 404 si la sub-área no existe

    try {
      return await this.prisma.sub_areas.delete({ where: { id } });
    } catch (error) {
      traducirErrorDePrisma(error, {
        referenciaBloqueada: `No se puede eliminar la sub-área ${id}: tiene equipos registrados`,
      });
    }
  }
}
