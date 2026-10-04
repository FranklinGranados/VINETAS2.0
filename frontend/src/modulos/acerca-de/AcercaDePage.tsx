import { Card, Col, Divider, Row, Tag, Timeline, Typography } from 'antd';
import { TarjetaPersona } from './TarjetaPersona';
import { AGRADECIMIENTOS, CREADOR_ACTUAL, CREADOR_V1, HISTORIA, SISTEMA, TECNOLOGIAS } from './datosAcercaDe';

const { Title, Paragraph, Text } = Typography;

// Página "Acerca de": información del sistema y de sus creadores.
// ESQUELETO para diseñar: cada sección está marcada y es independiente —
// se puede reordenar, quitar o cambiar de componente sin afectar a las
// demás. Los textos salen de datosAcercaDe.ts.
export function AcercaDePage() {
  return (
    <>
      {/* ── 1. Encabezado: nombre y versión ─────────────────────────────
          TODO (diseño): logo, imagen de fondo, colores... */}
      <Title level={2}>{SISTEMA.nombre}</Title>
      <Text type="secondary">Versión {SISTEMA.version}</Text>
      <Paragraph style={{ marginTop: 16 }}>{SISTEMA.descripcion}</Paragraph>

      <Divider />

      {/* ── 2. Creadores ─────────────────────────────────────────────────
          Dos columnas en pantalla ancha, una debajo de otra en móvil
          (xs=24: ocupa todo el ancho; md=12: la mitad). */}
      <Title level={3}>Creadores</Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <TarjetaPersona persona={CREADOR_ACTUAL} />
        </Col>
        <Col xs={24} md={12}>
          <TarjetaPersona persona={CREADOR_V1} />
        </Col>
      </Row>

      <Divider />

      {/* ── 3. Historia del sistema ───────────────────────────────────── */}
      <Title level={3}>Historia</Title>
      <Timeline
        items={HISTORIA.map((hito) => ({
          children: (
            <>
              <Text strong>{hito.titulo}</Text>
              <div>{hito.detalle}</div>
            </>
          ),
        }))}
      />

      {/* ── 4. Tecnologías ────────────────────────────────────────────── */}
      <Title level={3}>Tecnologías</Title>
      <Card>
        {TECNOLOGIAS.map((tecnologia) => (
          <Tag key={tecnologia} style={{ marginBottom: 8 }}>
            {tecnologia}
          </Tag>
        ))}
      </Card>

      {/* ── 5. Agradecimientos (solo si hay) ──────────────────────────── */}
      {AGRADECIMIENTOS.length > 0 && (
        <>
          <Divider />
          <Title level={3}>Agradecimientos</Title>
          <ul>
            {AGRADECIMIENTOS.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
