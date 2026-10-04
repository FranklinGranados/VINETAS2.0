import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { mensajeDeError } from '../api/errors';
import { useAuth } from './AuthContext';
import type { EstadoLogin } from './useExigirAdmin';

const { Title, Text } = Typography;

interface FormValues {
  usuario: string;
  password: string;
}

// Pantalla de login para administradores — no existía en v1 (nadie
// iniciaba sesión ahí). Solo la necesitan los administradores (tabla
// administradores: usuario + contraseña, ver auth/AuthContext.tsx); el
// resto de la planta sigue usando la app sin loguearse, igual que antes.
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // Si se llegó acá desde una acción protegida (ver useExigirAdmin), el
  // estado de la navegación trae la pantalla de origen: al iniciar sesión
  // se vuelve ahí, en vez de mandar siempre al inicio.
  const location = useLocation();
  const estado = location.state as EstadoLogin | null;
  const desde = estado?.desde ?? '/';
  // Salir sin sesión: a la pantalla de origen solo si es pública (si era de
  // administración, volver ahí rebotaría al login en un ciclo sin fin).
  const destinoSinSesion = estado?.soloAdmin ? '/' : desde;
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onFinish = async (values: FormValues) => {
    setError(null);
    setEnviando(true);
    try {
      await login(values.usuario.trim(), values.password);
      // replace: el login no queda en el historial — el botón "atrás" del
      // navegador no vuelve a mostrar el formulario ya usado.
      navigate(desde, { replace: true });
    } catch (e) {
      // El backend responde el mismo mensaje genérico tanto si el usuario
      // no existe como si la contraseña no coincide (así no revela qué
      // usuarios existen). Un acceso desactivado sí trae su propio
      // mensaje: se muestra tal cual.
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <Card style={{ width: 360 }}>
        <Title level={3} style={{ textAlign: 'center', marginTop: 0 }}>
          Acceso de administrador
        </Title>
        <Text
          type="secondary"
          style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}
        >
          Para eliminar equipos y gestionar grupos, áreas, técnicos y administradores
        </Text>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form<FormValues> layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Usuario"
            name="usuario"
            rules={[{ required: true, message: 'Ingresa tu usuario' }]}
          >
            {/* autoComplete: el navegador puede recordar usuario y clave. */}
            <Input autoFocus autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="Contraseña"
            name="password"
            rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={enviando}>
              Iniciar sesión
            </Button>
          </Form.Item>
          {/* La mayoría de la planta no necesita sesión: salida explícita
              para volver sin quedar "atrapado" en esta pantalla. */}
          <Button type="link" block onClick={() => navigate(destinoSinSesion, { replace: true })}>
            Volver sin iniciar sesión
          </Button>
        </Form>
      </Card>
    </div>
  );
}
