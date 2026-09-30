import { useRef } from 'react';
import { Alert, Button, Modal, Space } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { EtiquetaVineta } from './EtiquetaVineta';
import { ETIQUETA_MM, type DatosVineta } from './datosVineta';

interface Props {
  open: boolean;
  datos: DatosVineta | null;
  onClose: () => void;
}

// Vista previa + impresión de una viñeta. Se usa al crear una viñeta
// (imprime al guardar, como v1) y al reimprimir una existente.
export function VinetaImpresion({ open, datos, onClose }: Props) {
  // Referencia al <div> de la etiqueta ya dibujada: al imprimir se copia
  // TAL CUAL a un iframe, así lo que se ve es exactamente lo que sale.
  const etiquetaRef = useRef<HTMLDivElement>(null);

  const imprimir = async () => {
    if (!etiquetaRef.current) return;

    // Se imprime desde un iframe oculto y no con window.print() de la
    // página: así la hoja solo contiene la etiqueta (sin menú ni botones)
    // y @page puede fijar el tamaño de papel = tamaño de la etiqueta.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    const estilo = doc.createElement('style');
    estilo.textContent = `
      @page { size: ${ETIQUETA_MM.ancho}mm ${ETIQUETA_MM.alto}mm; margin: 0; }
      html, body { margin: 0; padding: 0; }
    `;
    doc.head.appendChild(estilo);
    // importNode copia el nodo ya renderizado por React (texto ya escapado,
    // código de barras ya dibujado) — no se arma HTML a mano con los datos.
    doc.body.appendChild(doc.importNode(etiquetaRef.current, true));

    // El logo es una imagen: aunque sea data URL, el navegador la decodifica
    // de forma asíncrona. Sin esta espera, la primera impresión podía salir
    // sin logo.
    await Promise.all(Array.from(doc.images).map((img) => img.decode().catch(() => {})));

    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    // print() bloquea hasta que se cierra el diálogo; después se limpia.
    setTimeout(() => iframe.remove(), 1000);
  };

  return (
    <Modal
      open={open}
      title="Imprimir viñeta"
      onCancel={onClose}
      width={560}
      footer={
        <Space>
          <Button onClick={onClose}>Cerrar</Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={imprimir} disabled={!datos}>
            Imprimir
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Etiqueta Brady M6-31-423 (${ETIQUETA_MM.ancho} × ${ETIQUETA_MM.alto} mm)`}
        description="En el diálogo de impresión elige la Brady M611. Si sale girada, cambia la orientación a Horizontal."
      />

      {datos && (
        // Fondo gris + sombra para distinguir el borde de la etiqueta; zoom
        // solo para verla grande en pantalla (la impresión copia el div
        // interior, a tamaño real).
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24, background: '#e8e8e8', overflow: 'auto' }}>
          <div style={{ zoom: 3, boxShadow: '0 0.5px 2px rgba(0,0,0,0.35)', borderRadius: '1mm', overflow: 'hidden' }}>
            <EtiquetaVineta ref={etiquetaRef} datos={datos} />
          </div>
        </div>
      )}
    </Modal>
  );
}
