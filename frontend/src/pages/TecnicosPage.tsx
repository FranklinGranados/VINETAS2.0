import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { tecnicosApi } from '../api/tecnicos';
import type { Tecnico } from '../api/types';
import { ErrorDeCarga } from '../components/ErrorDeCarga';

const { Title } = Typography;

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
    title: 'Cargo',
    dataIndex: 'cargo',
    key: 'cargo',
    render: (valor: string | null) => valor ?? '—',
  },
  {
    title: 'Estado',
    key: 'activo',
    render: (_, tecnico) =>
      tecnico.activo ? (
        <Tag color="green">Activo</Tag>
      ) : (
        <Tag color="default">Inactivo</Tag>
      ),
  },
];

export function TecnicosPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: tecnicosApi.getAll,
  });

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
      <Title level={3}>Técnicos</Title>
      <Table<Tecnico>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
      />
    </>
  );
}
