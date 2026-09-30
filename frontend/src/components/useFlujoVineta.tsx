import { useState } from 'react';
import type { Equipo, Vineta } from '../api/types';
import { VinetaFormModal, type ModoVineta } from './VinetaFormModal';
import { VinetaImpresion } from './VinetaImpresion';
import { datosParaImprimir, type DatosVineta } from './datosVineta';

// Junta en un solo lugar el flujo "formulario de viñeta → impresión" que
// usan tanto Equipos (imprimir una viñeta nueva) como Viñetas (reimprimir
// o modificar). Cada página llama a estas funciones y renderiza `modales`.
export function useFlujoVineta() {
  // Mismo patrón que EquiposPage: al cerrar se conserva el modo para que
  // el modal siga montado durante la animación; `aperturas` como key para
  // que cada apertura arranque con un formulario limpio.
  const [form, setForm] = useState<{ abierto: boolean; modo: ModoVineta | null }>({
    abierto: false,
    modo: null,
  });
  const [aperturas, setAperturas] = useState(0);
  const [impresion, setImpresion] = useState<{ abierto: boolean; datos: DatosVineta | null }>({
    abierto: false,
    datos: null,
  });

  const abrirForm = (modo: ModoVineta) => {
    setAperturas((n) => n + 1);
    setForm({ abierto: true, modo });
  };
  const cerrarForm = () => setForm((f) => ({ ...f, abierto: false }));

  const reimprimir = (vineta: Vineta) => {
    cerrarForm();
    setImpresion({ abierto: true, datos: datosParaImprimir(vineta) });
  };

  const modales = (
    <>
      {form.modo && (
        <VinetaFormModal
          key={aperturas}
          open={form.abierto}
          modo={form.modo}
          onClose={cerrarForm}
          // v1 imprimía al guardar una viñeta nueva: acá se abre la
          // vista previa de impresión apenas se crea.
          onCreada={reimprimir}
          onReimprimir={reimprimir}
        />
      )}
      <VinetaImpresion
        open={impresion.abierto}
        datos={impresion.datos}
        onClose={() => setImpresion((i) => ({ ...i, abierto: false }))}
      />
    </>
  );

  return {
    nuevaVineta: (equipo: Equipo) => abrirForm({ tipo: 'crear', equipo }),
    modificarVineta: (vineta: Vineta) => abrirForm({ tipo: 'editar', vineta }),
    reimprimir,
    modales,
  };
}
