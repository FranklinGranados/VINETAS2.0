import { PartialType } from '@nestjs/mapped-types';
import { CreateSubAreaDto } from './create-sub-area.dto';

export class UpdateSubAreaDto extends PartialType(CreateSubAreaDto) {}
