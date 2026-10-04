import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAdministradorDto {
  // Usuario del login: sin espacios ni tildes, para escribirlo sin dudas
  // (ej. "fgranados"). Al iniciar sesión no distingue mayúsculas (collation
  // _ci de MySQL). Misma regla que scripts/seed-admin.ts.
  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,50}$/, {
    message:
      'El usuario debe tener de 3 a 50 letras, números, punto, guion o guion bajo (sin espacios ni tildes)',
  })
  usuario: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  // Contraseña en texto plano: el service la hashea con bcrypt antes de
  // guardarla (nunca se persiste tal cual).
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // bcrypt ignora lo que pase de 72 bytes
  password: string;

  // Opcional: si este administrador también saca viñetas, se vincula a su
  // registro de técnico (uno a uno).
  @IsOptional()
  @IsInt()
  @IsPositive()
  tecnico_id?: number;
}
