import { App } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Estado que viaja con la navegación hacia /login: la pantalla desde la
// que se pidió la acción, para volver ahí después de iniciar sesión.
export interface EstadoLogin {
  desde?: string;
}

// Equivalente en el frontend a un "middleware" de autenticación: envuelve
// una acción que requiere ser administrador (crear o eliminar equipos,
// gestionar técnicos...).
//   - Con sesión de admin → ejecuta la acción.
//   - Sin sesión → avisa y redirige a /login, recordando de dónde venía.
//
// OJO: esto es solo experiencia de usuario. La seguridad REAL está en el
// backend (AdminAuthGuard): aunque alguien se salteara esta redirección
// (ej. llamando a la API con curl), el backend igual respondería 401.
export function useExigirAdmin() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  return (accion: () => void) => {
    if (admin) {
      accion();
      return;
    }
    message.info('Esta acción requiere iniciar sesión como administrador');
    const estado: EstadoLogin = { desde: location.pathname };
    navigate('/login', { state: estado });
  };
}
