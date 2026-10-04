// Reglas de formato de los datos de un equipo. Se aplican en el BACKEND
// (EquiposService) para que se cumplan siempre, venga el dato de la
// pantalla, de una importación o de cualquier otro cliente de la API.

// TAG: siempre en mayúsculas y sin espacios en los extremos.
// "  pt-0101 " → "PT-0101"
export function formatoTag(tag: string): string {
  return tag.trim().toLocaleUpperCase('es');
}

// Descripción: cada palabra con mayúscula inicial, como hacía el programa
// anterior (CultureInfo.TextInfo.ToTitleCase de C#):
//   "transmisor de PRESIÓN vapor plc" → "Transmisor De PRESIÓN Vapor Plc"
// Igual que en C#, una palabra escrita TODA en mayúsculas se respeta (suelen
// ser siglas: "PLC", "RTD"). También normaliza espacios dobles.
// (Misma regla que aTitleCase en frontend/src/components/equipoCatalogos.ts.)
export function formatoTitulo(texto: string): string {
  return texto
    .trim()
    .split(/\s+/)
    .map((palabra) =>
      palabra === palabra.toLocaleUpperCase('es')
        ? palabra
        : palabra.charAt(0).toLocaleUpperCase('es') +
          palabra.slice(1).toLocaleLowerCase('es'),
    )
    .join(' ');
}
