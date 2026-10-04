import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  aMayusculas,
  MENSAJE_CODIGO,
  recortar,
  REGLA_CODIGO,
  SubAreaNuevaDto,
} from './create-sub-area.dto';

export class CreateAreaDto {
  @Transform(aMayusculas)
  @IsString()
  @Matches(REGLA_CODIGO, { message: MENSAJE_CODIGO })
  codigo: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  // Opcional: sub-áreas a crear junto con el área, en la MISMA operación
  // (si una falla, no queda el área creada a medias).
  // @ValidateNested + @Type: valida cada elemento con las reglas de
  // SubAreaNuevaDto (sin @Type, class-validator vería objetos sueltos y no
  // aplicaría esas reglas).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SubAreaNuevaDto)
  sub_areas?: SubAreaNuevaDto[];
}
