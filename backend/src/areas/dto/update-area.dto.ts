import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAreaDto } from './create-area.dto';

export class UpdateAreaDto extends PartialType(CreateAreaDto) {
  // true = el área NO cuenta para el avance del mantenimiento (Inicio y
  // grupos). Solo se cambia al editar: un área nueva siempre cuenta.
  @IsOptional()
  @IsBoolean()
  excluida_mantenimiento?: boolean;
}
