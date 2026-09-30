import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CreateEquipoDto } from './create-equipo.dto';

// PartialType toma CreateEquipoDto y genera una clase idéntica pero con
// todos sus campos opcionales (@IsOptional() aplicado automáticamente).
// Es el equivalente a no repetir las reglas de validación entre el
// FormRequest de "store" y el de "update" en Laravel.
export class UpdateEquipoDto extends PartialType(CreateEquipoDto) {
  // Datos de calibración
  @IsOptional()
  @IsNumber()
  lrv?: number;

  @IsOptional()
  @IsNumber()
  hrv?: number;

  @IsOptional()
  @IsNumber()
  escala?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  eu?: string;

  // Identificación física
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  diametro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sello?: string;

  // Comportamiento y estado
  @IsOptional()
  @IsBoolean()
  cuadratico?: boolean;

  @IsOptional()
  @IsBoolean()
  en_uso?: boolean;

  @IsOptional()
  @IsBoolean()
  hibernacion?: boolean;

  @IsOptional()
  @IsBoolean()
  interviene_calidad?: boolean;
}
