import { ArrayUnique, IsArray, IsInt, IsPositive } from 'class-validator';

// PUT /grupos/:id/tecnicos y PUT /grupos/:id/sub-areas REEMPLAZAN la lista
// completa (no agregan de a uno): el formulario manda cómo debe quedar el
// grupo, y el backend borra lo anterior y guarda lo nuevo en una sola
// transacción. Una lista vacía deja el grupo sin integrantes / sin áreas.

export class AsignarTecnicosDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true }) // each: valida cada elemento del array
  @IsPositive({ each: true })
  tecnico_ids: number[];
}

export class AsignarSubAreasDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  sub_area_ids: number[];
}
