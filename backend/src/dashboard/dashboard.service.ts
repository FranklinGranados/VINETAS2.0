import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Replica el cálculo que el sistema legacy mostraba en la barra de
  // estado del formulario principal ("Faltan X de Y", Z% completado):
  // de los equipos activos (en uso y no hibernados), cuántos ya tienen
  // una viñeta impresa en el periodo (año) actual.
  //
  // Diferencia con el legacy: allá "vinetas" era una tabla que solo
  // contenía el año en curso (los años previos se archivaban en tablas
  // vinetasAAAA aparte), así que un simple COUNT(*) bastaba. Acá
  // "vinetas" tiene todos los años juntos (columna periodo), por eso
  // filtramos explícitamente por periodo = año actual.
  async resumenCalibracion() {
    const periodoActual = new Date().getFullYear();

    const totalActivos = await this.prisma.equipos.count({
      where: { en_uso: true, hibernacion: false },
    });

    // distinct: ['equipo_id'] evita contar dos veces un equipo que por
    // algún motivo tuviera más de una viñeta en el mismo periodo.
    const conVinetaEstePeriodo = await this.prisma.vinetas.findMany({
      where: {
        periodo: periodoActual,
        equipos: { en_uso: true, hibernacion: false },
      },
      distinct: ['equipo_id'],
      select: { equipo_id: true },
    });

    const completados = conVinetaEstePeriodo.length;
    const faltan = totalActivos - completados;
    const porcentaje = totalActivos > 0 ? (completados / totalActivos) * 100 : 0;

    return {
      periodo: periodoActual,
      totalActivos,
      completados,
      faltan,
      porcentaje: Math.round(porcentaje * 100) / 100,
    };
  }
}
