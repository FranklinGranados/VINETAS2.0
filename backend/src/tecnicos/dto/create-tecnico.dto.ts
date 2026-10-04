import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTecnicoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  // Código interno del empleado en el ingenio (UNIQUE). Opcional: no todos
  // los técnicos tienen uno asignado en el sistema de RR.HH.
  @IsOptional()
  @IsInt()
  @IsPositive()
  cod_empleado?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cargo?: string;

  // Identificador del empleado en el taller (columna "Pass" de v1; no es
  // una contraseña). Las contraseñas de administrador van en la tabla
  // administradores, no acá.
  @IsOptional()
  @IsString()
  @MaxLength(10)
  identificador?: string;

  // No incluimos "activo" acá: todo técnico nuevo arranca activo por
  // defecto (así lo define la BD). Se desactiva editando, no creando.
}
