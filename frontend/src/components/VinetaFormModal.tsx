import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Col, Descriptions, Form, Input, Modal, Row, Select } from 'antd';
import { mensajeDeError } from '../api/errors';
import { tecnicosApi } from '../api/tecnicos';
import { vinetasApi } from '../api/vinetas';
import type { Equipo, Vineta } from '../api/types';
import { hoyYMD, proximoDesde, soloFecha } from '../utils/fechas';

// Dos modos en un mismo formulario, porque los campos editables son los
// mismos (fecha, técnico, próximo, mantenimiento — ver UpdateVinetaDto):
// - crear: a partir de un EQUIPO (equivale a nuevaVineta.cs de v1).
// - editar: una VIÑETA existente (equivale a Editar.cs de v1). El equipo
//   y la "foto" TAG/descripción/información no se cambian.
export type ModoVineta = { tipo: 'crear'; equipo: Equipo } | { tipo: 'editar'; vineta: Vineta };

interface Props {
  open: boolean;
  modo: ModoVineta;
  onClose: () => void;
  // Después de CREAR: el padre abre la impresión (v1 imprimía al guardar).
  onCreada: (vineta: Vineta) => void;
  // Si el equipo ya tenía viñeta en el año: reimprimir esa en vez de crear otra.
  onReimprimir: (vineta: Vineta) => void;
}

interface VinetaFormValues {
  fecha: string; // "AAAA-MM-DD" (lo que da <input type="date">)
  proximo?: string; // "AAAA-MM" (lo que da <input type="month">)
  tecnico_id: number;
  mantenimiento?: string;
}

export function VinetaFormModal({ open, modo, onClose, onCreada, onReimprimir }: Props) {
  const [form] = Form.useForm<VinetaFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const creando = modo.tipo === 'crear';

  // Datos que se muestran de solo lectura arriba del formulario.
  const foto = creando
    ? { tag: modo.equipo.tag, descripcion: modo.equipo.descripcion, informacion: modo.equipo.informacion }
    : { tag: modo.vineta.tag, descripcion: modo.vineta.descripcion, informacion: modo.vineta.informacion };
  const equipoId = creando ? modo.equipo.id : modo.vineta.equipo_id;

  const { data: tecnicos, isLoading: cargandoTecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: tecnicosApi.getAll,
    enabled: open,
  });

  // Viñetas previas de este equipo, para avisar si ya tiene una en el
  // mismo año (v1 mostraba un aviso + botón "Reimprimir" en ese caso).
  const { data: previas } = useQuery({
    queryKey: ['vinetas', 'equipo', equipoId],
    queryFn: () => vinetasApi.getAll({ equipo_id: equipoId }),
    enabled: open && creando,
  });
  const fecha = Form.useWatch('fecha', form);
  const anio = fecha ? Number(fecha.slice(0, 4)) : undefined;
  const existente = creando ? previas?.find((v) => v.periodo === anio) : undefined;

  const initialValues: Partial<VinetaFormValues> = creando
    ? { fecha: hoyYMD(), proximo: proximoDesde(hoyYMD()) }
    : {
        fecha: soloFecha(modo.vineta.fecha),
        proximo: modo.vineta.proximo ? soloFecha(modo.vineta.proximo).slice(0, 7) : undefined,
        tecnico_id: modo.vineta.tecnico_id ?? undefined,
        mantenimiento: modo.vineta.mantenimiento ?? '',
      };

  const guardar = useMutation({
    mutationFn: (v: VinetaFormValues) => {
      const datos = {
        fecha: v.fecha,
        tecnico_id: v.tecnico_id,
        // La columna es DATE pero solo importa mes/año: se guarda el día 1.
        proximo: v.proximo ? `${v.proximo}-01` : undefined,
        mantenimiento: v.mantenimiento?.trim() || undefined,
      };
      return creando
        ? vinetasApi.create({ equipo_id: modo.equipo.id, ...datos })
        : vinetasApi.update(modo.vineta.nvineta, datos);
    },
    onSuccess: (vineta) => {
      // Prefijo ['vinetas']: invalida el listado Y las consultas por equipo.
      queryClient.invalidateQueries({ queryKey: ['vinetas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (creando) {
        message.success(`Viñeta N° ${vineta.nvineta} creada`);
        onCreada(vineta);
      } else {
        message.success(`Viñeta N° ${vineta.nvineta} actualizada`);
        onClose();
      }
    },
    onError: (error) => {
      message.error(mensajeDeError(error));
    },
  });

  return (
    <Modal
      open={open}
      title={creando ? `Nueva viñeta — ${foto.tag}` : `Modificar viñeta N° ${modo.vineta.nvineta}`}
      okText={creando ? 'Guardar e imprimir' : 'Guardar'}
      cancelText="Cancelar"
      width={640}
      confirmLoading={guardar.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="TAG">{foto.tag}</Descriptions.Item>
        <Descriptions.Item label="Descripción">{foto.descripcion ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Información">
          <span style={{ whiteSpace: 'pre' }}>{foto.informacion ?? '—'}</span>
        </Descriptions.Item>
      </Descriptions>

      {existente && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Este equipo ya tiene la viñeta N° ${existente.nvineta} del ${existente.periodo}`}
          description="Si solo necesitas otra etiqueta, reimprime la existente en vez de crear una nueva."
          action={
            <Button size="small" onClick={() => onReimprimir(existente)}>
              Reimprimir esa
            </Button>
          }
        />
      )}

      <Form<VinetaFormValues>
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={(v) => guardar.mutate(v)}
        // Igual que v1 (dateTimePicker1_ValueChanged): al cambiar la fecha,
        // "Próximo" se recalcula a un año después. Sigue siendo editable.
        onValuesChange={(cambios: Partial<VinetaFormValues>) => {
          if (cambios.fecha) form.setFieldValue('proximo', proximoDesde(cambios.fecha));
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            {/* <input type="date"> nativo: devuelve "AAAA-MM-DD" directo,
                sin objetos de fecha ni zonas horarias de por medio. */}
            <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: 'Indica la fecha' }]}>
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="proximo" label="Próximo mantenimiento">
              <Input type="month" />
            </Form.Item>
          </Col>
        </Row>

        {/* En v1 "Realizó" solo dejaba guardar si el nombre coincidía con
            un instrumentista existente — acá se elige de la lista. */}
        <Form.Item name="tecnico_id" label="Realizó" rules={[{ required: true, message: 'Elige quién realizó el trabajo' }]}>
          <Select
            loading={cargandoTecnicos}
            placeholder="Técnico"
            showSearch={{ optionFilterProp: 'label' }}
            options={(tecnicos ?? [])
              // Inactivos no se ofrecen, salvo el ya asignado (al editar
              // una viñeta vieja de alguien que ya no está).
              .filter((t) => t.activo || (!creando && t.id === modo.vineta.tecnico_id))
              .map((t) => ({ value: t.id, label: t.nombre }))}
          />
        </Form.Item>

        <Form.Item name="mantenimiento" label="Mantenimiento realizado" extra="No se imprime en la viñeta.">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
