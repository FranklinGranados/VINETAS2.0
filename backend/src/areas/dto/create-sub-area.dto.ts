import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateSubAreaDto {
  @IsInt()
  @IsPositive()
  area_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;
}
