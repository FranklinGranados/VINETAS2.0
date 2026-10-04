import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Flex, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { EditOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { administradoresApi } from '../../api/administradores';
import { mensajeDeError } from '../../api/errors';
import { tecnicosApi } from '../../api/tecnicos';
import type { Administrador } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { ErrorDeCarga } from '../../components/ErrorDeCarga';

const { Title, Text } = Typography;

// Qué modal está abierto. Un solo estado (en vez de un booleano por modal)
// porque nunca hay dos abiertos a la vez.
type Dialogo =
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; admin: Administrador }
  | { tipo: 'clave'; admin: Administrador }
  | null;

interface DatosFormValues {
  usuario: string;
  nombre: string;
  password?: string; // solo al crear
  tecnico_id?: number | null;
}

interface ClaveFormValues {
  password: string;
  confirmar: string;
}

// Misma regla que el backend (CreateAdministradorDto): se valida acá para
// avisar antes de enviar, pero la que manda es la del backend.
const REGLAS_USUARIO = [
  { required: true, message: 'Ingresa el usuario' },
  {
    pattern: /^[a-zA-Z0-9._-]{3,50}$/,
    message: 'De 3 a 50 letras, números, punto, guion o guion bajo (sin espacios ni tildes)',
  },
];
const REGLAS_CLAVE = [
  { required: true, message: 'Ingresa la contraseña' },
  { min: 8, message: 'Al menos 8 caracteres' },
];

// Gestión de administradores (solo con sesión de admin, ver RutaAdmin).
// Un admin registra a otros; el primero de todos sale de scripts/seed-admin.ts.
export function AdministradoresPage() {
  const { admin: sesion } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  // Contador como key de los formularios: cada apertura arranca limpia
  // (Form.useForm conserva valores si el componente no se vuelve a montar).
  const [aperturas, setAperturas] = useState(0);
  const abrir = (d: Dialogo) => {
    setAperturas((n) => n + 1);
    setDialogo(d);
  };
  const cerrar = () => setDialogo(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['administradores'],
    queryFn: administradoresApi.getAll,
  });
  const { data: tecnicos } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: tecnicosApi.getAll,
  });

  const crear = useMutation({
    mutationFn: administradoresApi.create,
    onSuccess: (a) => {
      message.success(`Administrador "${a.usuario}" creado`);
      queryClient.invalidateQueries({ queryKey: ['administradores'] });
      cerrar();
    },
    onError: (e) => {
      message.error(mensajeDeError(e));
    },
  });

  // Una sola mutation para editar datos, cambiar clave y activar/desactivar:
  // las tres van al mismo PATCH con distintos campos.
  const actualizar = useMutation({
    mutationFn: (v: { id: number; cambios: Parameters<typeof administradoresApi.update>[1] }) =>
      administradoresApi.update(v.id, v.cambios),
    onSuccess: (a, v) => {
      if (v.cambios.password) message.success(`Contraseña de "${a.usuario}" cambiada`);
      else if (v.cambios.activo !== undefined)
        message.success(a.activo ? `"${a.usuario}" puede volver a iniciar sesión` : `Acceso de "${a.usuario}" desactivado`);
      else message.success(`Administrador "${a.usuario}" actualizado`);
      queryClient.invalidateQueries({ queryKey: ['administradores'] });
      cerrar();
    },
    onError: (e) => {
      message.error(mensajeDeError(e));
    },
  });

  // Técnicos que se pueden vincular: activos y sin otro admin vinculado
  // (el backend igual lo valida: UNIQUE en administradores.tecnico_id).
  const opcionesTecnico = (actual?: Administrador) => {
    const ocupados = new Set(
      (data ?? []).filter((a) => a.id !== actual?.id && a.tecnico_id).map((a) => a.tecnico_id),
    );
    return (tecnicos ?? [])
      .filter((t) => (t.activo && !ocupados.has(t.id)) || t.id === actual?.tecnico_id)
      .map((t) => ({
        value: t.id,
        label: t.cod_empleado ? `${t.nombre} (${t.cod_empleado})` : t.nombre,
      }));
  };

  const columns: ColumnsType<Administrador> = [
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      sorter: (a, b) => a.usuario.localeCompare(b.usuario),
      render: (usuario: string, a) => (
        <Space>
          {usuario}
          {a.id === sesion?.sub && <Tag color="blue">Tú</Tag>}
        </Space>
      ),
    },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Técnico vinculado',
      key: 'tecnico',
      // Vinculado = también saca viñetas con su nombre de técnico.
      render: (_, a) => a.tecnicos?.nombre ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Activo',
      key: 'activo',
      render: (_, a) => (
        <Switch
          checked={a.activo}
          // El backend no deja desactivarse a uno mismo (ni al último
          // activo): acá se deshabilita para no ofrecer algo que fallará.
          disabled={a.id === sesion?.sub}
          title={a.id === sesion?.sub ? 'No puedes desactivar tu propio acceso' : undefined}
          loading={actualizar.isPending && actualizar.variables?.id === a.id && actualizar.variables.cambios.activo !== undefined}
          onChange={(activo) => actualizar.mutate({ id: a.id, cambios: { activo } })}
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, a) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => abrir({ tipo: 'editar', admin: a })}>
            Modificar
          </Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => abrir({ tipo: 'clave', admin: a })}>
            Cambiar contraseña
          </Button>
        </Space>
      ),
    },
  ];

  if (isError) {
    return (
      <ErrorDeCarga
        queCargaba="el listado de administradores"
        error={error}
        onReintentar={() => refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center">
        <Title level={3}>Administradores</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir({ tipo: 'nuevo' })}>
          Nuevo administrador
        </Button>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Inician sesión con su usuario y contraseña. Si además sacan viñetas, vincúlalos a su técnico.
        No se eliminan: se desactivan, para conservar quién revisó cada viñeta.
      </Text>
      <Table<Administrador>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />

      {(dialogo?.tipo === 'nuevo' || dialogo?.tipo === 'editar') && (
        <ModalDatos
          key={aperturas}
          admin={dialogo.tipo === 'editar' ? dialogo.admin : undefined}
          opcionesTecnico={opcionesTecnico(dialogo.tipo === 'editar' ? dialogo.admin : undefined)}
          guardando={crear.isPending || actualizar.isPending}
          onCancelar={cerrar}
          onGuardar={(v) => {
            if (dialogo.tipo === 'nuevo') {
              crear.mutate({
                usuario: v.usuario.trim(),
                nombre: v.nombre.trim(),
                password: v.password ?? '',
                tecnico_id: v.tecnico_id ?? undefined,
              });
            } else {
              actualizar.mutate({
                id: dialogo.admin.id,
                // null al quitar el técnico (allowClear deja undefined).
                cambios: { usuario: v.usuario.trim(), nombre: v.nombre.trim(), tecnico_id: v.tecnico_id ?? null },
              });
            }
          }}
        />
      )}

      {dialogo?.tipo === 'clave' && (
        <ModalClave
          key={aperturas}
          admin={dialogo.admin}
          guardando={actualizar.isPending}
          onCancelar={cerrar}
          onGuardar={(password) => actualizar.mutate({ id: dialogo.admin.id, cambios: { password } })}
        />
      )}
    </>
  );
}

