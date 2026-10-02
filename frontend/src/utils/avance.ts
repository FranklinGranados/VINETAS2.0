// Presentación del avance (colores y orden), compartida por el Inicio y el
// detalle de sub-áreas. Mismos umbrales que el dashboard de Rutinas.

// Verde desde 75 %, amarillo desde 40 %, rojo por debajo.
export function colorAvance(porcentaje: number): string {
  if (porcentaje >= 75) return '#52c41a';
  if (porcentaje >= 40) return '#faad14';
  return '#ff4d4f';
}

// Orden "de más a menos avanzado": por porcentaje y, a igual porcentaje, el
// que tiene más instrumentos primero. Las agrupaciones sin instrumentos
// (0 de 0) quedan al final.
export function porAvance<T extends { porcentaje: number; total: number }>(a: T, b: T): number {
  if ((a.total === 0) !== (b.total === 0)) return a.total === 0 ? 1 : -1;
  return b.porcentaje - a.porcentaje || b.total - a.total;
}
