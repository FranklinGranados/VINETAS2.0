import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminActual } from '../auth/admin-actual.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { AdministradoresService } from './administradores.service';
import { CreateAdministradorDto } from './dto/create-administrador.dto';
import { UpdateAdministradorDto } from './dto/update-administrador.dto';

// Todo el módulo exige sesión de administrador: solo un admin registra o
// modifica a otros admins (el PRIMERO se crea con scripts/seed-admin.ts).
// Sin DELETE a propósito: un admin se DESACTIVA, así se conserva quién
// revisó cada viñeta.
@UseGuards(AdminAuthGuard)
@Controller('administradores')
export class AdministradoresController {
  constructor(
    private readonly administradoresService: AdministradoresService,
  ) {}

  @Get()
  findAll() {
    return this.administradoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.administradoresService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdministradorDto) {
    return this.administradoresService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdministradorDto,
    @AdminActual() admin: JwtPayload,
  ) {
    return this.administradoresService.update(id, dto, admin.sub);
  }
}
