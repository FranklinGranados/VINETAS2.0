import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EquiposService } from './equipos.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@Controller('equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  // GET /equipos
  @Get()
  findAll() {
    return this.equiposService.findAll();
  }

  // GET /equipos/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.findOne(id);
  }

  // POST /equipos — abierto: cualquier técnico puede dar de alta un
  // equipo nuevo sin iniciar sesión, igual que en v1 (nuevoEq.cs).
  // @Body() con el tipo CreateEquipoDto le dice al ValidationPipe global
  // qué reglas aplicar sobre el JSON recibido antes de que este método
  // se ejecute.
  @Post()
  create(@Body() dto: CreateEquipoDto) {
    return this.equiposService.create(dto);
  }

  // PATCH /equipos/:id — abierto a propósito: en v1 cualquier técnico
  // podía modificar datos de un equipo (EditarE.cs), incluidos los
  // estados En uso / Hibernación. PATCH (no PUT) porque UpdateEquipoDto acepta actualizaciones parciales:
  // el cliente manda solo los campos que quiere cambiar.
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoDto,
  ) {
    return this.equiposService.update(id, dto);
  }

  // DELETE /equipos/:id — solo administradores.
  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.remove(id);
  }
}
