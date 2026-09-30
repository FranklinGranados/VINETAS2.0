import { useQuery } from '@tanstack/react-query';
import { Card, Col, Progress, Row, Statistic, Typography } from 'antd';
import {
  ApartmentOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { ErrorDeCarga } from '../components/ErrorDeCarga';

const { Title } = Typography;

// Accesos rápidos a las 4 pantallas de listado — el sistema legacy los
// tenía como botones sueltos en el mismo formulario principal (button1..4).
const ACCESOS: {
  titulo: string;
  ruta: string;
  icono: React.ReactNode;
}[] = [
  { titulo: 'Equipos', ruta: '/equipos', icono: <ToolOutlined /> },
  { titulo: 'Técnicos', ruta: '/tecnicos', icono: <TeamOutlined /> },
  { titulo: 'Viñetas', ruta: '/vinetas', icono: <TagsOutlined /> },
  { titulo: 'Áreas', ruta: '/areas', icono: <ApartmentOutlined /> },
];

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'resumen-calibracion'],
    queryFn: dashboardApi.resumenCalibracion,
  });

  if (isError) {
    return (
      <ErrorDeCarga
        queCargaba="el resumen de calibración"
        error={error}
        onReintentar={() => refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <>
      <Title level={3}>Inicio</Title>

      {/* Equivalente al "Faltan X de Y, Z%" de la barra de estado en v1 */}
      <Card loading={isLoading} style={{ marginBottom: 24 }}>
        <Row gutter={32} align="middle">
          <Col xs={24} md={16}>
            <Row gutter={32}>
              <Col span={8}>
                <Statistic
                  title="Equipos activos"
                  value={data?.totalActivos}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={`Calibrados en ${data?.periodo ?? ''}`}
                  value={data?.completados}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Faltan"
                  value={data?.faltan}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>
          </Col>
          <Col xs={24} md={8}>
            <Progress
              type="circle"
              size={110}
              percent={data?.porcentaje ?? 0}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {ACCESOS.map((acceso) => (
          <Col xs={12} md={6} key={acceso.ruta}>
            <Link to={acceso.ruta}>
              <Card hoverable>
                <Statistic
                  title={acceso.titulo}
                  value=" "
                  prefix={acceso.icono}
                />
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </>
  );
}
