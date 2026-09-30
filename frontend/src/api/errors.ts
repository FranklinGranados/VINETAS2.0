import { isAxiosError } from 'axios';

// Convierte cualquier error de una petición en un texto listo para mostrar.
//
// NestJS responde los errores con esta forma:
//   { statusCode: 409, message: 'Ya existe un equipo con TAG "X"', error: 'Conflict' }
// pero cuando falla el ValidationPipe (class-validator), `message` es un
// ARRAY con un texto por cada regla que no se cumplió:
//   { statusCode: 400, message: ['tag should not be empty', ...], error: 'Bad Request' }
// Por eso se contemplan los dos casos.
export function mensajeDeError(error: unknown): string {
  if (isAxiosError(error)) {
    // Sin response = la petición ni siquiera llegó a una respuesta HTTP:
    // backend apagado, red caída o bloqueo de CORS. El mensaje de axios
    // ("Network Error") no le dice nada a quien usa el sistema en planta.
    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido y que haya conexión a la red.';
    }
    const mensaje = error.response.data?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    // Un 500 de NestJS trae "Internal server error" en inglés y sin
    // detalle útil (a propósito: no se exponen detalles internos).
    if (error.response.status >= 500) {
      return 'Ocurrió un error en el servidor. Intenta de nuevo; si se repite, revisa los logs del backend.';
    }
    if (typeof mensaje === 'string') return mensaje;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Error desconocido';
}

// ¿Tiene sentido reintentar esta petición automáticamente?
// - Error de red o 5xx: sí, puede ser algo pasajero (backend reiniciando).
// - 4xx (400, 401, 404, 409...): no, la respuesta va a ser la misma
//   pidiéndola de nuevo — solo demoraría mostrar el error.
export function esErrorReintentable(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  return !error.response || error.response.status >= 500;
}
