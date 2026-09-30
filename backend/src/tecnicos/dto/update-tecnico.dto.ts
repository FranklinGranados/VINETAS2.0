import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTecnicoDto } from './create-tecnico.dto';

export class UpdateTecnicoDto extends PartialType(CreateTecnicoDto) {
  // activo = false deshabilita al técnico sin borrar su historial de
  // viñetas ya generadas (ver decisión en database/schema.sql).
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
