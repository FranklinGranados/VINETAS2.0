import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Atrapa errores que ocurren al RENDERIZAR (ej: leer una propiedad de
// undefined dentro de un componente). Sin esto, React desmonta TODA la
// app y queda la pantalla en blanco. Los errores de peticiones HTTP no
// llegan acá: esos los maneja TanStack Query (isError / onError).
//
// Tiene que ser un componente de CLASE: React todavía no ofrece un hook
// equivalente a getDerivedStateFromError/componentDidCatch.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  // Se llama cuando un hijo lanza un error: el estado nuevo hace que el
  // próximo render muestre el mensaje en vez de los hijos rotos.
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  // Lugar para registrar el error (hoy la consola; más adelante podría
  // mandarse a un servicio de logs).
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de render atrapado por ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Result
          status="error"
          title="Esta pantalla tuvo un problema"
          subTitle={this.state.error.message}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
