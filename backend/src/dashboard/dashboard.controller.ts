import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PeriodoQueryDto } from '../common/periodo-query.dto';
import { anioActual } from '../common/fecha-local';

// Todo el dashboard es de solo lectura y abierto (como v1: cualquiera en
// planta veía el "Faltan X de Y").
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /dashboard/resumen-calibracion
  @Get('resumen-calibracion')
  resumenCalibracion() {
    return this.dashboardService.resumenCalibracion();
  }

  // GET /dashboard/avance?periodo=2026
  // Total general + avance por grupo de trabajo + por área y sub-área.
  @Get('avance')
  avance(@Query() query: PeriodoQueryDto) {
    return this.dashboardService.avance(query.periodo ?? anioActual());
  }

  // GET /dashboard/sub-areas/:id/instrumentos?periodo=2026
  // Instrumentos de una sub-área: con viñeta del periodo o pendientes.
  @Get('sub-areas/:id/instrumentos')
  instrumentosDeSubArea(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PeriodoQueryDto,
  ) {
    return this.dashboardService.instrumentosDeSubArea(
      id,
      query.periodo ?? anioActual(),
    );
  }
}
