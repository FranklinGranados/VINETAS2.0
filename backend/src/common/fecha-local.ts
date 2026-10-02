// Fechas de calendario en la hora LOCAL de la planta, no la del servidor.
//
// ¿Por qué? En Docker el servidor corre en UTC: a partir de las 18:00 de
// Guatemala (UTC−6), new Date() ya es "mañana" en UTC, y una viñeta hecha a
// las 19:00 contaría en el día (o la semana) equivocada. Intl.DateTimeFormat
// con timeZone calcula la fecha local usando los datos de zonas horarias que
// trae Node (ICU), sin depender de la configuración del sistema operativo.
//
// La zona se puede cambiar con la variable de entorno ZONA_HORARIA.
const ZONA = process.env.ZONA_HORARIA ?? 'America/Guatemala';

// Hoy en la zona local, como "AAAA-MM-DD". (El formato en-CA ya es AAAA-MM-DD.)
export function hoyLocal(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Año en curso en la zona local (periodo por defecto).
export function anioActual(): number {
  return Number(hoyLocal().slice(0, 4));
}

// "AAAA-MM-DD" → Date a medianoche UTC: así guarda Prisma las columnas DATE,
// y así se puede comparar contra vinetas.fecha sin corrimientos de zona.
export function fechaDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

// Corte semanal: el JUEVES anterior a hoy (criterio del dashboard de
// Rutinas que ya usa la planta). "Esta semana" = después del corte hasta hoy.
// Si hoy es jueves, el corte es el jueves de la semana pasada (hace 7 días).
export function corteSemanal(hoyYmd: string): string {
  const JUEVES = 4; // getUTCDay(): 0 = domingo … 4 = jueves
  const hoy = fechaDate(hoyYmd);
  const diasDesdeJueves = (hoy.getUTCDay() - JUEVES + 7) % 7 || 7;
  hoy.setUTCDate(hoy.getUTCDate() - diasDesdeJueves);
  return hoy.toISOString().slice(0, 10);
}
