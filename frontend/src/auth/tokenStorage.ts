// Único lugar que toca localStorage para el token — tanto el interceptor
// de axios (fuera del árbol de React) como AuthContext (dentro de React)
// leen/escriben acá, en vez de cada uno manejar la clave de localStorage
// por su cuenta.
const STORAGE_KEY = 'vinetas_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Evento del navegador (no de React) para avisar "la sesión terminó" desde
// código que no tiene acceso al Context — hoy solo lo dispara el
// interceptor de axios cuando el backend responde 401 (token vencido o
// inválido). AuthContext lo escucha para actualizar su estado.
export const AUTH_LOGOUT_EVENT = 'vinetas:auth-logout';

export function notificarLogout(): void {
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}
