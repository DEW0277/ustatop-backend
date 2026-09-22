import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { RegionsService } from './regions.service.js';

@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha viloyatlar ro‘yxatini olish (Public)' })
  findAll() {
    return this.regionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta viloyatni tumanlari bilan olish (Public)' })
  @ApiErrorResponses(404)
  findOne(@Param('id') id: string) {
    return this.regionsService.findOne(id);
  }
}
