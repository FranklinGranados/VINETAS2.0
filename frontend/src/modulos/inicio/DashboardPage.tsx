import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Space, Statistic, Tag, Tooltip, Typography } from 'antd';
import { DownOutlined, RiseOutlined, TeamOutlined, UpOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { consultaAvance, consultaInstrumentosSubArea } from '../../api/consultas';
import type { Avance, AvanceArea } from '../../api/types';
import { ErrorDeCarga } from '../../components/ErrorDeCarga';
import { ImagenArea } from './ImagenArea';
import { InstrumentosSubAreaDrawer } from './InstrumentosSubAreaDrawer';
import { SelectorPeriodo } from '../../components/SelectorPeriodo';
import { useFlujoVineta } from '../vinetas/useFlujoVineta';
import { colorAvance, porAvance } from '../../utils/avance';
import { formatoDMY } from '../../utils/fechas';

const { Title, Text } = Typography;

// Barra de avance coloreada por nivel: verde ≥ 75 %, amarillo ≥ 40 %, rojo
// por debajo (ver utils/avance.ts).
function BarraAvance({ avance, tamano }: { avance: Avance; tamano?: 'small' }) {
  return <Progress percent={avance.porcentaje} size={tamano} strokeColor={colorAvance(avance.porcentaje)} />;
}

// "+12.5% esta semana": lo avanzado desde el corte del jueves anterior.
function AvanceSemana({ avance }: { avance: Avance }) {
  const { completados, porcentaje } = avance.semana;
  // Sin instrumentos no hay avance que mostrar (sería un "0%" sin sentido).
  if (avance.total === 0) return null;
  return (
    <Tooltip title={`${completados} instrumento(s) con viñeta desde el corte del jueves`}>
      <Tag color={completados > 0 ? 'green' : 'default'} icon={completados > 0 ? <RiseOutlined /> : undefined}>
        {porcentaje > 0 ? '+' : ''}
        {porcentaje}% esta semana
      </Tag>
    </Tooltip>
  );
}

// "12 de 40 con viñeta · faltan 28"
function TextoAvance({ avance }: { avance: Avance }) {
  return (
    <Text type="secondary">
      {avance.completados} de {avance.total} con viñeta · faltan {avance.pendientes}
    </Text>
  );
}

// Tarjeta de un área: dibujo, avance y (desplegable) sus sub-áreas.
function TarjetaArea({
  area,
  onVerSubArea,
  onPrecargarSubArea,
}: {
  area: AvanceArea;
  onVerSubArea: (id: number) => void;
  onPrecargarSubArea: (id: number) => void;
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <Card size="small" style={{ height: '100%' }}>
      <Flex gap={12} align="center">
        <ImagenArea codigo={area.codigo} nombre={area.nombre} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex justify="space-between" align="center" gap={4} wrap>
            <Text strong>{area.nombre}</Text>
            <AvanceSemana avance={area} />
          </Flex>
          <div>
            <TextoAvance avance={area} />
          </div>
          <BarraAvance avance={area} tamano="small" />
        </div>
      </Flex>

      <Button
        type="link"
        size="small"
        style={{ padding: 0, marginTop: 4 }}
        icon={abierta ? <UpOutlined /> : <DownOutlined />}
        onClick={() => setAbierta((a) => !a)}
      >
        {abierta ? 'Ocultar' : 'Ver'} sub-áreas ({area.sub_areas.length})
      </Button>

      {abierta && (
        <div style={{ marginTop: 8 }}>
          {[...area.sub_areas].sort(porAvance).map((sub) => (
            // Cada sub-área es clickeable: abre el panel con sus instrumentos.
            <div
              key={sub.id}
              role="button"
              tabIndex={0}
              onClick={() => onVerSubArea(sub.id)}
              onMouseEnter={() => onPrecargarSubArea(sub.id)}
              onFocus={() => onPrecargarSubArea(sub.id)}
              onKeyDown={(e) => e.key === 'Enter' && onVerSubArea(sub.id)}
              style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: '#fafafa', marginBottom: 6 }}
            >
              <Flex justify="space-between" align="center" gap={8}>
                <Text>{sub.nombre}</Text>
                {sub.grupo ? <Tag color="blue">{sub.grupo.nombre}</Tag> : <Tag>Sin grupo</Tag>}
              </Flex>
              <Flex align="center" gap={8}>
                <div style={{ flex: 1 }}>
                  <BarraAvance avance={sub} tamano="small" />
                </div>
                <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
                  {sub.completados}/{sub.total}
                </Text>
              </Flex>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Inicio: avance del mantenimiento de la temporada — general, por grupo de
// trabajo y por área / sub-área. Reemplaza al "Faltan X de Y" de v1.
export function DashboardPage() {
  const [periodo, setPeriodo] = useState(new Date().getFullYear());
  const [subAreaId, setSubAreaId] = useState<number | null>(null);
  // Imprimir desde el panel de una sub-área = mismo flujo que en Equipos.
  const flujoVineta = useFlujoVineta();

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(consultaAvance(periodo));

  // Al pasar el mouse por una sub-área se piden sus instrumentos: cuando se
  // hace clic, el panel abre ya lleno. Con staleTime (main.tsx), pasar el
  // mouse varias veces no repite la petición.
  const precargarSubArea = (id: number) =>
    void queryClient.prefetchQuery(consultaInstrumentosSubArea(id, periodo));

  if (isError) {
    return (
      <ErrorDeCarga
        queCargaba="el avance del mantenimiento"
        error={error}
        onReintentar={() => refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={8} style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Inicio
        </Title>
        <SelectorPeriodo value={periodo} onChange={setPeriodo} />
      </Flex>

      {/* Resumen general (el "Faltan X de Y" de v1) */}
      <Card loading={isLoading} style={{ marginBottom: 24 }}>
        {data && (
          <>
            <Row gutter={[24, 16]}>
              <Col xs={12} md={4}>
                <Statistic title="Instrumentos" value={data.total} />
              </Col>
              <Col xs={12} md={5}>
                <Statistic title="Con viñeta" value={data.completados} valueStyle={{ color: '#3f8600' }} />
              </Col>
              <Col xs={12} md={5}>
                <Statistic title="Faltan" value={data.pendientes} valueStyle={{ color: '#cf1322' }} />
              </Col>
              {/* Actividad: viñetas impresas (no equipos distintos), como en Rutinas */}
              <Col xs={12} md={5}>
                <Statistic title="Viñetas hoy" value={data.vinetasHoy} />
              </Col>
              <Col xs={24} md={5}>
                <Statistic title={`Desde el jueves ${formatoDMY(data.corteSemanal).slice(0, 5)}`} value={data.vinetasSemana} />
              </Col>
            </Row>
            <Flex align="center" gap={12} style={{ marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <BarraAvance avance={data} />
              </div>
              <AvanceSemana avance={data} />
            </Flex>
          </>
        )}
      </Card>

      {/* Avance por grupo de trabajo */}
      <Title level={4}>Grupos de trabajo</Title>
      {data && data.grupos.length === 0 ? (
        <Card style={{ marginBottom: 24 }}>
          <Empty description={`No hay grupos armados para la temporada ${periodo}`}>
            <Link to="/grupos">
              <Button type="primary">Armar grupos</Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[...(data?.grupos ?? [])].sort(porAvance).map((grupo) => (
            <Col xs={24} md={12} xl={8} key={grupo.id}>
              <Card size="small" style={{ height: '100%' }}>
                <Flex justify="space-between" align="center" gap={4} wrap>
                  <Space>
                    <TeamOutlined />
                    <Text strong>{grupo.nombre}</Text>
                  </Space>
                  <AvanceSemana avance={grupo} />
                </Flex>
                <div style={{ margin: '4px 0' }}>
                  {grupo.tecnicos.length > 0 ? (
                    grupo.tecnicos.map((t) => (
                      <Tag key={t.id} color="blue">
                        {t.nombre}
                      </Tag>
                    ))
                  ) : (
                    <Text type="secondary">Sin integrantes</Text>
                  )}
                </div>
                <TextoAvance avance={grupo} />
                <BarraAvance avance={grupo} />
              </Card>
            </Col>
          ))}
          {/* Instrumentos de sub-áreas que ningún grupo tiene asignadas:
              avisa si quedó algo sin repartir al armar los grupos. */}
          {data && data.sinGrupo.total > 0 && (
            <Col xs={24} md={12} xl={8}>
              <Card size="small" style={{ height: '100%', borderStyle: 'dashed' }}>
                <Text strong>Sin grupo asignado</Text>
                <div style={{ margin: '4px 0' }}>
                  <TextoAvance avance={data.sinGrupo} />
                </div>
                <BarraAvance avance={data.sinGrupo} />
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* Avance por área → sub-área → instrumentos */}
      <Title level={4}>Áreas</Title>
      <Row gutter={[16, 16]}>
        {[...(data?.areas ?? [])].sort(porAvance).map((area) => (
          <Col xs={24} md={12} xl={8} key={area.id}>
            <TarjetaArea area={area} onVerSubArea={setSubAreaId} onPrecargarSubArea={precargarSubArea} />
          </Col>
        ))}
      </Row>

      {data && data.areasExcluidas.length > 0 && (
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message={`No cuentan para el avance: ${data.areasExcluidas.map((a) => a.nombre).join(', ')}`}
          description="Se configura en la pantalla Áreas (administradores)."
        />
      )}

      <InstrumentosSubAreaDrawer
        subAreaId={subAreaId}
        periodo={periodo}
        onClose={() => setSubAreaId(null)}
        onImprimir={flujoVineta.nuevaVineta}
      />
      {flujoVineta.modales}
    </>
  );
}
