import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Query param ?periodo=2026 compartido por /grupos y /dashboard/avance.
// Sin periodo, cada endpoint usa el año actual.
// @Type(() => Number): los query params llegan como string (ver
// FindVinetasQueryDto).
export class PeriodoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  periodo?: number;
}
