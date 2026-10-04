import { useState } from 'react';
import { App } from 'antd';
import { equiposApi } from '../../api/equipos';
import { mensajeDeError } from '../../api/errors';
import type { Equipo, Vineta } from '../../api/types';
import { EquipoFormModal } from '../equipos/EquipoFormModal';
import { VinetaFormModal, type ModoVineta } from './VinetaFormModal';
import { VinetaImpresion } from './impresion/VinetaImpresion';
import { datosParaImprimir, type DatosVineta } from './impresion/datosVineta';

// Junta en un solo lugar el flujo "modificar equipo ⇄ viñeta → impresión"
// que usan Equipos, Viñetas y el Inicio. Cada página llama a estas
// funciones y renderiza `modales`:
//   nuevaVineta(equipo)      → formulario de viñeta → impresión
//   modificarEquipo(equipo)  → modificar → (Guardar e imprimir) → nueva viñeta
//   desde la viñeta, "Modificar equipo" → modificar el equipo
export function useFlujoVineta() {
  const { message } = App.useApp();
  // Modificar equipo: mismo patrón de estado + key que los demás modales.
  const [equipoModal, setEquipoModal] = useState<{ abierto: boolean; equipo: Equipo | null }>({
    abierto: false,
    equipo: null,
  });
  const [aperturasEquipo, setAperturasEquipo] = useState(0);

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

  // Se pide el equipo al servidor antes de abrir: puede venir de una
  // pantalla con datos incompletos (ej. el panel del Inicio no trae la
  // ubicación) o desactualizados, y el formulario necesita lo vigente.
  const modificarEquipo = async (equipo: Equipo) => {
    cerrarForm();
    try {
      const vigente = await equiposApi.getOne(equipo.id);
      setAperturasEquipo((n) => n + 1);
      setEquipoModal({ abierto: true, equipo: vigente });
    } catch (error) {
      message.error(mensajeDeError(error));
    }
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
          onModificarEquipo={modificarEquipo}
        />
      )}
      {equipoModal.equipo && (
        <EquipoFormModal
          key={`equipo-${aperturasEquipo}`}
          open={equipoModal.abierto}
          equipo={equipoModal.equipo}
          onClose={() => setEquipoModal((m) => ({ ...m, abierto: false }))}
          // Guardar e imprimir → la viñeta nueva, ya con el equipo corregido.
          onGuardadoEImprimir={(equipo) => abrirForm({ tipo: 'crear', equipo })}
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
    modificarEquipo,
    reimprimir,
    modales,
  };
}
