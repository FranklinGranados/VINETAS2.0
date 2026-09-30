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
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

// @Controller('areas') define el prefijo de ruta: todos los endpoints
// de esta clase cuelgan de /areas (equivalente a Route::prefix('areas')
// agrupando rutas en Laravel).
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  // GET /areas — lectura abierta, cualquier pantalla la necesita.
  @Get()
  findAll() {
    return this.areasService.findAll();
  }

  // GET /areas/:id
  // ParseIntPipe convierte el parámetro de texto (":id" siempre llega como
  // string en la URL) a number, y devuelve 400 automáticamente si no es
  // un número válido — sin tener que validarlo a mano.
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.areasService.findOne(id);
  }

  // Escritura protegida: la estructura de áreas de la planta cambia poco
  // y solo debería tocarla un administrador (ver AdminAuthGuard).
  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.areasService.remove(id);
  }
}
