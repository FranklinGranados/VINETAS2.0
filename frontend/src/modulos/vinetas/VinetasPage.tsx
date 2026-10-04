import { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { App, Button, Space, Table, Tag, Typography } from 'antd';
import { CheckCircleOutlined, EditOutlined, PrinterOutlined, UndoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { consultaVinetas } from '../../api/consultas';
import { vinetasApi } from '../../api/vinetas';
import { mensajeDeError } from '../../api/errors';
import type { Vineta } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { ErrorDeCarga } from '../../components/ErrorDeCarga';
import { FiltroListado } from '../../components/FiltroListado';
import { useFlujoVineta } from './useFlujoVineta';
import { coincide } from '../../utils/busqueda';
import { formatoDMY, formatoMY } from '../../utils/fechas';

const { Title } = Typography;

export function VinetasPage() {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  // Reimprimir / modificar (ver modulos/vinetas/useFlujoVineta).
  const flujoVineta = useFlujoVineta();

  const [busqueda, setBusqueda] = useState('');
  const [areaId, setAreaId] = useState<number | undefined>();

  // Misma consulta que precarga el menú al pasar el mouse (api/consultas.ts).
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(consultaVinetas());

  // Una mutation para marcar y otra para quitar — así cada botón sabe
  // exactamente cuál viñeta está en curso (mutation.variables) sin tener
  // que armar un estado de "loading" por fila a mano.
  const marcar = useMutation({
    mutationFn: vinetasApi.marcarRevisada,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vinetas'] }),
    // Con llaves: ver nota en EquipoFormModal sobre message.error y onError.
    onError: (error) => {
      message.error(mensajeDeError(error));
    },
  });
  const quitar = useMutation({
    mutationFn: vinetasApi.quitarRevision,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vinetas'] }),
    onError: (error) => {
      message.error(mensajeDeError(error));
    },
  });

  const columns: ColumnsType<Vineta> = [
    {
      title: 'N°',
      dataIndex: 'nvineta',
      key: 'nvineta',
      sorter: (a, b) => a.nvineta - b.nvineta,
    },
    {
      title: 'TAG',
      dataIndex: 'tag',
      key: 'tag',
      sorter: (a, b) => (a.tag ?? '').localeCompare(b.tag ?? ''),
      // TAG/descripción/información son la "foto histórica" del equipo al
      // momento de la inspección (ver VinetasService.create) — se muestran
      // tal como quedaron guardados en la viñeta, no los del equipo actual.
      // El TAG es un botón: tocarlo reimprime la viñeta.
      render: (_, vineta) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => flujoVineta.reimprimir(vineta)}>
          {vineta.tag ?? '—'}
        </Button>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (valor: string | null) => valor ?? '—',
    },
    {
      title: 'Área',
      key: 'area',
      render: (_, vineta) => vineta.equipos?.sub_areas?.areas?.nombre ?? '—',
    },
    {
      title: 'Técnico',
      key: 'tecnico',
      render: (_, vineta) => vineta.tecnicos?.nombre ?? '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: formatoDMY,
      sorter: (a, b) => a.fecha.localeCompare(b.fecha),
    },
    {
      title: 'Próximo',
      dataIndex: 'proximo',
      key: 'proximo',
      render: formatoMY,
    },
    {
      title: 'Periodo',
      dataIndex: 'periodo',
      key: 'periodo',
      sorter: (a, b) => a.periodo - b.periodo,
    },
    {
      // El encargado (admin) llama a inspeccionar el trabajo en sitio
      // cuando el técnico imprime la viñeta; si lo aprueba, la marca acá
      // desde su propia sesión (ver auth/AuthContext.tsx). Cualquiera
      // puede VER si ya fue revisada — solo un admin puede cambiarlo.
      title: 'Revisó',
      key: 'revision',
      render: (_, vineta) => {
        const revisando =
          (marcar.isPending && marcar.variables === vineta.nvineta) ||
          (quitar.isPending && quitar.variables === vineta.nvineta);

        if (!admin) {
          return vineta.admin_revisor ? (
            <Tag color="green">{vineta.admin_revisor.nombre}</Tag>
          ) : (
            <Tag color="orange">Pendiente</Tag>
          );
        }

        return vineta.admin_revisor ? (
          <Button
            size="small"
            icon={<UndoOutlined />}
            loading={revisando}
            onClick={() => quitar.mutate(vineta.nvineta)}
          >
            {vineta.admin_revisor.nombre} — quitar
          </Button>
        ) : (
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={revisando}
            onClick={() => marcar.mutate(vineta.nvineta)}
          >
            Marcar revisada
          </Button>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, vineta) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => flujoVineta.reimprimir(vineta)}
          >
            Reimprimir
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => flujoVineta.modificarVineta(vineta)}>
            Modificar
          </Button>
        </Space>
      ),
    },
  ];

  // Búsqueda en todos los campos visibles, incluidas las fechas en el
  // mismo formato en que se muestran ("29/09/2026", "09/2027").
  const filtradas = (data ?? []).filter(
    (v) =>
      (areaId === undefined || v.equipos?.sub_areas?.area_id === areaId) &&
      coincide(busqueda, [
        v.nvineta,
        v.tag,
        v.descripcion,
        v.informacion,
        v.equipos?.sub_areas?.nombre,
        v.equipos?.sub_areas?.areas?.nombre,
        v.tecnicos?.nombre,
        v.admin_revisor?.nombre,
        formatoDMY(v.fecha),
        formatoMY(v.proximo),
        v.periodo,
        v.mantenimiento,
      ]),
  );

  if (isError) {
    return (
      <ErrorDeCarga
        queCargaba="el listado de viñetas"
        error={error}
        onReintentar={() => refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <>
      <Title level={3}>Viñetas</Title>
      <FiltroListado
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        areaId={areaId}
        onArea={setAreaId}
        placeholder="Buscar por N°, TAG, técnico, fecha, periodo..."
      />
      <Table<Vineta>
        rowKey="nvineta"
        columns={columns}
        dataSource={filtradas}
        loading={isLoading}
        pagination={{ showTotal: (total) => `${total} viñetas` }}
        // La tabla tiene muchas columnas: en pantallas angostas se
        // desplaza horizontalmente en vez de aplastar el texto.
        scroll={{ x: 'max-content' }}
      />
      {flujoVineta.modales}
    </>
  );
}
