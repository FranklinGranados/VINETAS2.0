import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { traducirErrorDePrisma } from '../common/prisma-error.util';
import { CreateTecnicoDto } from './dto/create-tecnico.dto';
import { UpdateTecnicoDto } from './dto/update-tecnico.dto';
import { TECNICO_SELECT_PUBLICO } from './tecnico-public-fields';

@Injectable()
export class TecnicosService {
  constructor(private readonly prisma: PrismaService) {}

  // Las contraseñas de administrador viven en otra tabla (administradores),
  // pero igual se usa un select explícito: la respuesta solo lleva los
  // campos pensados para mostrarse, aunque mañana se agreguen columnas.
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
    try {
      return await this.prisma.tecnicos.create({
        data: dto,
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

    try {
      return await this.prisma.tecnicos.update({
        where: { id },
        data: dto,
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
        // P2003 al borrar: tiene viñetas, está en un grupo o es administrador.
        referenciaBloqueada: `No se puede eliminar el técnico ${id}: tiene viñetas, grupos o acceso de administrador asociados. Desactívalo en su lugar.`,
      });
    }
  }
}
