import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { ToggleFavoriteResponseDto } from './dto/toggle-favorite-response.dto.js';
import { FavoritesService } from './favorites.service.js';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiErrorResponses(401)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: "Joriy foydalanuvchining sevimli ustalari to'liq ro'yxati" })
  getFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.getFavorites(user.id);
  }

  @Get('ids')
  @ApiOperation({ summary: "Joriy foydalanuvchining sevimli ustalari ID lari ro'yxati" })
  @ApiResponse({ status: 200, type: [String] })
  getFavoriteIds(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.getFavoriteIds(user.id);
  }

  @Post(':masterId')
  @ApiOperation({ summary: "Ustani sevimlilarga qo'shish (idempotent)" })
  @ApiErrorResponses(400, 404)
  @ApiResponse({ status: 200, type: ToggleFavoriteResponseDto })
  addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('masterId', ParseUUIDPipe) masterId: string,
  ) {
    return this.favoritesService.addFavorite(user.id, masterId);
  }

  @Delete(':masterId')
  @ApiOperation({ summary: "Ustani sevimlilardan o'chirish (idempotent)" })
  @ApiErrorResponses(400)
  @ApiResponse({ status: 200, type: ToggleFavoriteResponseDto })
  removeFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('masterId', ParseUUIDPipe) masterId: string,
  ) {
    return this.favoritesService.removeFavorite(user.id, masterId);
  }
}
