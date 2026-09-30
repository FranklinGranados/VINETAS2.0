import { IsInt, IsPositive, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsInt()
  @IsPositive()
  cod_empleado: number;

  @IsString()
  @MinLength(1)
  password: string;
}
