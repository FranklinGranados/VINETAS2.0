import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { corteSemanal, fechaDate, hoyLocal } from '../common/fecha-local';

// Instrumento "activo" = en uso y no en hibernación.
const EQUIPO_ACTIVO = {
  en_uso: true,
  hibernacion: false,
} satisfies Prisma.equiposWhereInput;

// Instrumento que CUENTA para el avance del mantenimiento: activo y de un
// área que no esté excluida (Áreas → "Cuenta para el avance"). Es la MISMA
// condición en todos los cálculos de este service, para que el total
// general, los grupos y las áreas cuadren entre sí.
const EQUIPO_CONTABLE = {
  ...EQUIPO_ACTIVO,
  sub_areas: { areas: { excluida_mantenimiento: false } },
} satisfies Prisma.equiposWhereInput;

// Totales de avance de cualquier agrupación (todo, un grupo, un área...).
export interface Avance {
  total: number;
  completados: number;
  pendientes: number;
  porcentaje: number;
  // Lo avanzado "esta semana": desde el corte del jueves anterior hasta hoy.
  semana: { completados: number; porcentaje: number };
}

// Redondeo a un decimal: 33.3%. Sin instrumentos el avance es 0 (no NaN).
const pct = (parte: number, total: number) =>
  total > 0 ? Math.round((parte / total) * 1000) / 10 : 0;

