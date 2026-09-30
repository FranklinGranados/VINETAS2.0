import { useEffect, useRef, type Ref } from 'react';
import JsBarcode from 'jsbarcode';
// ?inline: Vite incrusta la imagen como data URL ("data:image/png;base64,...")
// dentro del JS en vez de servirla como archivo aparte. Así, al copiar la
// etiqueta al iframe de impresión, el logo ya está ahí — no hay que
// esperar a que se descargue ni resolver rutas relativas.
import logoMti from '../assets/logo-mti-negro.png?inline';
import { formatoDMY, formatoMY } from '../utils/fechas';
import { ETIQUETA_MM, type DatosVineta } from './datosVineta';

// Posiciones medidas sobre la foto de una viñeta impresa por v1
// (media/diseniodevineta.jpeg, ~39 px por mm). Todo en mm desde la esquina
// superior izquierda, con position: absolute — así la etiqueta queda
// idéntica en pantalla y en papel, sin depender de cómo fluya el texto.
const FUENTE = 'Calibri, Carlito, "Arial Narrow", Arial, sans-serif';

const estilos = {
  etiqueta: {
    position: 'relative',
    width: `${ETIQUETA_MM.ancho}mm`,
    height: `${ETIQUETA_MM.alto}mm`,
    background: 'white',
    color: 'black',
    fontFamily: FUENTE,
    lineHeight: 1,
    overflow: 'hidden',
  },
  // Texto de una línea: nunca salta de renglón (movería todo lo de abajo);
  // si no entra, se corta.
  linea: { position: 'absolute', whiteSpace: 'pre', overflow: 'hidden' },
  // Líneas divisorias sobre los 3 renglones grandes.
  regla: { position: 'absolute', left: '0.5mm', right: '0.5mm', borderTop: '0.2mm solid black' },
} satisfies Record<string, React.CSSProperties>;

interface Props {
  datos: DatosVineta;
  // React 19: `ref` se recibe como una prop más (ya no hace falta
  // forwardRef). VinetaImpresion lo usa para copiar la etiqueta al iframe.
  ref?: Ref<HTMLDivElement>;
}

// Diseño de la viñeta, replicado de la etiqueta que imprimía v1
// (Viñeta.rpt de Crystal Reports):
//   ┌──────────────────────────────────────┐
//   │ [logo]            ║║│║║││║║│║║│║║ ║ │  ← código de barras Code 39 del TAG
//   │  MTI              * P T - 0 1 0 1 *  │
//   │      Descripción (centrada, chica)   │
//   │     Información (centrada, mediana)  │
//   │──────────────────────────────────────│
//   │ MMTO FECHA: 19/08/2021               │
//   │──────────────────────────────────────│
//   │ REALIZO:Nombre Técnico               │
//   │──────────────────────────────────────│
//   │ PROX. MMTO:08/2022                   │
//   └──────────────────────────────────────┘
export function EtiquetaVineta({ datos, ref }: Props) {
  const codigoRef = useRef<SVGSVGElement>(null);

  // JsBarcode dibuja el código dentro del <svg> directamente (fuera de
  // React), por eso va en un useEffect: corre después de que el <svg>
  // existe en el DOM, y de nuevo si cambia el TAG.
  useEffect(() => {
    const svg = codigoRef.current;
    if (!svg) return;
    try {
      JsBarcode(svg, datos.tag, {
        format: 'CODE39',
        displayValue: false, // el texto va aparte, con el estilo de v1
        margin: 0,
        height: 50,
        width: 2,
      });
      // JsBarcode fija width/height en px; se reemplazan por mm y se deja
      // que el viewBox (que JsBarcode sí define) estire las barras al área.
      svg.setAttribute('width', '17mm');
      svg.setAttribute('height', '4.9mm');
      svg.setAttribute('preserveAspectRatio', 'none');
    } catch {
      // Code 39 solo admite A-Z, 0-9, espacio y - . $ / + % — un TAG con
      // otro carácter (ej. "ñ") no se puede codificar: se deja el svg
      // vacío y el TAG igual aparece como texto debajo.
      svg.innerHTML = '';
    }
  }, [datos.tag]);

  return (
    <div ref={ref} style={estilos.etiqueta}>
      <img
        src={logoMti}
        alt="MTI"
        style={{ position: 'absolute', top: '0.4mm', left: '2.3mm', height: '4.8mm' }}
      />
      <div style={{ ...estilos.linea, top: '5.5mm', left: '4mm', fontSize: '1.6mm' }}>MTI</div>

      <svg ref={codigoRef} style={{ position: 'absolute', top: '0.3mm', right: '0.6mm' }} />
      {/* Texto legible bajo el código, con asteriscos: así lo muestra el
          estándar Code 39 (el * marca inicio y fin del código). */}
      <div
        style={{
          ...estilos.linea,
          top: '5.4mm',
          right: '0.6mm',
          width: '17mm',
          textAlign: 'center',
          fontSize: '1.3mm',
          letterSpacing: '0.7mm',
        }}
      >
        *{datos.tag}*
      </div>

      <div style={{ ...estilos.linea, top: '8.2mm', left: 0, right: 0, textAlign: 'center', fontSize: '1.7mm' }}>
        {datos.descripcion}
      </div>
      {/* pre (heredado de estilos.linea): respeta los 4 espacios entre
          rango y señal, como sale en la viñeta original. */}
      <div style={{ ...estilos.linea, top: '11.2mm', left: 0, right: 0, textAlign: 'center', fontSize: '2.2mm' }}>
        {datos.informacion}
      </div>

      <div style={{ ...estilos.regla, top: '14.1mm' }} />
      <div style={{ ...estilos.linea, top: '14.8mm', left: '0.5mm', right: '0.5mm', fontSize: '2.5mm' }}>
        MMTO FECHA: {formatoDMY(datos.fecha)}
      </div>
      <div style={{ ...estilos.regla, top: '17.8mm' }} />
      <div style={{ ...estilos.linea, top: '18.3mm', left: '0.5mm', right: '0.5mm', fontSize: '2.5mm' }}>
        REALIZO:{datos.realizo}
      </div>
      <div style={{ ...estilos.regla, top: '20.9mm' }} />
      <div style={{ ...estilos.linea, top: '21.4mm', left: '0.5mm', right: '0.5mm', fontSize: '2.5mm' }}>
        PROX. MMTO:{formatoMY(datos.proximo)}
      </div>
    </div>
  );
}
