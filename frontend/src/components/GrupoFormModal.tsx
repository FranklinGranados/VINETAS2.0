import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Form, Input, Modal, Select, TreeSelect } from 'antd';
import { areasApi } from '../api/areas';
import { gruposApi } from '../api/grupos';
import { mensajeDeError } from '../api/errors';
import { tecnicosApi } from '../api/tecnicos';
import type { GrupoTrabajo } from '../api/types';

interface Props {
  open: boolean;
  periodo: number;
  // null = crear un grupo nuevo; un grupo = editar ese grupo.
  grupo: GrupoTrabajo | null;
  // Todos los grupos del periodo: para saber qué técnicos y sub-áreas ya
  // están tomados por OTRO grupo y mostrarlos bloqueados.
  gruposDelPeriodo: GrupoTrabajo[];
  onClose: () => void;
}

interface GrupoFormValues {
  nombre: string;
  tecnico_ids: number[];
  sub_area_ids: number[];
}

export function GrupoFormModal({ open, periodo, grupo, gruposDelPeriodo, onClose }: Props) {
  const [form] = Form.useForm<GrupoFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const editando = grupo !== null;

  const { data: tecnicos, isLoading: cargandoTecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: tecnicosApi.getAll,
    enabled: open,
  });
  const { data: areas, isLoading: cargandoAreas } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.getAll,
    enabled: open,
  });

  // Qué grupo (distinto al que se edita) ya tiene cada técnico / sub-área.
  const otrosGrupos = gruposDelPeriodo.filter((g) => g.id !== grupo?.id);
  const grupoDeTecnico = new Map<number, string>();
  const grupoDeSubArea = new Map<number, string>();
  for (const g of otrosGrupos) {
    g.grupo_tecnicos.forEach((gt) => grupoDeTecnico.set(gt.tecnico_id, g.nombre));
    g.grupo_sub_areas.forEach((gs) => grupoDeSubArea.set(gs.sub_area_id, g.nombre));
  }

  const opcionesTecnicos = (tecnicos ?? [])
    .filter((t) => t.activo)
    .map((t) => {
      const otro = grupoDeTecnico.get(t.id);
      return {
        value: t.id,
        label: otro ? `${t.nombre} (en "${otro}")` : t.nombre,
        disabled: Boolean(otro),
      };
    });

  // Árbol área → sub-áreas. Las áreas usan un value de texto ("area-3") para
  // no confundirse con los ids numéricos de las sub-áreas: con
  // showCheckedStrategy SHOW_CHILD el TreeSelect devuelve solo las hojas
  // (sub-áreas), que es lo que se guarda. Marcar un área = marcar todas sus
  // sub-áreas libres; las deshabilitadas (de otro grupo) no se marcan.
  const arbolAreas = (areas ?? []).map((area) => ({
    value: `area-${area.id}`,
    title: `${area.codigo} ${area.nombre}`,
    children: (area.sub_areas ?? []).map((sub) => {
      const otro = grupoDeSubArea.get(sub.id);
      return {
        value: sub.id,
        title: otro ? `${sub.codigo} ${sub.nombre} (de "${otro}")` : `${sub.codigo} ${sub.nombre}`,
        disableCheckbox: Boolean(otro),
      };
    }),
  }));

  const guardar = useMutation({
    // Tres pasos, en orden: crear/renombrar el grupo y después reemplazar
    // sus integrantes y sus sub-áreas (endpoints separados en el backend).
    mutationFn: async (v: GrupoFormValues) => {
      const guardado = editando
        ? await gruposApi.renombrar(grupo.id, v.nombre.trim())
        : await gruposApi.create({ periodo, nombre: v.nombre.trim() });
      await gruposApi.asignarTecnicos(guardado.id, v.tecnico_ids ?? []);
      return gruposApi.asignarSubAreas(guardado.id, v.sub_area_ids ?? []);
    },
    onSuccess: (g) => {
      message.success(editando ? `Grupo "${g.nombre}" actualizado` : `Grupo "${g.nombre}" creado`);
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    // Si falló a mitad de camino (ej. se creó el grupo pero un técnico ya
    // estaba tomado), igual se refresca la lista para mostrar lo que sí quedó.
    onError: (error) => {
      message.error(mensajeDeError(error));
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
    },
  });

  return (
    <Modal
      open={open}
      title={editando ? `Editar grupo "${grupo.nombre}"` : `Nuevo grupo — temporada ${periodo}`}
      okText="Guardar"
      cancelText="Cancelar"
      width={640}
      confirmLoading={guardar.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form<GrupoFormValues>
        form={form}
        layout="vertical"
        initialValues={
          grupo
            ? {
                nombre: grupo.nombre,
                tecnico_ids: grupo.grupo_tecnicos.map((gt) => gt.tecnico_id),
                sub_area_ids: grupo.grupo_sub_areas.map((gs) => gs.sub_area_id),
              }
            : { tecnico_ids: [], sub_area_ids: [] }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        <Form.Item
          name="nombre"
          label="Nombre del grupo"
          rules={[{ required: true, whitespace: true, message: 'Ponle un nombre al grupo' }, { max: 60 }]}
        >
          <Input placeholder="Ej: Calderas y Turbos" />
        </Form.Item>

        <Form.Item
          name="tecnico_ids"
          label="Integrantes"
          extra="Cada técnico puede estar en un solo grupo por temporada."
        >
          <Select
            mode="multiple"
            loading={cargandoTecnicos}
            options={opcionesTecnicos}
            placeholder="Elegir técnicos"
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>

        <Form.Item
          name="sub_area_ids"
          label="Áreas asignadas"
          extra="Marcar un área asigna todas sus sub-áreas. Cada sub-área pertenece a un solo grupo."
        >
          <TreeSelect
            treeData={arbolAreas}
            treeCheckable
            showCheckedStrategy={TreeSelect.SHOW_CHILD}
            loading={cargandoAreas}
            placeholder="Elegir áreas o sub-áreas"
            showSearch
            treeNodeFilterProp="title"
            maxTagCount="responsive"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
