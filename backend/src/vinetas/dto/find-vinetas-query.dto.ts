import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

// Query params llegan siempre como string ("?periodo=2026"). @Type(() => Number)
// le dice a class-transformer que los convierta a number ANTES de validarlos
// con @IsInt() — sin esto, "2026" (string) fallaría la validación de entero.
export class FindVinetasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  equipo_id?: number;
}
