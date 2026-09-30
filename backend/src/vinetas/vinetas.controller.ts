import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VinetasService } from './vinetas.service';
import { CreateVinetaDto } from './dto/create-vineta.dto';
import { UpdateVinetaDto } from './dto/update-vineta.dto';
import { FindVinetasQueryDto } from './dto/find-vinetas-query.dto';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminActual } from '../auth/admin-actual.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('vinetas')
export class VinetasController {
  constructor(private readonly vinetasService: VinetasService) {}

  // GET /vinetas
  // GET /vinetas?periodo=2026
  // GET /vinetas?equipo_id=5
  @Get()
  findAll(@Query() query: FindVinetasQueryDto) {
    return this.vinetasService.findAll(query);
  }

  // GET /vinetas/:nvineta
  // Usamos "nvineta" en vez de "id" en la ruta porque es el nombre real
  // de la PK de esta tabla (no hay columna "id" acá).
  @Get(':nvineta')
  findOne(@Param('nvineta', ParseIntPipe) nvineta: number) {
    return this.vinetasService.findOne(nvineta);
  }

  // POST /vinetas
  @Post()
  create(@Body() dto: CreateVinetaDto) {
    return this.vinetasService.create(dto);
  }

  // PATCH /vinetas/:nvineta
  @Patch(':nvineta')
  update(
    @Param('nvineta', ParseIntPipe) nvineta: number,
    @Body() dto: UpdateVinetaDto,
  ) {
    return this.vinetasService.update(nvineta, dto);
  }

  // DELETE /vinetas/:nvineta
  @Delete(':nvineta')
  remove(@Param('nvineta', ParseIntPipe) nvineta: number) {
    return this.vinetasService.remove(nvineta);
  }

  // PATCH /vinetas/:nvineta/revisar
  // Protegido: solo el encargado (admin) que efectivamente inspeccionó el
  // trabajo en sitio marca la viñeta como revisada, desde su propia sesión.
  // El resto de /vinetas queda abierto (cualquier técnico crea/edita sin
  // login) — esta es la única acción de este módulo que exige ser admin.
  @UseGuards(AdminAuthGuard)
  @Patch(':nvineta/revisar')
  marcarRevisada(
    @Param('nvineta', ParseIntPipe) nvineta: number,
    @AdminActual() admin: JwtPayload,
  ) {
    return this.vinetasService.marcarRevisada(nvineta, admin.sub);
  }

  // DELETE /vinetas/:nvineta/revisar — revierte una revisión marcada por error.
  @UseGuards(AdminAuthGuard)
  @Delete(':nvineta/revisar')
  quitarRevision(@Param('nvineta', ParseIntPipe) nvineta: number) {
    return this.vinetasService.quitarRevision(nvineta);
  }
}
