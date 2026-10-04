import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import 'antd/dist/reset.css';
import './index.css';
import App from './App.tsx';
import { esErrorReintentable } from './api/errors';
import { AuthProvider } from './auth/AuthContext';

// Pantallas diferidas (rutas/pantallas.tsx) + versión nueva desplegada:
// una pestaña que quedó abierta con la versión anterior pide archivos de
// /assets/ que ya no existen (404) al entrar a otra pantalla. Vite avisa
// con este evento; se recarga para traer la versión nueva. Solo UNA vez
// por pestaña (sessionStorage): si el archivo falta por otro motivo, se
// muestra el error normal en vez de recargar sin fin.
window.addEventListener('vite:preloadError', (evento) => {
  if (sessionStorage.getItem('recargadoPorVersionNueva')) return;
  sessionStorage.setItem('recargadoPorVersionNueva', '1');
  evento.preventDefault(); // ya se resuelve recargando: no relanzar el error
  window.location.reload();
});

// Una sola instancia de QueryClient para toda la app: guarda en memoria
// el cache de todas las consultas (equipos, tecnicos, vinetas...). Cada
// pantalla usa useQuery/useMutation contra este mismo cache compartido.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Por defecto TanStack Query reintenta 3 veces CUALQUIER error, con
      // esperas crecientes: con el backend apagado, el mensaje de error
      // tardaba ~7 segundos en aparecer. Acá: 1 solo reintento, y solo si
      // el error puede ser pasajero (red caída o 5xx) — un 404 o un 400 se
      // muestran al instante (ver esErrorReintentable).
      retry: (intentos, error) => esErrorReintentable(error) && intentos < 1,
      // No volver a pedir todo cada vez que el usuario cambia de pestaña
      // del navegador y vuelve — en este sistema los datos no cambian tan
      // seguido, y generaba parpadeos de "Actualizando…" innecesarios.
      refetchOnWindowFocus: false,
      // Datos "frescos" durante 30 s: en ese lapso, volver a una pantalla
      // o precargarla al pasar el mouse (rutas/precarga.ts) usa el caché
      // sin repetir la petición. Sin esto (0 por defecto), lo precargado
      // se volvía a pedir apenas se abría la pantalla. Guardar algo no
      // espera los 30 s: las mutations invalidan sus consultas al momento.
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* QueryClientProvider: habilita useQuery/useMutation en toda la app */}
    <QueryClientProvider client={queryClient}>
      {/* ConfigProvider con locale español: traduce los textos internos
          de los componentes de Ant Design (paginación, selector de fecha,
          confirmaciones, etc.) */}
      <ConfigProvider locale={esES}>
        {/* AntApp (el componente <App> de antd, renombrado para no chocar
            con nuestro App): habilita App.useApp() para mostrar message,
            notification y modal.confirm respetando el ConfigProvider. Las
            versiones "estáticas" (import { message } from 'antd') quedan
            fuera del árbol de React y no heredan locale ni tema. */}
        <AntApp>
          <BrowserRouter>
            {/* AuthProvider adentro del Router: LoginPage usa useNavigate()
                dentro de login(), necesita el contexto de rutas disponible. */}
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
);
