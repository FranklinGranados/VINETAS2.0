import type { Area } from '../../api/types';

// Opciones de las listas del formulario "Nuevo equipo", copiadas tal cual
// de los ComboBox del formulario de v1 (viñetas/nuevoEq.Designer.cs).
// En v1 esos ComboBox eran editables (se podía elegir de la lista o
// escribir otro valor) — por eso en el formulario web se usan con
// AutoComplete y no con Select: la lista sugiere, pero no obliga.

const aOpciones = (valores: string[]) => valores.map((value) => ({ value }));

// ── Partes del TAG: [variable][modificador][función]-[área][sub-área] ──
// Ej: P + (nada) + T + "-" + 01 + 02 = "PT-0102"

// comboBox3 — primera letra (variable medida, nomenclatura ISA:
// P = presión, T = temperatura, F = flujo, L = nivel, ...)
export const TAG_VARIABLES = aOpciones(['A', 'C', 'F', 'I', 'L', 'O', 'S', 'T', 'P']);

// comboBox7 — modificador (opcional)
export const TAG_MODIFICADORES = aOpciones(['AF', 'AI', 'E', 'G', 'J', 'M', 'O', 'T', 'W', 'WC']);

// comboBox4 — función (T = transmisor, I = indicador, V = válvula, ...)
export const TAG_FUNCIONES = aOpciones(['C', 'D', 'I', 'S', 'T', 'V']);

// ── Partes de "Información": [rango] [unidad]    [señal] ──
// Ej: "0-100 PSI    4-20 mA"

// comboBox1 — rango
export const INFO_RANGOS = aOpciones([
  '0 -100 %',
  '100 - 0 %',
  'On/Off',
  '0 - 60 Hz',
  'Camara IP',
  'Camara CCTV',
  '0-100',
]);

// comboBox8 — unidad de ingeniería. En v1 algunos textos se veían
// corruptos por la codificación del archivo (°C salía como "�C") — acá
// van corregidos.
export const INFO_UNIDADES = aOpciones([
  "''H2O",
  "''Hg",
  'mmH2O',
  'Amp',
  'RPM',
  'Bar',
  'mBar',
  'PSI',
  'PSIG',
  'Kgf/cm2',
  'Lb/h',
  'Ton/h',
  'Gal/m',
  'M3/h',
  'L/min',
  '°C',
  '°F',
  '%',
  'pH',
  'uS',
  'Ton',
  'Kg',
  'mm',
  '°Brix',
]);

// comboBox2 — tipo de señal
export const INFO_SENALES = aOpciones([
  '4-20 mA',
  '0-10 V',
  '110 VAC',
  '24 VDC',
  '4-20 mA  110 VAC',
  '4-20 mA  24 VDC',
  '440 VAC',
  'PoE',
  'Hart',
]);

// ¿Los equipos de esta sub-área llevan TAG de formato propio (escrito
// completo a mano, sin armar por piezas)? Lo define un administrador en la
// pantalla Áreas (columna sub_areas.tag_especial); antes estaba escrito acá
// a mano (Caldera Mitre y Turbo TGM).
export function tieneTagEspecial(
  areas: Area[] | undefined,
  areaCodigo?: string,
  subAreaCodigo?: string,
): boolean {
  const area = areas?.find((a) => a.codigo === areaCodigo);
  return Boolean(area?.sub_areas?.find((s) => s.codigo === subAreaCodigo)?.tag_especial);
}

// Mismo resultado que CultureInfo.TextInfo.ToTitleCase de C# (v1 lo
// aplicaba a la descripción al guardar): "transmisor de PRESION" →
// "Transmisor De Presion". Igual que en C#, las palabras escritas
// TODO en mayúsculas se respetan (suelen ser siglas: "PLC", "RTD").
export function aTitleCase(texto: string): string {
  return texto
    .trim()
    .split(/\s+/)
    .map((palabra) =>
      palabra === palabra.toUpperCase()
        ? palabra
        : palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase(),
    )
    .join(' ');
}
