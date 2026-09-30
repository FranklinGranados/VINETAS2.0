import { useIsFetching } from '@tanstack/react-query';
import { Button, Layout, Menu, Space, Spin, Typography } from 'antd';
import {
  ApartmentOutlined,
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
  PrinterOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

const { Sider, Header, Content } = Layout;

// "key" = la ruta a la que apunta cada ítem. Usamos ese mismo valor para
// resaltar el ítem activo (ver selectedKeys abajo) en vez de mantener un
// estado aparte sincronizado a mano con la ruta actual.
//
// "Otras Viñetas" es un submenú, igual que en v1 (Calibrado/No Interviene/
// Fuera de Uso/Personalizado) — imprimen etiquetas sueltas sin pasar por
// un formulario de captura. Por ahora apuntan a pantallas "en construcción"
// (ComingSoonPage): dependen de resolver el protocolo de la Brady M611.
const MENU_ITEMS = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: <Link to="/">Inicio</Link>,
  },
  {
    key: '/equipos',
    icon: <ToolOutlined />,
    label: <Link to="/equipos">Equipos</Link>,
  },
  {
    key: '/tecnicos',
    icon: <TeamOutlined />,
    label: <Link to="/tecnicos">Técnicos</Link>,
  },
  {
    key: '/vinetas',
    icon: <TagsOutlined />,
    label: <Link to="/vinetas">Viñetas</Link>,
  },
  {
    key: '/areas',
    icon: <ApartmentOutlined />,
    label: <Link to="/areas">Áreas</Link>,
  },
  {
    key: '/otras-vinetas',
    icon: <PrinterOutlined />,
    label: 'Otras Viñetas',
    children: [
      {
        key: '/otras-vinetas/calibrado',
        label: <Link to="/otras-vinetas/calibrado">Calibrado</Link>,
      },
      {
        key: '/otras-vinetas/no-interviene',
        label: <Link to="/otras-vinetas/no-interviene">No Interviene</Link>,
      },
      {
        key: '/otras-vinetas/fuera-de-uso',
        label: <Link to="/otras-vinetas/fuera-de-uso">Fuera de Uso</Link>,
      },
      {
        key: '/otras-vinetas/personalizado',
        label: <Link to="/otras-vinetas/personalizado">Personalizado</Link>,
      },
    ],
  },
];

// Layout base de toda la app: barra lateral de navegación + encabezado +
// el contenido de la pantalla actual. <Outlet /> es de React Router: es
// el "hueco" donde se renderiza la ruta hija que matchee (EquiposPage,
// TecnicosPage, etc.) — este componente nunca cambia entre pantallas.
export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
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
          items={MENU_ITEMS}
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
              <Button icon={<LogoutOutlined />} onClick={logout}>
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
            <Outlet />
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}
