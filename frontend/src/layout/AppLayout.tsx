import { startTransition, Suspense, type ReactNode } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Button, Layout, Menu, Space, Spin, Typography } from 'antd';
import {
  ApartmentOutlined,
  ClusterOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  PrinterOutlined,
  TagsOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PantallaDeCarga } from '../components/PantallaDeCarga';
import { precargarRuta } from '../rutas/precarga';

const { Sider, Header, Content } = Layout;

// Enlace del menú que, al pasar el mouse (o llegar con Tab), adelanta el
// código y los datos de esa pantalla (ver rutas/precarga.ts).
function EnlaceMenu({ to, children }: { to: string; children: ReactNode }) {
  const queryClient = useQueryClient();
  const precargar = () => precargarRuta(to, queryClient);
  return (
    <Link to={to} onMouseEnter={precargar} onFocus={precargar}>
      {children}
    </Link>
  );
}

// "key" = la ruta a la que apunta cada ítem. Usamos ese mismo valor para
// resaltar el ítem activo (ver selectedKeys abajo) en vez de mantener un
// estado aparte sincronizado a mano con la ruta actual.
//
// Menú PÚBLICO: lo que usa cualquiera en planta, sin iniciar sesión.
// "Otras Viñetas" es un submenú, igual que en v1 (Calibrado/No Interviene/
// Fuera de Uso/Personalizado) — imprimen etiquetas sueltas sin pasar por
// un formulario de captura. Por ahora apuntan a pantallas "en construcción"
// (ComingSoonPage): dependen de resolver el protocolo de la Brady M611.
const MENU_PUBLICO = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: <EnlaceMenu to="/">Inicio</EnlaceMenu>,
  },
  {
    key: '/equipos',
    icon: <ToolOutlined />,
    label: <EnlaceMenu to="/equipos">Equipos</EnlaceMenu>,
  },
  {
    key: '/vinetas',
    icon: <TagsOutlined />,
    label: <EnlaceMenu to="/vinetas">Viñetas</EnlaceMenu>,
  },
  {
    key: '/otras-vinetas',
    icon: <PrinterOutlined />,
    label: 'Otras Viñetas',
    children: [
      {
        key: '/otras-vinetas/calibrado',
        label: <EnlaceMenu to="/otras-vinetas/calibrado">Calibrado</EnlaceMenu>,
      },
      {
        key: '/otras-vinetas/no-interviene',
        label: <EnlaceMenu to="/otras-vinetas/no-interviene">No Interviene</EnlaceMenu>,
      },
      {
        key: '/otras-vinetas/fuera-de-uso',
        label: <EnlaceMenu to="/otras-vinetas/fuera-de-uso">Fuera de Uso</EnlaceMenu>,
      },
      {
        key: '/otras-vinetas/personalizado',
        label: <EnlaceMenu to="/otras-vinetas/personalizado">Personalizado</EnlaceMenu>,
      },
    ],
  },
];

// Sección ADMINISTRACIÓN: configuración del sistema. Solo aparece con sesión
// de administrador, y sus rutas están protegidas por RutaAdmin (App.tsx).
// type: 'group' = título de sección en el menú, no un ítem clickeable.
const MENU_ADMIN = {
  key: 'administracion',
  type: 'group' as const,
  label: 'Administración',
  children: [
    {
      key: '/grupos',
      icon: <ClusterOutlined />,
      label: <EnlaceMenu to="/grupos">Grupos de trabajo</EnlaceMenu>,
    },
    {
      key: '/areas',
      icon: <ApartmentOutlined />,
      label: <EnlaceMenu to="/areas">Áreas y sub-áreas</EnlaceMenu>,
    },
    {
      key: '/tecnicos',
      icon: <TeamOutlined />,
      label: <EnlaceMenu to="/tecnicos">Técnicos</EnlaceMenu>,
    },
    {
      key: '/administradores',
      icon: <SafetyCertificateOutlined />,
      label: <EnlaceMenu to="/administradores">Administradores</EnlaceMenu>,
    },
  ],
};

