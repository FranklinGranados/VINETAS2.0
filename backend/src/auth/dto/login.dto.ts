import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  // Usuario del administrador (ej. "fgranados"). No distingue mayúsculas:
  // la columna usa una collation "_ci" (case-insensitive) en MySQL.
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  usuario: string;

  @IsString()
  @MinLength(1)
  password: string;
}
