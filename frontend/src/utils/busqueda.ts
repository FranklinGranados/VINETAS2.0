// Búsqueda de texto "tolerante" para los listados: sin distinguir
// mayúsculas ni tildes — "presion" encuentra "Presión", "pt-01" encuentra
// "PT-0101".
//
// normalize('NFD') separa cada letra acentuada en letra + tilde
// ("ó" → "o" + "´"), y el replace borra esas tildes sueltas
// (rango Unicode ̀-ͯ = marcas diacríticas combinables).
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// ¿Aparece el término en ALGUNO de los campos? Término vacío = todo coincide.
export function coincide(
  termino: string,
  campos: (string | number | null | undefined)[],
): boolean {
  const buscado = normalizar(termino);
  if (!buscado) return true;
  return campos.some((campo) => campo != null && normalizar(String(campo)).includes(buscado));
}
