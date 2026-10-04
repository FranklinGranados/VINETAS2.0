import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateSubAreaDto } from './create-sub-area.dto';

export class UpdateSubAreaDto extends PartialType(CreateSubAreaDto) {
  // true = los equipos de esta sub-área llevan un TAG de formato propio que
  // se escribe completo (ej. Caldera Mitre). Lo define un administrador.
  @IsOptional()
  @IsBoolean()
  tag_especial?: boolean;
}
