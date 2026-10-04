import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// Código de área / sub-área: 2 caracteres, números o letras (ej. "01",
// "1A" de Evaporador No. 1A). Forma el final del TAG (PT-0101), por eso
// el largo es fijo. Se pasa a mayúsculas ANTES de validar (@Transform).
export const REGLA_CODIGO = /^[0-9A-Z]{2}$/;
export const MENSAJE_CODIGO =
  'El código debe tener 2 caracteres (números o letras, ej. 01 o 1A)';
export const aMayusculas = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
export const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Datos de una sub-área: se reusan al crear un área con sus sub-áreas de
// una vez (CreateAreaDto.sub_areas), donde todavía no hay area_id.
export class SubAreaNuevaDto {
  @Transform(aMayusculas)
  @IsString()
  @Matches(REGLA_CODIGO, { message: MENSAJE_CODIGO })
  codigo: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;
}

// Agregar una sub-área a un área que ya existe (POST /sub-areas).
export class CreateSubAreaDto extends SubAreaNuevaDto {
  @IsInt()
  @IsPositive()
  area_id: number;
}
