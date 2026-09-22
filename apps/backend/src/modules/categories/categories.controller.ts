import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { CategoriesService } from './categories.service.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha kategoriyalar ro‘yxatini olish (Public)' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta kategoriyani ID bo‘yicha olish (Public)' })
  @ApiErrorResponses(404)
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }
}
