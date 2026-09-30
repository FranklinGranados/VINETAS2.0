// Utilidades de fechas "de calendario" (sin hora), como las columnas DATE
// de MySQL (vinetas.fecha, vinetas.proximo).
//
// ¿Por qué no usar new Date() directo? El backend manda un DATE como
// "2026-09-29T00:00:00.000Z" = medianoche en UTC. En Guatemala (UTC−6),
// new Date() lo convierte a "28 de septiembre, 18:00" — y al mostrarlo
// con toLocaleDateString() la viñeta salía con UN DÍA MENOS. Tratando la
// fecha como el texto "AAAA-MM-DD" no hay zona horaria de por medio.

// "2026-09-29T00:00:00.000Z" → "2026-09-29"
export function soloFecha(iso: string): string {
  return iso.slice(0, 10);
}

// "2026-09-29T00:00:00.000Z" → "29/09/2026" (formato de la viñeta en v1)
export function formatoDMY(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [anio, mes, dia] = soloFecha(iso).split('-');
  return `${dia}/${mes}/${anio}`;
}

// "2027-09-01T00:00:00.000Z" → "09/2027" (formato de "Próximo" en v1)
export function formatoMY(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [anio, mes] = soloFecha(iso).split('-');
  return `${mes}/${anio}`;
}

// Hoy en la hora LOCAL de la PC, como "AAAA-MM-DD" — es lo que espera un
// <input type="date">. (toISOString() daría la fecha UTC: después de las
// 18:00 en Guatemala ya sería "mañana".)
export function hoyYMD(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Próximo mantenimiento = un año después de la fecha, como en v1
// (fechacali.Value.AddYears(1)). Devuelve "AAAA-MM", lo que usa un
// <input type="month"> — en la viñeta solo se imprime mes/año.
export function proximoDesde(fechaYMD: string): string {
  const [anio, mes] = fechaYMD.split('-');
  return `${Number(anio) + 1}-${mes}`;
}
