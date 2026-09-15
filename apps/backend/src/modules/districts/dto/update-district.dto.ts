import { PartialType } from '@nestjs/swagger';
import { CreateDistrictDto } from './create-district.dto.js';

export class UpdateDistrictDto extends PartialType(CreateDistrictDto) {}
