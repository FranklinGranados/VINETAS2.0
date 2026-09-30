import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface MensajesError {
  /** P2002 — ya existe un registro con ese valor único (ej: TAG repetido) → 409 */
  duplicado?: string;
  /** P2003 al crear/editar — la FK que mandó el cliente no existe (ej: sub_area_id inválido) → 400 */
  referenciaInvalida?: string;
  /** P2003 al borrar — otros registros dependen de este (ej: equipo con viñetas) → 409 */
  referenciaBloqueada?: string;
}

// Traduce los códigos de error de Prisma a excepciones HTTP legibles.
// Se llama desde el catch de cada service, pasando el mensaje específico
// del contexto — así el mensaje sigue siendo preciso ("ya existe un equipo
// con TAG X") sin repetir en cada módulo el "if (error.code === 'P2002')".
//
// Nota: P2003 significa cosas distintas según la operación. Al crear/editar
// significa "la referencia no existe" (400, error del cliente). Al borrar
// significa "otros registros dependen de este" (409, conflicto de estado).
// Por eso el caller pasa solo la clave que aplica a su caso.
//
// Si el error no es uno de los que sabemos traducir, lo relanza tal cual
// para que Nest lo devuelva como 500 (nunca lo escondemos en silencio).
export function traducirErrorDePrisma(
  error: unknown,
  mensajes: MensajesError,
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002' && mensajes.duplicado) {
      throw new ConflictException(mensajes.duplicado);
    }
    if (error.code === 'P2003') {
      if (mensajes.referenciaBloqueada) {
        throw new ConflictException(mensajes.referenciaBloqueada);
      }
      if (mensajes.referenciaInvalida) {
        throw new BadRequestException(mensajes.referenciaInvalida);
      }
    }
  }
  throw error;
}
