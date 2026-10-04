import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Flex, Space, Switch, Table, Tooltip, Typography } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { areasApi } from '../../api/areas';
import { mensajeDeError } from '../../api/errors';
import type { Area, SubArea } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useExigirAdmin } from '../../auth/useExigirAdmin';
import { ErrorDeCarga } from '../../components/ErrorDeCarga';
import { AreaFormModal, type ModoArea } from './AreaFormModal';
import { SubAreaFormModal, type ModoSubArea } from './SubAreaFormModal';

const { Title } = Typography;

export function AreasPage() {
  const { admin } = useAuth();
  const exigirAdmin = useExigirAdmin();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Formulario abierto (null = ninguno). `aperturas` como key: cada
  // apertura monta el formulario de cero (Form.useForm conserva valores si
  // el componente no se vuelve a montar).
  const [modoArea, setModoArea] = useState<ModoArea | null>(null);
  const [modoSubArea, setModoSubArea] = useState<ModoSubArea | null>(null);
  const [aperturas, setAperturas] = useState(0);
  const abrirArea = (modo: ModoArea) => {
    setAperturas((n) => n + 1);
    setModoArea(modo);
  };
  const abrirSubArea = (modo: ModoSubArea) => {
    setAperturas((n) => n + 1);
    setModoSubArea(modo);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.getAll,
  });

  // Marca/desmarca un área como excluida del avance del mantenimiento.
  const cambiarExclusion = useMutation({
    mutationFn: (v: { area: Area; excluida: boolean }) =>
      areasApi.update(v.area.id, { excluida_mantenimiento: v.excluida }),
    onSuccess: (area) => {
      message.success(
        area.excluida_mantenimiento
          ? `${area.nombre} ya no cuenta para el avance`
          : `${area.nombre} vuelve a contar para el avance`,
      );
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      // El total y el desglose del Inicio cambian.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => {
      message.error(mensajeDeError(e));
    },
  });

  // Marca/desmarca una sub-área como de "TAG especial" (formato propio,
  // escrito completo a mano en Nuevo/Modificar equipo).
  const cambiarTagEspecial = useMutation({
    mutationFn: (v: { sub: SubArea; especial: boolean }) =>
      areasApi.actualizarSubArea(v.sub.id, { tag_especial: v.especial }),
    onSuccess: (sub) => {
      message.success(
        sub.tag_especial
          ? `${sub.nombre}: el TAG se escribirá completo a mano`
          : `${sub.nombre}: el TAG vuelve a armarse por piezas`,
      );
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (e) => {
      message.error(mensajeDeError(e));
    },
  });

  // Columnas de la tabla anidada de sub-áreas (expandedRowRender). Es una
  // tabla propia, no un render() dentro de una columna, porque cada área
  // puede tener varias sub-áreas — necesita su propio Table.
  const subAreaColumns = (area: Area): ColumnsType<SubArea> => [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo' },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: (
        <Tooltip title="Sus equipos llevan un TAG de formato propio (ej. Caldera Mitre): en Nuevo/Modificar equipo se escribe completo, sin armarlo por piezas.">
          TAG especial
        </Tooltip>
      ),
      key: 'tag_especial',
      render: (_, sub) => (
        <Switch
          size="small"
          checked={sub.tag_especial}
          loading={cambiarTagEspecial.isPending && cambiarTagEspecial.variables?.sub.id === sub.id}
          onChange={(especial) => exigirAdmin(() => cambiarTagEspecial.mutate({ sub, especial }))}
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, sub) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => exigirAdmin(() => abrirSubArea({ tipo: 'editar', area, subArea: sub }))}
        >
          Modificar
        </Button>
      ),
    },
  ];

  // Dentro del componente porque la columna del interruptor usa la sesión
  // (admin) y la mutation, que solo existen acá.
  const columns: ColumnsType<Area> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      sorter: (a, b) => a.codigo.localeCompare(b.codigo),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Sub-áreas',
      key: 'cantidad_sub_areas',
      render: (_, area) => area.sub_areas?.length ?? 0,
    },
    {
      title: (
        <Tooltip title="Si se apaga, los instrumentos de esta área no suman al avance del mantenimiento (Inicio y grupos).">
          Cuenta para el avance
        </Tooltip>
      ),
      key: 'cuenta_avance',
      render: (_, area) => (
        <Switch
          // "Cuenta" es lo contrario de "excluida".
          checked={!area.excluida_mantenimiento}
          loading={cambiarExclusion.isPending && cambiarExclusion.variables?.area.id === area.id}
          // Sin sesión de admin: el click lleva al login en vez de cambiar.
          onChange={(cuenta) =>
            exigirAdmin(() => cambiarExclusion.mutate({ area, excluida: !cuenta }))
          }
          title={admin ? undefined : 'Requiere sesión de administrador'}
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, area) => (
        <Space>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => exigirAdmin(() => abrirSubArea({ tipo: 'crear', area }))}
          >
            Agregar sub-área
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => exigirAdmin(() => abrirArea({ tipo: 'editar', area }))}
          >
            Modificar
          </Button>
        </Space>
      ),
    },
  ];

  if (isError) {
    return (
      <ErrorDeCarga
        queCargaba="el listado de áreas"
        error={error}
        onReintentar={() => refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center">
        <Title level={3}>Áreas</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => exigirAdmin(() => abrirArea({ tipo: 'crear', areasExistentes: data ?? [] }))}
        >
          Nueva área
        </Button>
      </Flex>
      <Table<Area>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        // Son ~13 áreas: todas en una sola página (con la paginación de 10
        // por defecto, las últimas quedaban escondidas en la página 2).
        pagination={false}
        // Cada fila se puede expandir para ver sus sub-áreas — evita una
        // segunda pantalla aparte solo para listarlas.
        expandable={{
          expandedRowRender: (area) => (
            <Table<SubArea>
              rowKey="id"
              columns={subAreaColumns(area)}
              dataSource={area.sub_areas}
              pagination={false}
            />
          ),
          rowExpandable: (area) => (area.sub_areas?.length ?? 0) > 0,
        }}
        scroll={{ x: 'max-content' }}
      />
      {modoArea && <AreaFormModal key={`area-${aperturas}`} modo={modoArea} onClose={() => setModoArea(null)} />}
      {modoSubArea && (
        <SubAreaFormModal key={`sub-${aperturas}`} modo={modoSubArea} onClose={() => setModoSubArea(null)} />
      )}
    </>
  );
}
