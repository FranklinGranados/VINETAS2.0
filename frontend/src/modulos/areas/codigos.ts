// Reglas de los códigos de área / sub-área, iguales a las del backend
// (REGLA_CODIGO en create-sub-area.dto.ts): 2 caracteres, números o letras
// ("01", "1A" de Evaporador No. 1A). Forman el final del TAG (PT-0101).
export const REGLA_CODIGO = /^[0-9A-Z]{2}$/;

export const REGLAS_CODIGO = [
  { required: true, message: 'Indica el código' },
  { pattern: REGLA_CODIGO, message: '2 caracteres: números o letras (ej. 01 o 1A)' },
];

// Sugerencia para el siguiente código: el mayor código NUMÉRICO + 1, con
// cero a la izquierda ("13" → "14"). Los códigos con letras (1A) no
// cuentan. Es solo el valor inicial del campo: se puede cambiar.
export function siguienteCodigo(usados: string[]): string {
  const numeros = usados.filter((c) => /^\d{2}$/.test(c)).map(Number);
  const siguiente = numeros.length ? Math.max(...numeros) + 1 : 1;
  return siguiente > 99 ? '' : String(siguiente).padStart(2, '0');
}
