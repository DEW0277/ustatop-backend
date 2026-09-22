import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { DistrictsService } from './districts.service.js';
import { GetDistrictsQueryDto } from './dto/get-districts-query.dto.js';

@ApiTags('districts')
@Controller('districts')
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha tumanlar ro‘yxatini olish (ixtiyoriy regionId filtri bilan) (Public)' })
  findAll(@Query() query: GetDistrictsQueryDto) {
    return this.districtsService.findAll(query.regionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta tumanni viloyati bilan olish (Public)' })
  @ApiErrorResponses(404)
  findOne(@Param('id') id: string) {
    return this.districtsService.findOne(id);
  }
}
