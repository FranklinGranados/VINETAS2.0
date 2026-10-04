import type { Vineta } from '../../../api/types';

// Cartucho Brady M6-31-423: 1.5" × 1" (38.1 × 25.4 mm), poliéster blanco.
// Se imprime en horizontal (ancho > alto).
export const ETIQUETA_MM = { ancho: 38.1, alto: 25.4 };

// Los 6 datos que imprimía la viñeta de v1 (parámetros de Viñeta.rpt en
// ImprimirViñeta.cs: Tag, Desc, Inf, Fecha, Realizo, Prox).
export interface DatosVineta {
  tag: string;
  descripcion: string;
  informacion: string;
  fecha: string; // ISO o AAAA-MM-DD
  realizo: string;
  proximo: string | null; // ISO o AAAA-MM-DD
}

// Viñeta guardada (respuesta del backend) → datos a imprimir. Usa la
// "foto" TAG/descripción/información guardada en la viñeta, no los datos
// actuales del equipo: la etiqueta reimpresa sale igual que la original.
export function datosParaImprimir(v: Vineta): DatosVineta {
  return {
    tag: v.tag ?? '',
    descripcion: v.descripcion ?? '',
    informacion: v.informacion ?? '',
    fecha: v.fecha,
    realizo: v.tecnicos?.nombre ?? '',
    proximo: v.proximo,
  };
}
