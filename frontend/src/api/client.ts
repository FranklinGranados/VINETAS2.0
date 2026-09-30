import axios from 'axios';
import { clearStoredToken, getStoredToken, notificarLogout } from '../auth/tokenStorage';

// Instancia única de axios con la URL base de la API ya configurada.
// Todos los archivos de src/api/*.ts importan ESTE cliente en vez de
// llamar a axios directo — así la baseURL y los headers comunes se
// configuran en un solo lugar (igual idea que el PrismaService del
// backend: una instancia compartida en vez de repetir configuración).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: si hay un token guardado, lo agrega a TODAS las
// peticiones salientes. Los endpoints que no requieren sesión (la mayoría)
// simplemente ignoran este header — no hace daño mandarlo de más.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: si el backend responde 401 (token vencido, inválido,
// o falta permiso de admin), limpiamos el token guardado y avisamos al resto
// de la app (AuthContext) para que refleje "sesión cerrada" — sin esto, el
// usuario seguiría viendo la UI como si tuviera sesión hasta refrescar.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      notificarLogout();
    }
    return Promise.reject(error);
  },
);
