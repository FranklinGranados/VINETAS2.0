import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Switch, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { areasApi } from '../api/areas';
import { mensajeDeError } from '../api/errors';
import type { Area, SubArea } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useExigirAdmin } from '../auth/useExigirAdmin';
import { ErrorDeCarga } from '../components/ErrorDeCarga';

const { Title } = Typography;

// Columnas de la tabla anidada de sub-áreas (expandedRowRender). Es una
// tabla propia, no un render() dentro de una columna, porque cada área
// puede tener varias sub-áreas — necesita su propio Table.
const subAreaColumns: ColumnsType<SubArea> = [
  { title: 'Código', dataIndex: 'codigo', key: 'codigo' },
  { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
];

export function AreasPage() {
  const { admin } = useAuth();
  const exigirAdmin = useExigirAdmin();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

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
      <Title level={3}>Áreas</Title>
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
              columns={subAreaColumns}
              dataSource={area.sub_areas}
              pagination={false}
            />
          ),
          rowExpandable: (area) => (area.sub_areas?.length ?? 0) > 0,
        }}
      />
    </>
  );
}
