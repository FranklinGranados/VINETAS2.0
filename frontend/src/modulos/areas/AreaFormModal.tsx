import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Col, Divider, Form, Input, Modal, Row, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { areasApi } from '../../api/areas';
import { mensajeDeError } from '../../api/errors';
import type { Area } from '../../api/types';
import { REGLAS_CODIGO, siguienteCodigo } from './codigos';

const { Text } = Typography;

// crear: código + nombre + sub-áreas iniciales (opcional).
// editar: solo el nombre (ver por qué el código no se cambia, abajo).
export type ModoArea = { tipo: 'crear'; areasExistentes: Area[] } | { tipo: 'editar'; area: Area };

interface Props {
  modo: ModoArea;
  onClose: () => void;
}

interface AreaFormValues {
  codigo: string;
  nombre: string;
  sub_areas?: { codigo: string; nombre: string }[];
}

// Los códigos se escriben en mayúsculas al teclearlos ("1a" → "1A").
const aMayusculas = (e: React.ChangeEvent<HTMLInputElement>) => e.target.value.toUpperCase();

export function AreaFormModal({ modo, onClose }: Props) {
  const [form] = Form.useForm<AreaFormValues>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const creando = modo.tipo === 'crear';

  const guardar = useMutation({
    mutationFn: (v: AreaFormValues) =>
      creando
        ? areasApi.create({
            codigo: v.codigo,
            nombre: v.nombre.trim(),
            sub_areas: (v.sub_areas ?? []).map((s) => ({ codigo: s.codigo, nombre: s.nombre.trim() })),
          })
        : areasApi.update(modo.area.id, { nombre: v.nombre.trim() }),
    onSuccess: (area) => {
      message.success(creando ? `Área "${area.nombre}" creada` : `Área "${area.nombre}" actualizada`);
      // ['areas'] lo usan esta pantalla, los formularios de equipos y los
      // filtros; ['dashboard'] muestra las áreas en el Inicio.
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
      title={creando ? 'Nueva área' : `Modificar área ${modo.area.codigo}`}
      okText="Guardar"
      cancelText="Cancelar"
      width={620}
      confirmLoading={guardar.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form<AreaFormValues>
        form={form}
        layout="vertical"
        initialValues={
          creando
            ? { codigo: siguienteCodigo(modo.areasExistentes.map((a) => a.codigo)), sub_areas: [] }
            : { codigo: modo.area.codigo, nombre: modo.area.nombre }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="codigo"
              label="Código"
              rules={REGLAS_CODIGO}
              getValueFromEvent={aMayusculas}
              // El código es el comienzo del sufijo de los TAG (PT-0101 →
              // área 01): cambiarlo dejaría a los equipos existentes con
              // un TAG que ya no coincide con su área.
              extra={creando ? 'Inicio del sufijo del TAG' : 'No se cambia: es parte del TAG de sus equipos'}
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

        {creando && (
          <>
            <Divider titlePlacement="start" plain>
              Sub-áreas (opcional)
            </Divider>
            {/* Form.List: lista dinámica de campos. Cada fila es un objeto
                { codigo, nombre } dentro de "sub_areas"; add/remove agregan
                o quitan filas y antd mantiene los valores alineados. */}
            <Form.List name="sub_areas">
              {(filas, { add, remove }) => (
                <>
                  {filas.map((fila) => (
                    <Row gutter={8} key={fila.key} align="top">
                      <Col span={6}>
                        <Form.Item name={[fila.name, 'codigo']} rules={REGLAS_CODIGO} getValueFromEvent={aMayusculas}>
                          <Input placeholder="Código" maxLength={2} />
                        </Form.Item>
                      </Col>
                      <Col flex="auto">
                        <Form.Item
                          name={[fila.name, 'nombre']}
                          rules={[{ required: true, whitespace: true, message: 'Indica el nombre' }]}
                        >
                          <Input placeholder="Nombre de la sub-área" maxLength={100} />
                        </Form.Item>
                      </Col>
                      <Col>
                        <Button icon={<DeleteOutlined />} onClick={() => remove(fila.name)} title="Quitar" />
                      </Col>
                    </Row>
                  ))}
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => {
                      // Sugerir el siguiente código según las filas ya escritas.
                      const usados = (form.getFieldValue('sub_areas') ?? []).map((s?: { codigo?: string }) => s?.codigo ?? '');
                      add({ codigo: siguienteCodigo(usados), nombre: '' });
                    }}
                  >
                    Agregar sub-área
                  </Button>
                  <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    También se pueden agregar después, desde la fila del área.
                  </Text>
                </>
              )}
            </Form.List>
          </>
        )}
      </Form>
    </Modal>
  );
}
