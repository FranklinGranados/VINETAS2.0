import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, InputNumber, Typography } from 'antd';
import { useAuth } from '../auth/AuthContext';
import type { EstadoLogin } from '../auth/useExigirAdmin';

const { Title, Text } = Typography;

interface FormValues {
  cod_empleado: number;
  password: string;
}

// Pantalla de login para administradores — no existía en v1 (nadie
// iniciaba sesión ahí). Solo la necesita el pequeño grupo de técnicos que
// además administra el sistema (ver auth/AuthContext.tsx); el resto de la
// planta sigue usando la app sin loguearse, igual que antes.
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // Si se llegó acá desde una acción protegida (ver useExigirAdmin), el
  // estado de la navegación trae la pantalla de origen: al iniciar sesión
  // se vuelve ahí, en vez de mandar siempre al inicio.
  const location = useLocation();
  const desde = (location.state as EstadoLogin | null)?.desde ?? '/';
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onFinish = async (values: FormValues) => {
    setError(null);
    setEnviando(true);
    try {
      await login(values.cod_empleado, values.password);
      // replace: el login no queda en el historial — el botón "atrás" del
      // navegador no vuelve a mostrar el formulario ya usado.
      navigate(desde, { replace: true });
    } catch {
      // El backend responde el mismo mensaje genérico tanto si el código
      // de empleado no existe como si la contraseña no coincide — acá
      // hacemos lo mismo, no distinguimos el motivo.
      setError('Código de empleado o contraseña incorrectos');
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
          Para eliminar equipos y gestionar técnicos y áreas
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
            label="Código de empleado"
            name="cod_empleado"
            rules={[{ required: true, message: 'Ingresa tu código de empleado' }]}
          >
            <InputNumber style={{ width: '100%' }} autoFocus />
          </Form.Item>

          <Form.Item
            label="Contraseña"
            name="password"
            rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={enviando}>
              Iniciar sesión
            </Button>
          </Form.Item>
          {/* La mayoría de la planta no necesita sesión: salida explícita
              para volver sin quedar "atrapado" en esta pantalla. */}
          <Button type="link" block onClick={() => navigate(desde)}>
            Volver sin iniciar sesión
          </Button>
        </Form>
      </Card>
    </div>
  );
}
