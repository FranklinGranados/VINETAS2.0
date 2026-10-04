import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Flex, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined, PrinterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { consultaEquipos } from '../../api/consultas';
import { equiposApi } from '../../api/equipos';
import { mensajeDeError } from '../../api/errors';
import type { Equipo } from '../../api/types';
import { NuevoEquipoModal } from './NuevoEquipoModal';
import { useAuth } from '../../auth/AuthContext';
import { useExigirAdmin } from '../../auth/useExigirAdmin';
import { ErrorDeCarga } from '../../components/ErrorDeCarga';
import { FiltroListado } from '../../components/FiltroListado';
import { useFlujoVineta } from '../vinetas/useFlujoVineta';
import { coincide } from '../../utils/busqueda';

const { Title } = Typography;

// Definición de columnas de la tabla. dataIndex le dice a Ant Design de
// qué propiedad del objeto Equipo sacar el valor; render() lo overridea
// cuando necesitamos algo más que mostrar el texto plano (badges, datos
// anidados de la relación sub_areas, etc.).
//
// La columna TAG no está acá: es un botón (imprime viñeta) y se arma
// dentro del componente, junto con la de acciones.
const columnasDeDatos: ColumnsType<Equipo> = [
  {
    title: 'Descripción',
    dataIndex: 'descripcion',
    key: 'descripcion',
  },
  {
    title: 'Información',
    dataIndex: 'informacion',
    key: 'informacion',
  },
  {
    title: 'Área / Sub-área',
    key: 'ubicacion',
    // sub_areas viene incluido en la respuesta del backend (ver
    // EquiposService.findAll → include: INCLUDE_UBICACION). Como el
    // include es opcional en el tipo, usamos "?." por si algún día se
    // pide sin esa relación.
    render: (_, equipo) =>
      equipo.sub_areas
        ? `${equipo.sub_areas.areas?.nombre} / ${equipo.sub_areas.nombre}`
        : '—',
  },
  {
    title: 'Estado',
    key: 'estado',
    render: (_, equipo) => (
      <>
        {/* Un solo estado a la vez: hibernación y en uso se excluyen
            (ver onValuesChange en EquipoFormModal). */}
        {equipo.hibernacion ? (
          <Tag color="orange">Hibernación</Tag>
        ) : equipo.en_uso ? (
          <Tag color="green">En uso</Tag>
        ) : (
          <Tag color="default">Fuera de uso</Tag>
        )}
        {equipo.interviene_calidad && <Tag color="blue">Calidad</Tag>}
      </>
    ),
  },
];

