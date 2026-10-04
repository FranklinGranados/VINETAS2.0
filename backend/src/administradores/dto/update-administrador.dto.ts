import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateIf,
} from 'class-validator';
import { CreateAdministradorDto } from './create-administrador.dto';

// Todo opcional: se manda solo lo que cambia. Mandar password = cambiar la
// clave. tecnico_id se redefine abajo porque acá también acepta null.
export class UpdateAdministradorDto extends PartialType(
  OmitType(CreateAdministradorDto, ['tecnico_id'] as const),
) {
  // false = desactivar el acceso (no hay DELETE: así se conserva quién
  // revisó cada viñeta).
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // número = vincular a ese técnico; null = quitar el vínculo; omitido = no
  // tocar. ValidateIf: las reglas de número solo aplican si no es null.
  @IsOptional()
  @ValidateIf((_, valor) => valor !== null)
  @IsInt()
  @IsPositive()
  tecnico_id?: number | null;
}