// completadosAlCorte = cuántos ya tenían viñeta al corte del jueves. Lo
// avanzado en la semana es la diferencia, sobre el MISMO total de hoy (para
// comparar manzanas con manzanas, igual que Rutinas).
function avance(
  total: number,
  completados: number,
  completadosAlCorte: number,
): Avance {
  return {
    total,
    completados,
    pendientes: total - completados,
    porcentaje: pct(completados, total),
    semana: {
      completados: completados - completadosAlCorte,
      porcentaje:
        Math.round(
          (pct(completados, total) - pct(completadosAlCorte, total)) * 10,
        ) / 10,
    },
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Replica el "Faltan X de Y" de la barra de estado de v1 para el año
  // actual. (El Inicio ahora usa avance(); esto queda por compatibilidad.)
  async resumenCalibracion() {
    const periodoActual = Number(hoyLocal().slice(0, 4));

    const totalActivos = await this.prisma.equipos.count({
      where: EQUIPO_CONTABLE,
    });

    // distinct: ['equipo_id'] evita contar dos veces un equipo que por
    // algún motivo tuviera más de una viñeta en el mismo periodo.
    const conVinetaEstePeriodo = await this.prisma.vinetas.findMany({
      where: { periodo: periodoActual, equipos: EQUIPO_CONTABLE },
      distinct: ['equipo_id'],
      select: { equipo_id: true },
    });

    const completados = conVinetaEstePeriodo.length;
    const faltan = totalActivos - completados;
    const porcentaje =
      totalActivos > 0 ? (completados / totalActivos) * 100 : 0;

    return {
      periodo: periodoActual,
      totalActivos,
      completados,
      faltan,
      porcentaje: Math.round(porcentaje * 100) / 100,
    };
  }

  // Avance del mantenimiento de un periodo: general, por grupo de trabajo y
  // por área → sub-área, cada uno con lo avanzado en la semana. Alimenta el
  // Inicio.
  //
  // Se trae una vez la lista de instrumentos que cuentan (sub-área + fecha
  // de su PRIMERA viñeta del periodo) y se cuenta en memoria. Con ~2 mil
  // equipos es liviano y evita una consulta por cada área / grupo.
  async avance(periodo: number) {
    const hoy = hoyLocal();
    const corte = corteSemanal(hoy);

    const [equipos, areas, grupos, vinetasHoy, vinetasSemana] =
      await Promise.all([
        this.prisma.equipos.findMany({
          where: EQUIPO_CONTABLE,
          select: {
            sub_area_id: true,
            // La primera viñeta del periodo: si existe, el equipo está
            // completado; su fecha dice si ya lo estaba al corte del jueves.
            vinetas: {
              where: { periodo },
              select: { fecha: true },
              orderBy: { fecha: 'asc' },
              take: 1,
            },
          },
        }),
        this.prisma.areas.findMany({
          include: { sub_areas: { orderBy: { codigo: 'asc' } } },
          orderBy: { codigo: 'asc' },
        }),
        this.prisma.grupos_trabajo.findMany({
          where: { periodo },
          include: {
            grupo_tecnicos: {
              include: { tecnicos: { select: { id: true, nombre: true } } },
              orderBy: { tecnicos: { nombre: 'asc' } },
            },
            grupo_sub_areas: { select: { sub_area_id: true } },
          },
          orderBy: { nombre: 'asc' },
        }),
        // Actividad del día y de la semana: viñetas impresas (todas, no
        // equipos distintos), como los contadores de Rutinas.
        this.prisma.vinetas.count({ where: { fecha: fechaDate(hoy) } }),
        this.prisma.vinetas.count({
          where: { fecha: { gt: fechaDate(corte), lte: fechaDate(hoy) } },
        }),
      ]);

    // Conteo por sub-área.
    type Cuenta = { total: number; completados: number; alCorte: number };
    const porSubArea = new Map<number, Cuenta>();
    for (const equipo of equipos) {
      const cuenta = porSubArea.get(equipo.sub_area_id) ?? {
        total: 0,
        completados: 0,
        alCorte: 0,
      };
      cuenta.total += 1;
      const primera = equipo.vinetas[0];
      if (primera) {
        cuenta.completados += 1;
        // Comparación como texto AAAA-MM-DD: sin zonas horarias de por medio.
        if (primera.fecha.toISOString().slice(0, 10) <= corte)
          cuenta.alCorte += 1;
      }
      porSubArea.set(equipo.sub_area_id, cuenta);
    }
    // Suma el conteo de varias sub-áreas (un área, un grupo, todo...).
    const sumar = (subAreaIds: number[]) => {
      const t = { total: 0, completados: 0, alCorte: 0 };
      for (const id of subAreaIds) {
        const c = porSubArea.get(id);
        if (c) {
          t.total += c.total;
          t.completados += c.completados;
          t.alCorte += c.alCorte;
        }
      }
      return avance(t.total, t.completados, t.alCorte);
    };

    // A qué grupo pertenece cada sub-área (como máximo uno: lo garantiza la BD).
    const grupoDeSubArea = new Map<number, { id: number; nombre: string }>();
    for (const grupo of grupos) {
      for (const asignacion of grupo.grupo_sub_areas) {
        grupoDeSubArea.set(asignacion.sub_area_id, {
          id: grupo.id,
          nombre: grupo.nombre,
        });
      }
    }

    // Las áreas excluidas no se muestran en el desglose ni suman en ningún
    // total (sus equipos ya quedaron fuera por EQUIPO_CONTABLE).
    const areasQueCuentan = areas.filter((a) => !a.excluida_mantenimiento);
    const subAreasQueCuentan = areasQueCuentan.flatMap((a) =>
      a.sub_areas.map((s) => s.id),
    );

    return {
      periodo,
      hoy,
      corteSemanal: corte,
      vinetasHoy,
      vinetasSemana,
      ...sumar(subAreasQueCuentan),
      grupos: grupos.map((grupo) => ({
        id: grupo.id,
        nombre: grupo.nombre,
        tecnicos: grupo.grupo_tecnicos.map((gt) => gt.tecnicos),
        ...sumar(grupo.grupo_sub_areas.map((a) => a.sub_area_id)),
      })),
      // Instrumentos de sub-áreas que nadie tiene asignadas: avisa si quedó
      // algo sin repartir al armar los grupos.
      sinGrupo: sumar(
        subAreasQueCuentan.filter((id) => !grupoDeSubArea.has(id)),
      ),
      areas: areasQueCuentan.map((area) => ({
        id: area.id,
        codigo: area.codigo,
        nombre: area.nombre,
        ...sumar(area.sub_areas.map((s) => s.id)),
        sub_areas: area.sub_areas.map((sub) => ({
          id: sub.id,
          codigo: sub.codigo,
          nombre: sub.nombre,
          grupo: grupoDeSubArea.get(sub.id) ?? null,
          ...sumar([sub.id]),
        })),
      })),
      areasExcluidas: areas
        .filter((a) => a.excluida_mantenimiento)
        .map((a) => ({ id: a.id, codigo: a.codigo, nombre: a.nombre })),
    };
  }

  // Instrumentos activos de una sub-área, cada uno con su viñeta del
  // periodo (si ya la tiene) o null (pendiente). Pendientes primero, que es
  // lo que se busca al revisar el avance.
  async instrumentosDeSubArea(subAreaId: number, periodo: number) {
    const subArea = await this.prisma.sub_areas.findUnique({
      where: { id: subAreaId },
      include: { areas: true },
    });
    if (!subArea)
      throw new NotFoundException(`No existe la sub-área ${subAreaId}`);

    const [equipos, asignacion] = await Promise.all([
      this.prisma.equipos.findMany({
        where: { ...EQUIPO_ACTIVO, sub_area_id: subAreaId },
        include: {
          // La viñeta más reciente del periodo (si hubiera más de una).
          vinetas: {
            where: { periodo },
            orderBy: { nvineta: 'desc' },
            take: 1,
            select: {
              nvineta: true,
              fecha: true,
              tecnicos: { select: { id: true, nombre: true } },
            },
          },
        },
        orderBy: { tag: 'asc' },
      }),
      this.prisma.grupo_sub_areas.findUnique({
        where: { sub_area_id_periodo: { sub_area_id: subAreaId, periodo } },
        include: { grupos_trabajo: { select: { id: true, nombre: true } } },
      }),
    ]);

    const instrumentos = equipos
      .map(({ vinetas, ...equipo }) => ({
        ...equipo,
        vineta: vinetas[0] ?? null,
      }))
      .sort((a, b) => Number(a.vineta !== null) - Number(b.vineta !== null));
    const completados = instrumentos.filter((i) => i.vineta !== null).length;

    return {
      periodo,
      sub_area: {
        id: subArea.id,
        codigo: subArea.codigo,
        nombre: subArea.nombre,
      },
      area: {
        id: subArea.areas.id,
        codigo: subArea.areas.codigo,
        nombre: subArea.areas.nombre,
        excluida_mantenimiento: subArea.areas.excluida_mantenimiento,
      },
      grupo: asignacion?.grupos_trabajo ?? null,
      total: instrumentos.length,
      completados,
      pendientes: instrumentos.length - completados,
      porcentaje: pct(completados, instrumentos.length),
      instrumentos,
    };
  }
}
