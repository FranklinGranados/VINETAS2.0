import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

// Ruta comodín (path="*"): cualquier URL que no coincide con ninguna
// ruta definida en App.tsx termina acá, en vez de un área de contenido vacía.
export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Página no encontrada"
      subTitle="La dirección que abriste no existe en el sistema."
      extra={
        <Link to="/">
          <Button type="primary">Ir al inicio</Button>
        </Link>
      }
    />
  );
}
