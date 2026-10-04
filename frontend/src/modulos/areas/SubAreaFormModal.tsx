import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Col, Form, Input, Modal, Row } from 'antd';
import { areasApi } from '../../api/areas';
import { mensajeDeError } from '../../api/errors';
import type { Area, SubArea } from '../../api/types';
import { REGLAS_CODIGO, siguienteCodigo } from './codigos';

// crear: agregar una sub-área a un área existente.
// editar: cambiar el nombre (el código no, igual que en las áreas).
export type ModoSubArea = { tipo: 'crear'; area: Area } | { tipo: 'editar'; area: Area; subArea: SubArea };

interface Props {
  modo: ModoSubArea;
  onClose: () => void;
}

interface SubAreaFormValues {
  codigo: string;
  nombre: string;
}

export function SubAreaFormModal({ modo, onClose }: Props) {
  const [form] = Form.useForm<SubAreaFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const creando = modo.tipo === 'crear';

  const guardar = useMutation({
    mutationFn: (v: SubAreaFormValues) =>
      creando
        ? areasApi.crearSubArea({ area_id: modo.area.id, codigo: v.codigo, nombre: v.nombre.trim() })
        : areasApi.actualizarSubArea(modo.subArea.id, { nombre: v.nombre.trim() }),
    onSuccess: (sub) => {
      message.success(creando ? `Sub-área "${sub.nombre}" agregada a ${modo.area.nombre}` : `Sub-área "${sub.nombre}" actualizada`);
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (e) => {
      message.error(mensajeDeError(e));
    },
  });

  return (
    <Modal
      open
      title={creando ? `Nueva sub-área en ${modo.area.nombre}` : `Modificar sub-área ${modo.area.codigo}${modo.subArea.codigo}`}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form<SubAreaFormValues>
        form={form}
        layout="vertical"
        initialValues={
          creando
            ? { codigo: siguienteCodigo((modo.area.sub_areas ?? []).map((s) => s.codigo)) }
            : { codigo: modo.subArea.codigo, nombre: modo.subArea.nombre }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="codigo"
              label="Código"
              rules={REGLAS_CODIGO}
              getValueFromEvent={(e: React.ChangeEvent<HTMLInputElement>) => e.target.value.toUpperCase()}
              // Vista previa del sufijo del TAG que tendrán sus equipos.
              extra={creando ? `Sufijo del TAG: -${modo.area.codigo}…` : 'No se cambia: es parte del TAG de sus equipos'}
            >
              <Input maxLength={2} disabled={!creando} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item name="nombre" label="Nombre" rules={[{ required: true, whitespace: true, message: 'Indica el nombre' }]}>
              <Input autoFocus maxLength={100} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
