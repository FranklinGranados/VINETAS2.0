import { Flex, Spin } from 'antd';

// Se muestra mientras se descarga el CÓDIGO de una pantalla (React.lazy +
// Suspense, ver rutas/pantallas.tsx). Los DATOS tienen su propio indicador en
// cada pantalla (tabla con spinner, tarjetas en modo "loading").
export function PantallaDeCarga({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <Flex vertical justify="center" align="center" gap={12} style={{ minHeight: '50vh' }}>
      <Spin size="large" />
      <span style={{ color: 'rgba(0,0,0,0.45)' }}>{texto}</span>
    </Flex>
  );
}
