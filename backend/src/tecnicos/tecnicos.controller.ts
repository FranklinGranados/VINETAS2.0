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
import { TecnicosService } from './tecnicos.service';
import { CreateTecnicoDto } from './dto/create-tecnico.dto';
import { UpdateTecnicoDto } from './dto/update-tecnico.dto';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@Controller('tecnicos')
export class TecnicosController {
  constructor(private readonly tecnicosService: TecnicosService) {}

  // Lectura abierta: cualquier pantalla (ej. el selector de "Realizó" al
  // crear una viñeta) necesita poder listar técnicos sin que quien la usa
  // tenga que iniciar sesión — igual que en v1.
  @Get()
  findAll() {
    return this.tecnicosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tecnicosService.findOne(id);
  }

  // Escritura protegida: crear/editar/borrar técnicos es gestión de
  // personal, requiere sesión de administrador (ver AdminAuthGuard).
  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: CreateTecnicoDto) {
    return this.tecnicosService.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTecnicoDto) {
    return this.tecnicosService.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tecnicosService.remove(id);
  }
}
