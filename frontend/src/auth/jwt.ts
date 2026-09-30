// Decodifica el "payload" (segunda parte) de un JWT — SIN verificar su
// firma. Verificar la firma es trabajo del backend en cada request (ver
// AdminAuthGuard); acá solo lo leemos para saber, del lado del cliente,
// quién inició sesión y mostrarlo en pantalla (nombre, si es admin). Un
// usuario podría editar este payload en su propio navegador sin que eso
// le dé ningún permiso real, porque el backend nunca confía en lo que el
// cliente dice de sí mismo — vuelve a verificar la firma del token en
// cada request protegido.
export interface JwtPayload {
  sub: number;
  nombre: string;
  esAdmin: boolean;
  // "exp" (expiration) es un campo estándar de JWT: timestamp Unix en
  // segundos de cuándo vence el token.
  exp: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payloadBase64] = token.split('.');
    // JWT usa "base64url" (con - y _ en vez de + y /), no base64 estándar
    // — hay que convertirlo antes de que atob() lo pueda decodificar.
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

export function tokenEstaVencido(payload: JwtPayload): boolean {
  return payload.exp * 1000 < Date.now();
}