// "Acerca de": pública y siempre al final del menú (después de
// Administración cuando hay sesión), como en la mayoría de programas.
const MENU_ACERCA_DE = {
  key: '/acerca-de',
  icon: <InfoCircleOutlined />,
  label: <EnlaceMenu to="/acerca-de">Acerca de</EnlaceMenu>,
};

// Layout base de toda la app: barra lateral de navegación + encabezado +
// el contenido de la pantalla actual. <Outlet /> es de React Router: es
// el "hueco" donde se renderiza la ruta hija que matchee (EquiposPage,
// TecnicosPage, etc.) — este componente nunca cambia entre pantallas.
export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  // Cerrar sesión estando en una pantalla de Administración: ir al Inicio.
  // Si se quedara ahí, RutaAdmin mandaría al login (parece que la sesión
  // "no se cerró"). En pantallas públicas se queda donde está.
  //
  // startTransition: React Router 7 aplica la navegación como "transición"
  // (baja prioridad). Si logout() fuera aparte (urgente), React dibujaría
  // primero "sin sesión" todavía en /tecnicos → RutaAdmin redirige al login
  // y gana. Dentro de la misma transición, los dos cambios se aplican JUNTOS.
  const cerrarSesion = () => {
    const enPantallaAdmin = MENU_ADMIN.children.some((item) => item.key === location.pathname);
    startTransition(() => {
      if (enPantallaAdmin) navigate('/', { replace: true });
      logout();
    });
  };
  // Cantidad de consultas pidiendo datos en este momento, en TODA la app.
  // La primera carga de cada tabla ya muestra su propio spinner; esto
  // cubre los refrescos en segundo plano (ej. después de guardar un
  // equipo), cuando la tabla sigue mostrando los datos anteriores.
  const consultasEnCurso = useIsFetching();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            color: 'white',
            padding: 16,
            fontWeight: 'bold',
            fontSize: 16,
          }}
        >
          Viñetas
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          // Si la ruta activa es una sub-ruta de "Otras Viñetas" (ej. al
          // entrar directo a /otras-vinetas/calibrado por link o refresh),
          // el submenú debe abrirse solo para mostrar cuál está activa —
          // sin esto, Ant Design no lo expande hasta que el usuario haga
          // click en el padre.
          defaultOpenKeys={
            location.pathname.startsWith('/otras-vinetas')
              ? ['/otras-vinetas']
              : []
          }
          items={admin ? [...MENU_PUBLICO, MENU_ADMIN, MENU_ACERCA_DE] : [...MENU_PUBLICO, MENU_ACERCA_DE]}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space size="large">
            <h2 style={{ margin: 0 }}>Sistema de Gestión de Mantenimiento</h2>
            {consultasEnCurso > 0 && (
              <Space size="small">
                <Spin size="small" />
                <Typography.Text type="secondary">Actualizando…</Typography.Text>
              </Space>
            )}
          </Space>

          {/* Sesión de administrador: la mayoría de la planta nunca inicia
              sesión (ver auth/AuthContext.tsx), así que por defecto esto
              muestra solo un link discreto para entrar, no un formulario
              de por medio. */}
          {admin ? (
            <Space>
              <Typography.Text type="secondary">
                {admin.nombre} (admin)
              </Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={cerrarSesion}>
                Cerrar sesión
              </Button>
            </Space>
          ) : (
            <Button
              type="link"
              icon={<LoginOutlined />}
              onClick={() => navigate('/login')}
            >
              Iniciar sesión
            </Button>
          )}
        </Header>
        <Content style={{ margin: 24 }}>
          {/* key = ruta actual: al navegar a otra pantalla el ErrorBoundary
              se "reinicia" — si una pantalla falló, las demás siguen
              funcionando sin tener que recargar el navegador. */}
          <ErrorBoundary key={location.pathname}>
            {/* Mientras se descarga el código de una pantalla diferida
                (pantallas.tsx). Adentro del layout: el menú no desaparece. */}
            <Suspense fallback={<PantallaDeCarga />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}
