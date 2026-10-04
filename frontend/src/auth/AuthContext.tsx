import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import {
  AUTH_LOGOUT_EVENT,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from './tokenStorage';
import { decodeJwtPayload, tokenEstaVencido, type JwtPayload } from './jwt';

interface AuthContextValue {
  // null = nadie ha iniciado sesión (o el token guardado venció/es inválido).
  admin: JwtPayload | null;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Lee el token guardado y lo valida (que decodifique y que no haya vencido)
// — se usa tanto al montar el provider como cuando cambia el localStorage.
function leerSesionValida(): JwtPayload | null {
  const token = getStoredToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload || tokenEstaVencido(payload)) {
    clearStoredToken();
    return null;
  }

  return payload;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<JwtPayload | null>(leerSesionValida);
  const navigate = useNavigate();

  // Si el interceptor de axios detecta un 401 (token vencido/inválido en
  // cualquier request), dispara este evento — lo escuchamos acá para que
  // el resto de la app se entere de que la sesión terminó.
  //
  // Además redirige al login: si la sesión venció a mitad de una acción de
  // admin, lo útil es volver a iniciarla, no quedarse con un error. Se
  // excluye la propia pantalla de login (una contraseña incorrecta también
  // responde 401 y no tiene sentido "redirigir" a donde ya se está).
  useEffect(() => {
    const handleLogout = () => {
      setAdmin(null);
      const rutaActual = window.location.pathname;
      if (rutaActual !== '/login') {
        navigate('/login', { state: { desde: rutaActual } });
      }
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
  }, [navigate]);

  const login = useCallback(async (usuario: string, password: string) => {
    const { accessToken } = await authApi.login({ usuario, password });
    const payload = decodeJwtPayload(accessToken);
    if (!payload) {
      // No debería pasar nunca (el backend firma tokens válidos), pero si
      // pasara, mejor fallar explícito que dejar un estado a medias.
      throw new Error('El servidor devolvió un token con formato inválido');
    }
    setStoredToken(accessToken);
    setAdmin(payload);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de acceso — lanza si se usa fuera del AuthProvider en vez de
// devolver un valor a medias, para detectar el error de uso apenas pasa.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
