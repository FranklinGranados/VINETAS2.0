import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Solo se puede renombrar. El periodo NO se cambia: un grupo pertenece a
// una temporada, y moverlo de año arrastraría integrantes y sub-áreas que
// en el otro año pueden ya estar asignados a otros grupos.
export class UpdateGrupoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nombre: string;
}
