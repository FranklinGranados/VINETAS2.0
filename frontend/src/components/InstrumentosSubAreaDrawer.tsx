import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Drawer, Progress, Segmented, Space, Table, Tag, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { dashboardApi } from '../api/dashboard';
import type { InstrumentoConVineta } from '../api/types';
import { formatoDMY } from '../utils/fechas';
import { colorAvance } from '../utils/avance';
import { ErrorDeCarga } from './ErrorDeCarga';

interface Props {
  // null = cerrado.
  subAreaId: number | null;
  periodo: number;
  onClose: () => void;
  // Imprimir la viñeta de un instrumento pendiente (abre el flujo de
  // nueva viñeta, el mismo que en la pantalla de Equipos).
  onImprimir: (instrumento: InstrumentoConVineta) => void;
}

type Filtro = 'todos' | 'pendientes' | 'vinetados';

// Panel lateral con los instrumentos de una sub-área: cuáles ya tienen
// viñeta en la temporada y cuáles faltan.
export function InstrumentosSubAreaDrawer({ subAreaId, periodo, onClose, onImprimir }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');

  // queryKey bajo el prefijo 'dashboard': al crear una viñeta, el
  // formulario invalida ['dashboard'] y esta lista se refresca sola.
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'sub-area', subAreaId, periodo],
    queryFn: () => dashboardApi.instrumentosDeSubArea(subAreaId!, periodo),
    enabled: subAreaId !== null,
  });

  const instrumentos = (data?.instrumentos ?? []).filter((i) =>
    filtro === 'todos' ? true : filtro === 'pendientes' ? i.vineta === null : i.vineta !== null,
  );

  const columnas: ColumnsType<InstrumentoConVineta> = [
    { title: 'TAG', dataIndex: 'tag', key: 'tag' },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion' },
    {
      title: 'Estado',
      key: 'estado',
      render: (_, i) =>
        i.vineta ? (
          <Tag color="green">
            N° {i.vineta.nvineta} · {formatoDMY(i.vineta.fecha)}
            {i.vineta.tecnicos ? ` · ${i.vineta.tecnicos.nombre}` : ''}
          </Tag>
        ) : (
          <Tag color="orange">Pendiente</Tag>
        ),
    },
    {
      title: '',
      key: 'accion',
      render: (_, i) =>
        i.vineta === null && (
          <Button size="small" type="primary" icon={<PrinterOutlined />} onClick={() => onImprimir(i)}>
            Imprimir
          </Button>
        ),
    },
  ];

  return (
    <Drawer
      open={subAreaId !== null}
      onClose={onClose}
      width={760}
      title={data ? `${data.area.nombre} / ${data.sub_area.nombre}` : 'Instrumentos'}
      extra={data?.grupo && <Tag color="blue">Grupo: {data.grupo.nombre}</Tag>}
    >
      {isError ? (
        <ErrorDeCarga
          queCargaba="los instrumentos"
          error={error}
          onReintentar={() => refetch()}
          reintentando={isFetching}
        />
      ) : (
        <>
          {data && (
            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
              <Typography.Text>
                {data.completados} de {data.total} instrumentos con viñeta en {data.periodo}
              </Typography.Text>
              <Progress percent={data.porcentaje} strokeColor={colorAvance(data.porcentaje)} />
              {data.area.excluida_mantenimiento && (
                <Tag>Esta área no cuenta para el avance del mantenimiento</Tag>
              )}
              <Segmented<Filtro>
                value={filtro}
                onChange={setFiltro}
                options={[
                  { value: 'todos', label: `Todos (${data.total})` },
                  { value: 'pendientes', label: `Pendientes (${data.pendientes})` },
                  { value: 'vinetados', label: `Con viñeta (${data.completados})` },
                ]}
              />
            </Space>
          )}
          <Table<InstrumentoConVineta>
            rowKey="id"
            size="small"
            columns={columnas}
            dataSource={instrumentos}
            loading={isLoading}
            pagination={{ pageSize: 15, hideOnSinglePage: true }}
            locale={{ emptyText: 'Sin instrumentos activos en esta sub-área' }}
          />
        </>
      )}
    </Drawer>
  );
}
