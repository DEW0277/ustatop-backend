import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { ListMastersQueryDto } from './dto/list-masters-query.dto.js';
import { MastersService } from './masters.service.js';

@ApiTags('masters')
@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  @Get()
  @ApiOperation({ summary: "Filtrlangan ustalar ro'yxati (Public)" })
  findAll(@Query() query: ListMastersQueryDto) {
    return this.mastersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Bitta usta haqida to'liq ma'lumot (Public)" })
  @ApiErrorResponses(404)
  findOne(@Param('id') id: string) {
    return this.mastersService.findOne(id);
  }
}
