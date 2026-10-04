import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAreaDto } from './create-area.dto';

// Sin sub_areas: al editar un área solo cambian sus propios datos; las
// sub-áreas se agregan/editan con /sub-areas.
export class UpdateAreaDto extends PartialType(
  OmitType(CreateAreaDto, ['sub_areas'] as const),
) {
  // true = el área NO cuenta para el avance del mantenimiento (Inicio y
  // grupos). Solo se cambia al editar: un área nueva siempre cuenta.
  @IsOptional()
  @IsBoolean()
  excluida_mantenimiento?: boolean;
}
