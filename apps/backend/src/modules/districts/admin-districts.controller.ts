import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { DistrictsService } from './districts.service.js';
import { CreateDistrictDto } from './dto/create-district.dto.js';
import { UpdateDistrictDto } from './dto/update-district.dto.js';

@ApiTags('admin/districts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiErrorResponses(401, 403)
@Controller('admin/districts')
export class AdminDistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi tuman yaratish (Admin)' })
  // 404: berilgan regionId mavjud emas.
  @ApiErrorResponses(400, 404)
  create(@Body() dto: CreateDistrictDto) {
    return this.districtsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Tumanni tahrirlash (Admin)' })
  @ApiErrorResponses(400, 404)
  update(@Param('id') id: string, @Body() dto: UpdateDistrictDto) {
    return this.districtsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Tumanni o‘chirish (Admin)' })
  // 409: tumanda ustalar yoki buyurtmalar mavjud bo'lsa.
  @ApiErrorResponses(404, 409)
  remove(@Param('id') id: string) {
    return this.districtsService.remove(id);
  }
}
