import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

// Campos requeridos al crear un equipo (ver comentario en database/schema.sql):
// los datos técnicos de calibración (lrv, hrv, marca, etc.) se completan
// después, al editar — acá solo pedimos lo mínimo para identificarlo.
export class CreateEquipoDto {
  @IsInt()
  @IsPositive()
  sub_area_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  tag: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  informacion: string;
}
