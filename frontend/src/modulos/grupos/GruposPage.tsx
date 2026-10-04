import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Empty, Flex, Popconfirm, Row, Space, Tag, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { areasApi } from '../../api/areas';
import { gruposApi } from '../../api/grupos';
import { mensajeDeError } from '../../api/errors';
import type { Area, GrupoTrabajo } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useExigirAdmin } from '../../auth/useExigirAdmin';
import { ErrorDeCarga } from '../../components/ErrorDeCarga';
import { GrupoFormModal } from './GrupoFormModal';
import { SelectorPeriodo } from '../../components/SelectorPeriodo';

const { Title, Text } = Typography;

// Agrupa las sub-áreas asignadas por área, para mostrarlas compactas:
// "Calderas (completa)" o "Tachos: Tacho N° 1, Tacho N° 2".
function resumenAreas(grupo: GrupoTrabajo, areas: Area[] | undefined): string[] {
  const porArea = new Map<number, string[]>();
  for (const { sub_areas: sub } of grupo.grupo_sub_areas) {
    const lista = porArea.get(sub.area_id) ?? [];
    lista.push(sub.nombre);
    porArea.set(sub.area_id, lista);
  }
  return [...porArea.entries()].map(([areaId, subs]) => {
    const area = areas?.find((a) => a.id === areaId);
    const totalSubAreas = area?.sub_areas?.length ?? 0;
    const nombre = area?.nombre ?? `Área ${areaId}`;
    return subs.length === totalSubAreas ? `${nombre} (completa)` : `${nombre}: ${subs.join(', ')}`;
  });
}

export function GruposPage() {
  const [periodo, setPeriodo] = useState(new Date().getFullYear());
  const { admin } = useAuth();
  const exigirAdmin = useExigirAdmin();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Mismo patrón de modal que EquiposPage: `aperturas` como key para que
  // cada apertura arranque con un formulario limpio, y al cerrar se conserva
  // el grupo para que el modal termine su animación.
  const [modal, setModal] = useState<{ abierto: boolean; grupo: GrupoTrabajo | null }>({
    abierto: false,
    grupo: null,
  });
  const [aperturas, setAperturas] = useState(0);
  const abrirModal = (grupo: GrupoTrabajo | null) =>
    exigirAdmin(() => {
      setAperturas((n) => n + 1);
      setModal({ abierto: true, grupo });
    });

  // queryKey incluye el periodo: cada temporada se cachea por separado.
  const { data: grupos, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['grupos', periodo],
    queryFn: () => gruposApi.getAll(periodo),
  });
  const { data: areas } = useQuery({ queryKey: ['areas'], queryFn: areasApi.getAll });

  const eliminar = useMutation({
    mutationFn: (grupo: GrupoTrabajo) => gruposApi.remove(grupo.id),
    onSuccess: (_, grupo) => {
      message.success(`Grupo "${grupo.nombre}" eliminado`);
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => {
      message.error(mensajeDeError(e));
    },
  });

  if (isError) {
    return (
      <ErrorDeCarga
        queCargaba="los grupos de trabajo"
        error={error}
        onReintentar={() => refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8}>
        <Title level={3} style={{ margin: 0 }}>
          Grupos de trabajo
        </Title>
        <Space wrap>
          <SelectorPeriodo value={periodo} onChange={setPeriodo} />
          <Button
            type="primary"
            icon={admin ? <PlusOutlined /> : <LockOutlined />}
            onClick={() => abrirModal(null)}
          >
            Nuevo grupo
          </Button>
        </Space>
      </Flex>
      <Text type="secondary" style={{ display: 'block', margin: '8px 0 16px' }}>
        Cada temporada los técnicos se organizan en grupos y cada grupo tiene sus áreas asignadas.
        Cualquiera puede imprimir viñetas de cualquier área; la asignación sirve para seguir el avance.
      </Text>

      {!isLoading && grupos?.length === 0 && (
        <Empty description={`No hay grupos armados para la temporada ${periodo}`} />
      )}

      <Row gutter={[16, 16]}>
        {(grupos ?? []).map((grupo) => (
          <Col xs={24} md={12} xl={8} key={grupo.id}>
            <Card
              loading={isLoading}
              title={
                <Space>
                  <TeamOutlined />
                  {grupo.nombre}
                </Space>
              }
              // Las acciones se muestran a todos; sin sesión llevan al login
              // (mismo criterio que Eliminar en Equipos).
              extra={
                <Space>
                  <Button size="small" icon={admin ? <EditOutlined /> : <LockOutlined />} onClick={() => abrirModal(grupo)}>
                    Editar
                  </Button>
                  <Popconfirm
                    disabled={!admin}
                    title={`¿Eliminar el grupo "${grupo.nombre}"?`}
                    description="Los técnicos y sus áreas quedarán sin grupo."
                    okText="Eliminar"
                    okButtonProps={{ danger: true }}
                    cancelText="Cancelar"
                    onConfirm={() => eliminar.mutate(grupo)}
                  >
                    <Button
                      size="small"
                      danger
                      icon={admin ? <DeleteOutlined /> : <LockOutlined />}
                      loading={eliminar.isPending && eliminar.variables?.id === grupo.id}
                      onClick={() => {
                        if (!admin) exigirAdmin(() => {});
                      }}
                    />
                  </Popconfirm>
                </Space>
              }
            >
              <Text strong>Integrantes</Text>
              <div style={{ margin: '4px 0 12px' }}>
                {grupo.grupo_tecnicos.length === 0 ? (
                  <Text type="secondary">Sin integrantes</Text>
                ) : (
                  grupo.grupo_tecnicos.map((gt) => (
                    <Tag key={gt.tecnico_id} color="blue">
                      {gt.tecnicos.nombre}
                    </Tag>
                  ))
                )}
              </div>
              <Text strong>Áreas</Text>
              <div style={{ marginTop: 4 }}>
                {grupo.grupo_sub_areas.length === 0 ? (
                  <Text type="secondary">Sin áreas asignadas</Text>
                ) : (
                  resumenAreas(grupo, areas).map((linea) => <div key={linea}>• {linea}</div>)
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <GrupoFormModal
        key={aperturas}
        open={modal.abierto}
        periodo={periodo}
        grupo={modal.grupo}
        gruposDelPeriodo={grupos ?? []}
        onClose={() => setModal((m) => ({ ...m, abierto: false }))}
      />
    </>
  );
}
