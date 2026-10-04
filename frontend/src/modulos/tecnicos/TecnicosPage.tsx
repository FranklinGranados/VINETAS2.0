import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Flex, Switch, Table, Typography } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mensajeDeError } from '../../api/errors';
import { tecnicosApi } from '../../api/tecnicos';
import type { Tecnico } from '../../api/types';
import { ErrorDeCarga } from '../../components/ErrorDeCarga';
import { TecnicoFormModal } from './TecnicoFormModal';

const { Title, Text } = Typography;

// Formulario abierto: null = ninguno; { tecnico: undefined } = crear.
type Dialogo = { tecnico?: Tecnico } | null;

// Técnicos (empleados que realizan las viñetas). Solo administradores
// (ruta protegida por RutaAdmin; el backend exige AdminAuthGuard).
export function TecnicosPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  // key de cada apertura: el formulario arranca limpio (ver AreasPage).
  const [aperturas, setAperturas] = useState(0);
  const abrir = (tecnico?: Tecnico) => {
    setAperturas((n) => n + 1);
    setDialogo({ tecnico });
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: tecnicosApi.getAll,
  });

  // Sin "eliminar" a propósito: desactivar conserva las viñetas que hizo
  // (en el backend, borrar a alguien con viñetas daría 409). Un técnico
  // inactivo deja de aparecer en "Realizó" al crear viñetas.
  const cambiarActivo = useMutation({
    mutationFn: (v: { tecnico: Tecnico; activo: boolean }) => tecnicosApi.update(v.tecnico.id, { activo: v.activo }),
    onSuccess: (t) => {
      message.success(t.activo ? `${t.nombre} vuelve a estar activo` : `${t.nombre} desactivado`);
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
    },
    onError: (e) => {
      message.error(mensajeDeError(e));
    },
  });

  const columns: ColumnsType<Tecnico> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: 'Código de empleado',
      dataIndex: 'cod_empleado',
      key: 'cod_empleado',
      render: (valor: number | null) => valor ?? '—',
    },
    {
      // Identificador del empleado en el taller (columna "Pass" de v1).
      title: 'Identificador',
      dataIndex: 'identificador',
      key: 'identificador',
      render: (valor: string | null) => valor ?? '—',
    },
    {
      title: 'Cargo',
      dataIndex: 'cargo',
      key: 'cargo',
      render: (valor: string | null) => valor ?? '—',
    },
    {
      title: 'Activo',
      key: 'activo',
      render: (_, tecnico) => (
        <Switch
          checked={tecnico.activo}
          loading={cambiarActivo.isPending && cambiarActivo.variables?.tecnico.id === tecnico.id}
          onChange={(activo) => cambiarActivo.mutate({ tecnico, activo })}
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, tecnico) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => abrir(tecnico)}>
          Modificar
        </Button>
      ),
    },
  ];

  if (isError) {
    return (
      <ErrorDeCarga
        queCargaba="el listado de técnicos"
        error={error}
        onReintentar={() => refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center">
        <Title level={3}>Técnicos</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir()}>
          Nuevo técnico
        </Button>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Los técnicos inactivos no aparecen al crear viñetas, pero sus viñetas anteriores se conservan.
      </Text>
      <Table<Tecnico>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        scroll={{ x: 'max-content' }}
      />
      {dialogo && <TecnicoFormModal key={aperturas} tecnico={dialogo.tecnico} onClose={() => setDialogo(null)} />}
    </>
  );
}
