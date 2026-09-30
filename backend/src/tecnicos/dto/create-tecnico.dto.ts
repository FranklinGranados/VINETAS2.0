import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTecnicoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  // Código interno del empleado en el ingenio. Opcional: no todos los
  // técnicos tienen uno asignado en el sistema de RR.HH. Pero es
  // obligatorio si el técnico va a poder iniciar sesión (ver "password"
  // abajo) — sin código no hay con qué loguearse.
  @IsOptional()
  @IsInt()
  @IsPositive()
  cod_empleado?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cargo?: string;

  // Contraseña en texto plano recibida del cliente — TecnicosService la
  // hashea con bcrypt antes de guardarla (nunca se persiste tal cual).
  // Opcional: la mayoría de técnicos de campo nunca inicia sesión, así
  // que no tienen por qué tener una.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  // Solo tiene efecto real si además se manda "password" (sin contraseña
  // no hay forma de autenticarse, sin importar este valor).
  @IsOptional()
  @IsBoolean()
  es_admin?: boolean;

  // No incluimos "activo" acá: todo técnico nuevo arranca activo por
  // defecto (así lo define la BD). Se desactiva editando, no creando.
}
