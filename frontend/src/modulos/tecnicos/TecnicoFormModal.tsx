import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Col, Form, Input, InputNumber, Modal, Row } from 'antd';
import { mensajeDeError } from '../../api/errors';
import { tecnicosApi } from '../../api/tecnicos';
import type { Tecnico } from '../../api/types';

interface Props {
  // undefined = crear; un técnico = modificarlo.
  tecnico?: Tecnico;
  onClose: () => void;
}

interface TecnicoFormValues {
  nombre: string;
  cod_empleado?: number | null;
  identificador?: string;
  cargo?: string;
}

// Texto vacío → null al MODIFICAR (vacía el campo en la BD) y → undefined
// al CREAR (no se manda: la columna queda NULL por defecto).
const vacioA = <T,>(valor: string | undefined, siVacio: T) => valor?.trim() || siVacio;

export function TecnicoFormModal({ tecnico, onClose }: Props) {
  const [form] = Form.useForm<TecnicoFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const creando = !tecnico;

  const guardar = useMutation({
    mutationFn: (v: TecnicoFormValues) =>
      creando
        ? tecnicosApi.create({
            nombre: v.nombre.trim(),
            cod_empleado: v.cod_empleado ?? undefined,
            identificador: vacioA(v.identificador, undefined),
            cargo: vacioA(v.cargo, undefined),
          })
        : tecnicosApi.update(tecnico.id, {
            nombre: v.nombre.trim(),
            cod_empleado: v.cod_empleado ?? null,
            identificador: vacioA(v.identificador, null),
            cargo: vacioA(v.cargo, null),
          }),
    onSuccess: (t) => {
      message.success(creando ? `Técnico "${t.nombre}" agregado` : `Técnico "${t.nombre}" actualizado`);
      // ['tecnicos'] alimenta esta tabla y el "Realizó" de las viñetas.
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
      onClose();
    },
    onError: (e) => {
      message.error(mensajeDeError(e));
    },
  });

  return (
    <Modal
      open
      title={creando ? 'Nuevo técnico' : `Modificar técnico "${tecnico.nombre}"`}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardar.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form<TecnicoFormValues>
        form={form}
        layout="vertical"
        initialValues={
          tecnico && {
            nombre: tecnico.nombre,
            cod_empleado: tecnico.cod_empleado,
            identificador: tecnico.identificador ?? '',
            cargo: tecnico.cargo ?? '',
          }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        <Form.Item
          name="nombre"
          label="Nombre completo"
          rules={[{ required: true, whitespace: true, message: 'Indica el nombre' }]}
          // Es el nombre que se imprime en "REALIZO:" de la viñeta.
          extra="Se imprime en la viñeta (REALIZO)."
        >
          <Input autoFocus maxLength={100} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="cod_empleado" label="Código de empleado" extra="Opcional. No se puede repetir.">
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            {/* Columna "Pass" de v1: NO es una contraseña, es el código con
                que los compañeros identifican al técnico en el taller. */}
            <Form.Item name="identificador" label="Identificador" extra="Código en el taller (no es contraseña).">
              <Input maxLength={10} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="cargo" label="Cargo">
          <Input maxLength={50} placeholder="Ej. Instrumentista" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
