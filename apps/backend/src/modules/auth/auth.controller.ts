import { Body, Controller, Delete, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { AuthService } from './auth.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';

// Global limit (100/daq) turli telefon raqamlari bilan OTP spam/enumeration'ni to'xtatish uchun
// yetarli emas — kirish endpointlari uchun qo'shimcha, qattiqroq IP bo'yicha chegara.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('send-otp')
  @ApiOperation({ summary: "Telefon raqamiga tasdiqlash kodi yuborish (SMS_MODE=mock: har doim 123456)" })
  @ApiErrorResponses(400, 429)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('verify-otp')
  @ApiOperation({ summary: "Kodni tasdiqlash — yangi foydalanuvchi avtomatik yaratiladi, token qaytadi" })
  @ApiErrorResponses(400, 403, 429)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('admin/login')
  @ApiOperation({ summary: 'Admin panelga login + parol bilan kirish (faqat ADMIN)' })
  @ApiErrorResponses(400, 401, 429)
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.login, dto.password);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: "O'z sessiyam haqida ma'lumot" })
  @ApiErrorResponses(401)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ summary: "Ism va/yoki avatar URL'ini yangilash" })
  @ApiErrorResponses(400, 401)
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('fcm-token')
  @ApiOperation({ summary: "Qurilma push (FCM) tokenini ro'yxatdan o'tkazish" })
  @ApiErrorResponses(400, 401)
  registerFcmToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterFcmTokenDto) {
    return this.authService.registerFcmToken(user.id, dto.fcmToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('fcm-token')
  @ApiOperation({ summary: "Qurilma push tokenini o'chirish (logout'da chaqiriladi)" })
  @ApiErrorResponses(401)
  removeFcmToken(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.removeFcmToken(user.id);
  }
}
