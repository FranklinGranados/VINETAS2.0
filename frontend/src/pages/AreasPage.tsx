import { useQuery } from '@tanstack/react-query';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { areasApi } from '../api/areas';
import type { Area, SubArea } from '../api/types';
import { ErrorDeCarga } from '../components/ErrorDeCarga';

const { Title } = Typography;

// Columnas de la tabla anidada de sub-áreas (expandedRowRender). Es una
// tabla propia, no un render() dentro de una columna, porque cada área
// puede tener varias sub-áreas — necesita su propio Table.
const subAreaColumns: ColumnsType<SubArea> = [
  { title: 'Código', dataIndex: 'codigo', key: 'codigo' },
  { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
];

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
];

export function AreasPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['areas'],
    queryFn: areasApi.getAll,
  });

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
