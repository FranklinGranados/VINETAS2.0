import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Un grupo de trabajo pertenece a una temporada (periodo). Integrantes y
// sub-áreas se asignan después, con PUT /grupos/:id/tecnicos y
// PUT /grupos/:id/sub-areas (ver AsignarTecnicosDto / AsignarSubAreasDto).
export class CreateGrupoDto {
  // Columna YEAR de MySQL: admite 1901–2155. Se acota a un rango realista
  // para atrapar errores de tipeo (ej. 206 en vez de 2026).
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodo: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;
}
