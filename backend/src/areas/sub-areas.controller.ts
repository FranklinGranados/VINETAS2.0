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
import { SubAreasService } from './sub-areas.service';
import { CreateSubAreaDto } from './dto/create-sub-area.dto';
import { UpdateSubAreaDto } from './dto/update-sub-area.dto';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

// Ruta propia /sub-areas (en vez de anidarla bajo /areas/:id/sub-areas)
// porque cada sub-área tiene su propio id y ya se edita/borra por ese id
// directamente — GET /areas ya trae las sub-áreas incluidas para listar,
// así que este controller solo necesita cubrir la escritura puntual.
@Controller('sub-areas')
export class SubAreasController {
  constructor(private readonly subAreasService: SubAreasService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subAreasService.findOne(id);
  }

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Body() dto: CreateSubAreaDto) {
    return this.subAreasService.create(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubAreaDto,
  ) {
    return this.subAreasService.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subAreasService.remove(id);
  }
}
