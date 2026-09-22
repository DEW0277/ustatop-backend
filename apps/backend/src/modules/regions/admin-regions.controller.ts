import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { CreateRegionDto } from './dto/create-region.dto.js';
import { UpdateRegionDto } from './dto/update-region.dto.js';
import { RegionsService } from './regions.service.js';

@ApiTags('admin/regions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiErrorResponses(401, 403)
@Controller('admin/regions')
export class AdminRegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi viloyat yaratish (Admin)' })
  @ApiErrorResponses(409)
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Viloyatni tahrirlash (Admin)' })
  @ApiErrorResponses(404, 409)
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Viloyatni o‘chirish (Admin)' })
  // 409: viloyatda tumanlar yoki ustalar mavjud bo'lsa.
  @ApiErrorResponses(404, 409)
  remove(@Param('id') id: string) {
    return this.regionsService.remove(id);
  }
}
