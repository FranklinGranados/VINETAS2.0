import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /dashboard/resumen-calibracion
  @Get('resumen-calibracion')
  resumenCalibracion() {
    return this.dashboardService.resumenCalibracion();
  }
}
