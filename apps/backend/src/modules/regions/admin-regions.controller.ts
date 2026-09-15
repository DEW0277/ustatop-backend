import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CreateRegionDto } from './dto/create-region.dto.js';
import { UpdateRegionDto } from './dto/update-region.dto.js';
import { RegionsService } from './regions.service.js';

@ApiTags('admin/regions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/regions')
export class AdminRegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi viloyat yaratish (Admin)' })
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Viloyatni tahrirlash (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Viloyatni o‘chirish (Admin)' })
  remove(@Param('id') id: string) {
    return this.regionsService.remove(id);
  }
}