// Crear (con contraseña) o modificar datos (sin contraseña: eso va aparte).
function ModalDatos(props: {
  admin?: Administrador;
  opcionesTecnico: { value: number; label: string }[];
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (v: DatosFormValues) => void;
}) {
  const [form] = Form.useForm<DatosFormValues>();
  const creando = !props.admin;

  return (
    <Modal
      open
      title={creando ? 'Nuevo administrador' : `Modificar administrador "${props.admin?.usuario}"`}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={props.guardando}
      onOk={() => form.submit()}
      onCancel={props.onCancelar}
    >
      <Form<DatosFormValues>
        form={form}
        layout="vertical"
        initialValues={
          props.admin && {
            usuario: props.admin.usuario,
            nombre: props.admin.nombre,
            tecnico_id: props.admin.tecnico_id,
          }
        }
        onFinish={props.onGuardar}
      >
        <Form.Item name="usuario" label="Usuario" rules={REGLAS_USUARIO} extra="Con el que inicia sesión (no distingue mayúsculas).">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true, whitespace: true, message: 'Ingresa el nombre' }]}>
          <Input />
        </Form.Item>
        {creando && (
          <Form.Item name="password" label="Contraseña" rules={REGLAS_CLAVE}>
            {/* new-password: que el navegador no autocomplete la clave de
                quien está creando la cuenta. */}
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        )}
        <Form.Item name="tecnico_id" label="Técnico vinculado (opcional)" extra="Solo si este administrador también saca viñetas.">
          <Select allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="Ninguno" options={props.opcionesTecnico} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ModalClave(props: {
  admin: Administrador;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (password: string) => void;
}) {
  const [form] = Form.useForm<ClaveFormValues>();
  return (
    <Modal
      open
      title={`Cambiar contraseña de "${props.admin.usuario}"`}
      okText="Cambiar"
      cancelText="Cancelar"
      confirmLoading={props.guardando}
      onOk={() => form.submit()}
      onCancel={props.onCancelar}
    >
      <Form<ClaveFormValues> form={form} layout="vertical" onFinish={(v) => props.onGuardar(v.password)}>
        <Form.Item name="password" label="Nueva contraseña" rules={REGLAS_CLAVE}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmar"
          label="Repite la contraseña"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Repite la contraseña' },
            // Validador con acceso al formulario: compara con el otro campo.
            ({ getFieldValue }) => ({
              validator: (_, valor) =>
                !valor || valor === getFieldValue('password')
                  ? Promise.resolve()
                  : Promise.reject(new Error('Las contraseñas no coinciden')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
