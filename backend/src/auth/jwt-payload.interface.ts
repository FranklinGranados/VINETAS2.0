// Forma del contenido que viaja adentro del JWT. "sub" (subject) es el
// nombre de campo estándar del estándar JWT para "a quién identifica este
// token" — lo seguimos aunque acá el resto del proyecto use "id".
export interface JwtPayload {
  sub: number; // administradores.id (no tecnicos.id: un admin puede no ser técnico)
  nombre: string;
  esAdmin: boolean;
}
