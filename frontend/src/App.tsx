import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './modulos/inicio/DashboardPage';
import { ComingSoonPage } from './modulos/otras-vinetas/ComingSoonPage';
import { LoginPage } from './auth/LoginPage';
import { NotFoundPage } from './layout/NotFoundPage';
import { RutaAdmin } from './auth/RutaAdmin';
// Pantallas de carga diferida (se descargan al entrar, ver rutas/pantallas.tsx).
import {
  AcercaDePage,
  AdministradoresPage,
  AreasPage,
  EquiposPage,
  GruposPage,
  TecnicosPage,
  VinetasPage,
} from './rutas/pantallas';

function App() {
  return (
    <Routes>
      {/* Fuera de AppLayout a propósito: es una pantalla de acceso, no
          tiene sentido mostrarla con el sidebar de navegación alrededor. */}
      <Route path="/login" element={<LoginPage />} />

      {/* Todas las demás rutas comparten el mismo AppLayout (sidebar +
          header). Las rutas hijas se renderizan dentro del <Outlet />. */}
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/equipos" element={<EquiposPage />} />
        <Route path="/vinetas" element={<VinetasPage />} />
        <Route path="/acerca-de" element={<AcercaDePage />} />

        {/* Sección Administración: sin sesión de admin, RutaAdmin manda al
            login (y vuelve acá al iniciar sesión). */}
        <Route element={<RutaAdmin />}>
          <Route path="/grupos" element={<GruposPage />} />
          <Route path="/areas" element={<AreasPage />} />
          <Route path="/tecnicos" element={<TecnicosPage />} />
          <Route path="/administradores" element={<AdministradoresPage />} />
        </Route>

        {/* "Otras Viñetas": etiquetas de impresión directa (sin formulario
            de captura ni registro nuevo en BD) — pendientes de la Brady M611. */}
        <Route
          path="/otras-vinetas/calibrado"
          element={<ComingSoonPage titulo="Calibrado" />}
        />
        <Route
          path="/otras-vinetas/no-interviene"
          element={<ComingSoonPage titulo="No Interviene" />}
        />
        <Route
          path="/otras-vinetas/fuera-de-uso"
          element={<ComingSoonPage titulo="Fuera de Uso" />}
        />
        <Route
          path="/otras-vinetas/personalizado"
          element={<ComingSoonPage titulo="Personalizado" />}
        />

        {/* Comodín: cualquier ruta no definida arriba. Va al final y
            adentro de AppLayout para que el menú siga disponible. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
