import { IsDateString, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// A propósito NO extiende CreateVinetaDto ni con PartialType: el set de
// campos editables es distinto (más chico), no "los mismos pero opcionales".
// equipo_id no se reasigna nunca (como en el sistema legacy, Editar.cs),
// y tag/descripcion/informacion quedan congelados como foto histórica.
//
// Sí son editables (igual que el legacy en Editar.cs): fecha, técnico que
// realizó la inspección, próximo mantenimiento, y las notas de mantenimiento.
export class UpdateVinetaDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  tecnico_id?: number;

  @IsOptional()
  @IsDateString()
  proximo?: string;

  @IsOptional()
  @IsString()
  mantenimiento?: string;
}
