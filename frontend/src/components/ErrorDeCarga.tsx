import { Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { mensajeDeError } from '../api/errors';

interface Props {
  // Qué se estaba cargando, ej: "el listado de equipos".
  queCargaba: string;
  error: unknown;
  // El refetch() que devuelve useQuery — vuelve a pedir los datos.
  onReintentar: () => void;
  // true mientras el reintento está en curso (isFetching de useQuery).
  reintentando?: boolean;
}

// Pantalla de error para cuando falla la carga inicial de una página.
// Reemplaza el <Alert> que cada página repetía por su cuenta, y agrega lo
// que le faltaba: un botón para reintentar sin tener que refrescar toda
// la página del navegador.
export function ErrorDeCarga({ queCargaba, error, onReintentar, reintentando }: Props) {
  return (
    <Result
      status="warning"
      title={`No se pudo cargar ${queCargaba}`}
      subTitle={mensajeDeError(error)}
      extra={
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={reintentando}
          onClick={onReintentar}
        >
          Reintentar
        </Button>
      }
    />
  );
}
