import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EquiposPage } from './pages/EquiposPage';
import { TecnicosPage } from './pages/TecnicosPage';
import { VinetasPage } from './pages/VinetasPage';
import { AreasPage } from './pages/AreasPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
        <Route path="/tecnicos" element={<TecnicosPage />} />
        <Route path="/vinetas" element={<VinetasPage />} />
        <Route path="/areas" element={<AreasPage />} />

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
