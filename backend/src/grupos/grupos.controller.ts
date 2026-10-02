import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { GruposService } from './grupos.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { AsignarSubAreasDto, AsignarTecnicosDto } from './dto/asignar.dto';
import { PeriodoQueryDto } from '../common/periodo-query.dto';
import { anioActual } from '../common/fecha-local';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  // Lectura abierta: el Inicio muestra los grupos y su avance a cualquiera.
  // GET /grupos?periodo=2026
  @Get()
  findAll(@Query() query: PeriodoQueryDto) {
    return this.gruposService.findAll(query.periodo ?? anioActual());
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.findOne(id);
  }

  // Escritura: solo administradores (organizar los grupos de la temporada).
  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: CreateGrupoDto) {
    return this.gruposService.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGrupoDto) {
    return this.gruposService.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.remove(id);
  }

  // PUT (no POST/PATCH) porque reemplaza la lista completa: mandar la misma
  // lista dos veces deja el mismo resultado (idempotente).
  @UseGuards(AdminAuthGuard)
  @Put(':id/tecnicos')
  asignarTecnicos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarTecnicosDto,
  ) {
    return this.gruposService.asignarTecnicos(id, dto.tecnico_ids);
  }

  @UseGuards(AdminAuthGuard)
  @Put(':id/sub-areas')
  asignarSubAreas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarSubAreasDto,
  ) {
    return this.gruposService.asignarSubAreas(id, dto.sub_area_ids);
  }
}