export function EquiposPage() {
  // "Nuevo equipo": `aperturas` como key para que cada apertura arranque
  // con un formulario limpio (Form.useForm sobrevive entre aperturas si el
  // componente no se vuelve a montar). Modificar va por useFlujoVineta.
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [aperturas, setAperturas] = useState(0);
  const abrirNuevo = () => {
    setAperturas((n) => n + 1);
    setNuevoAbierto(true);
  };
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  // Eliminar requiere sesión de admin (el backend lo protege con
  // AdminAuthGuard). Sin sesión, el botón igual se muestra — con un
  // candado — y al tocarlo lleva al login en vez de fallar con un 401.
  // Crear y modificar son abiertos, como en v1.
  const exigirAdmin = useExigirAdmin();
  // Nueva viñeta → vista previa → imprimir (ver modulos/vinetas/useFlujoVineta).
  const flujoVineta = useFlujoVineta();

  // Filtros del listado: se aplican en el navegador sobre los datos ya
  // cargados (no se vuelve a pedir nada al backend al escribir).
  const [busqueda, setBusqueda] = useState('');
  const [areaId, setAreaId] = useState<number | undefined>();

  // useQuery maneja solo: loading mientras pide, error si falla, y cachea
  // el resultado bajo la key ['equipos'] — si otra pantalla vuelve a pedir
  // useQuery(['equipos']), reusa el cache en vez de repetir el fetch.
  //
  // consultaEquipos(): la misma consulta que precarga el menú al pasar el
  // mouse por "Equipos" (ver api/consultas.ts).
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(consultaEquipos());

  const eliminar = useMutation({
    mutationFn: (equipo: Equipo) => equiposApi.remove(equipo.id),
    onSuccess: (_, equipo) => {
      message.success(`Equipo ${equipo.tag} eliminado`);
      queryClient.invalidateQueries({ queryKey: ['equipos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    // Caso típico: 409 "tiene viñetas registradas" — el backend no deja
    // borrar un equipo con historial (FK desde vinetas). Para sacarlo de
    // circulación se desmarca "En uso" desde Modificar.
    onError: (error) => {
      message.error(mensajeDeError(error));
    },
  });

  // La columna de acciones se arma DENTRO del componente (a diferencia de
  // columnasDeDatos, que es constante) porque necesita flujoVineta y la
  // mutation eliminar, que solo existen acá adentro.
  const columns: ColumnsType<Equipo> = [
    {
      title: 'TAG',
      dataIndex: 'tag',
      key: 'tag',
      sorter: (a, b) => a.tag.localeCompare(b.tag),
      // El TAG es un botón: tocarlo arranca una viñeta nueva para ese
      // equipo, igual que el botón "Imprimir" de la columna de acciones.
      render: (_, equipo) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => flujoVineta.nuevaVineta(equipo)}>
          {equipo.tag}
        </Button>
      ),
    },
    ...columnasDeDatos,
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, equipo) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => flujoVineta.nuevaVineta(equipo)}
          >
            Imprimir
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            // Modificar con "Guardar e imprimir" (ver useFlujoVineta).
            onClick={() => flujoVineta.modificarEquipo(equipo)}
          >
            Modificar
          </Button>
          {/* Sin sesión: disabled evita que se abra la confirmación, y el
              click del botón redirige al login. Con sesión: el flujo
              normal de confirmar y eliminar. */}
          <Popconfirm
            disabled={!admin}
            title={`¿Eliminar el equipo ${equipo.tag}?`}
            description="Esta acción no se puede deshacer."
            okText="Eliminar"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
            onConfirm={() => eliminar.mutate(equipo)}
          >
            <Button
              size="small"
              danger
              title={admin ? 'Eliminar' : 'Eliminar (requiere administrador)'}
              icon={admin ? <DeleteOutlined /> : <LockOutlined />}
              loading={eliminar.isPending && eliminar.variables?.id === equipo.id}
              onClick={() => {
                if (!admin) exigirAdmin(() => {});
              }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Búsqueda en todos los campos de texto del equipo, incluida su ubicación.
  const filtrados = (data ?? []).filter(
    (e) =>
      (areaId === undefined || e.sub_areas?.area_id === areaId) &&
      coincide(busqueda, [
        e.tag,
        e.descripcion,
        e.informacion,
        e.sub_areas?.nombre,
        e.sub_areas?.areas?.nombre,
        e.marca,
        e.modelo,
        e.serie,
        e.eu,
      ]),
  );

  if (isError) {
    return (
      <ErrorDeCarga
        queCargaba="el listado de equipos"
        error={error}
        onReintentar={() => refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center">
        <Title level={3}>Equipos</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={abrirNuevo}
        >
          Nuevo equipo
        </Button>
      </Flex>
      <FiltroListado
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        areaId={areaId}
        onArea={setAreaId}
        placeholder="Buscar por TAG, descripción, información, marca..."
      />
      <Table<Equipo>
        rowKey="id"
        columns={columns}
        dataSource={filtrados}
        loading={isLoading}
        pagination={{ showTotal: (total) => `${total} equipos` }}
        scroll={{ x: 'max-content' }}
      />
      <NuevoEquipoModal key={aperturas} open={nuevoAbierto} onClose={() => setNuevoAbierto(false)} />
      {flujoVineta.modales}
    </>
  );
}
