import { IsDateString, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// Nota: NO incluye nvineta (autogenerado por la BD), ni periodo, tag,
// descripcion, informacion — esos los calcula/copia el service:
//   - periodo se deriva de fecha (año de fecha)
//   - tag/descripcion/informacion se copian del equipo al momento de crear
//     la viñeta (la "foto histórica" documentada en database/schema.sql)
export class CreateVinetaDto {
  @IsInt()
  @IsPositive()
  equipo_id: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  tecnico_id?: number;

  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsDateString()
  proximo?: string;

  @IsOptional()
  @IsString()
  mantenimiento?: string;
}
