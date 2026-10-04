import { Avatar, Card, Space, Typography } from 'antd';
import type { Persona } from './datosAcercaDe';

const { Title, Text, Paragraph, Link } = Typography;

// "Juan Pérez" → "JP" (avatar cuando no hay foto).
function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');
}

// Tarjeta de una persona. Un solo componente para los dos creadores: si
// cambias el diseño acá, cambian las dos tarjetas a la vez.
//
// TODO (diseño): foto más grande, colores, borde, disposición... a tu gusto.
export function TarjetaPersona({ persona }: { persona: Persona }) {
  return (
    <Card style={{ height: '100%' }}>
      <Space direction="vertical" align="center" style={{ width: '100%', textAlign: 'center' }}>
        <Avatar size={96} src={persona.foto}>
          {iniciales(persona.nombre)}
        </Avatar>
        <Title level={4} style={{ margin: 0 }}>
          {persona.nombre}
        </Title>
        <Text type="secondary">{persona.rol}</Text>
        <Paragraph>{persona.descripcion}</Paragraph>
        {persona.enlaces && persona.enlaces.length > 0 && (
          <Space wrap>
            {persona.enlaces.map((enlace) => (
              // target _blank: abre en otra pestaña sin sacar al usuario
              // del sistema; noopener por seguridad.
              <Link key={enlace.url} href={enlace.url} target="_blank" rel="noopener noreferrer">
                {enlace.texto}
              </Link>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  );
}
