import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role, User } from '@prisma/client';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { REDIS_CLIENT } from '../../common/redis/redis.constants.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SmsProvider } from './sms/sms-provider.js';
import type { UserSession } from './types/user-session.type.js';

const MOCK_OTP_CODE = '123456';

function otpRedisKey(phone: string): string {
  return `otp:${phone}`;
}

function roleToApi(role: Role): UserSession['role'] {
  return role.toLowerCase() as UserSession['role'];
}

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly smsProvider: SmsProvider,
    configService: ConfigService,
  ) {
    this.otpTtlSeconds = Number(configService.get('OTP_TTL_SECONDS') ?? 120);
  }

  async sendOtp(phone: string): Promise<{ message: string; timeoutSeconds: number }> {
    const key = otpRedisKey(phone);
    const remainingTtl = await this.redis.ttl(key);

    if (remainingTtl > 0) {
      throw new BadRequestException(
        `Keyingi urinish uchun ${remainingTtl} soniya kuting`,
      );
    }

    // Hozircha SMS_MODE=mock: kod doim ${MOCK_OTP_CODE}. Real provayder ulanganda
    // bu yerda tasodifiy 6 xonali kod generatsiya qilinadi.
    const code = MOCK_OTP_CODE;
    await this.redis.set(key, code, 'EX', this.otpTtlSeconds);
    await this.smsProvider.sendOtp(phone, code);

    return {
      message: `${phone} raqamiga tasdiqlash kodi yuborildi`,
      timeoutSeconds: this.otpTtlSeconds,
    };
  }

  async verifyOtp(phone: string, code: string): Promise<{ user: UserSession; token: string }> {
    const key = otpRedisKey(phone);
    const storedCode = await this.redis.get(key);

    if (!storedCode) {
      throw new BadRequestException("Kod muddati tugagan, qaytadan so'rang");
    }

    if (storedCode !== code) {
      throw new BadRequestException("Kod noto'g'ri");
    }

    await this.redis.del(key);

    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, name: 'Foydalanuvchi', isPhoneVerified: true },
      });
    } else if (!user.isPhoneVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
      });
    }

    const session = this.buildSession(user);
    return { user: session, token: session.token };
  }

  async getMe(userId: string): Promise<UserSession> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.buildSession(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserSession> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });

    return this.buildSession(user);
  }

  private buildSession(user: User): UserSession {
    const token = this.jwtService.sign({ sub: user.id });

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: roleToApi(user.role),
      avatarUrl: user.avatarUrl,
      token,
    };
  }
}
