import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';
import { ReviewsService } from './reviews.service.js';

@ApiTags('reviews')
@Controller('masters/:masterId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: "Ustaga berilgan sharhlar (Public)" })
  @ApiErrorResponses(404)
  findAll(@Param('masterId') masterId: string, @Query() query: ListReviewsQueryDto) {
    return this.reviewsService.findByMaster(masterId, query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Ustaga 1-5 baho va sharh qoldirish (qayta yuborilsa foydalanuvchining avvalgi sharhi yangilanadi)",
  })
  // 400: o'z profiliga sharh qoldirishga urinish.
  @ApiErrorResponses(400, 401, 403, 404)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('masterId') masterId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createOrUpdate(user.id, masterId, dto);
  }
}
