import { Empty } from 'antd';

interface Props {
  titulo: string;
}

// Página temporal para las rutas que todavía no tienen pantalla real.
// Se reemplaza módulo por módulo a medida que las construimos.
export function ComingSoonPage({ titulo }: Props) {
  return (
    <Empty
      description={`${titulo}: pantalla en construcción`}
      style={{ marginTop: 64 }}
    />
  );
}
