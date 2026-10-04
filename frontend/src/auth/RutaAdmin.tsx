import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { EstadoLogin } from './useExigirAdmin';

// "Middleware" de rutas: envuelve las pantallas de la sección Administración
// (ver App.tsx). Sin sesión de administrador redirige al login, recordando a
// qué pantalla se quería entrar para volver ahí después de iniciar sesión.
//
// Es solo navegación: la seguridad real la hace el backend (AdminAuthGuard)
// en cada acción de escritura, aunque alguien saltara esta pantalla.
export function RutaAdmin() {
  const { admin } = useAuth();
  const location = useLocation();

  if (!admin) {
    const estado: EstadoLogin = { desde: location.pathname, soloAdmin: true };
    // replace: la ruta protegida no queda en el historial (el botón "atrás"
    // no vuelve a rebotar contra el login).
    return <Navigate to="/login" replace state={estado} />;
  }

  // <Outlet />: acá se dibuja la pantalla protegida que coincidió.
  return <Outlet />;
}
