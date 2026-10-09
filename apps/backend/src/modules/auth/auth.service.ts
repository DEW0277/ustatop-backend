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
const MIN_OTP_LENGTH = 4;
const MAX_OTP_LENGTH = MOCK_OTP_CODE.length;
// Kod bo'shligi kichik (4-6 xona) bo'lgani uchun urinishlar cheklanmasa, `POST /auth/verify-otp`ni
// qayta-qayta chaqirib kodni taxmin qilib topish mumkin (ThrottlerGuard IP bo'yicha cheklaydi, bu esa
// bitta OTP kod uchun urinishlar sonini cheklaydi — ikkalasi birga ishlaydi).
const MAX_OTP_ATTEMPTS = 5;

function otpRedisKey(phone: string): string {
  return `otp:${phone}`;
}

function otpAttemptsKey(phone: string): string {
  return `otp:attempts:${phone}`;
}

function roleToApi(role: Role): UserSession['role'] {
  return role.toLowerCase() as UserSession['role'];
}

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds: number;
  private readonly otpLength: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly smsProvider: SmsProvider,
    configService: ConfigService,
  ) {
    this.otpTtlSeconds = Number(configService.get('OTP_TTL_SECONDS') ?? 120);
    const configuredLength = Number(configService.get('OTP_LENGTH') ?? MAX_OTP_LENGTH);
    this.otpLength = Math.min(MAX_OTP_LENGTH, Math.max(MIN_OTP_LENGTH, configuredLength));
  }

  async sendOtp(phone: string): Promise<{ message: string; timeoutSeconds: number }> {
    const key = otpRedisKey(phone);
    const remainingTtl = await this.redis.ttl(key);

    if (remainingTtl > 0) {
      throw new BadRequestException(
        `Keyingi urinish uchun ${remainingTtl} soniya kuting`,
      );
    }

    // Hozircha SMS_MODE=mock: kod doim '123456'ning OTP_LENGTH xonali boshi (6 -> 123456, 4 -> 1234).
    // Real provayder ulanganda bu yerda OTP_LENGTH xonali tasodifiy kod generatsiya qilinadi.
    const code = MOCK_OTP_CODE.slice(0, this.otpLength);
    await this.redis.set(key, code, 'EX', this.otpTtlSeconds);
    // Yangi kod uchun urinishlar hisobi tozalanadi (eskisi tabiiy tugagan yoki limitga yetib o'chirilgan bo'lishi mumkin).
    await this.redis.del(otpAttemptsKey(phone));
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
      const attemptsKey = otpAttemptsKey(phone);
      const attempts = await this.redis.incr(attemptsKey);

      if (attempts === 1) {
        await this.redis.expire(attemptsKey, this.otpTtlSeconds);
      }

      if (attempts >= MAX_OTP_ATTEMPTS) {
        // Kodni bekor qilamiz: qolgan TTL davomida taxmin qilishning ma'nosi qolmaydi,
        // foydalanuvchi darhol yangi kod so'rashi mumkin.
        await this.redis.del(key);
        throw new BadRequestException("Urinishlar soni oshib ketdi, yangi kod so'rang");
      }

      throw new BadRequestException("Kod noto'g'ri");
    }

    await this.redis.del(key);
    await this.redis.del(otpAttemptsKey(phone));

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

  // Bitta qurilma — bitta akkaunt: token boshqa foydalanuvchida turgan bo'lsa (shu telefonda avval boshqa
  // akkaunt bilan kirilgan), undan olib tashlanadi — aks holda begona bildirishnomalar shu qurilmaga kelardi.
  async registerFcmToken(userId: string, fcmToken: string): Promise<{ registered: true }> {
    await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { fcmToken, NOT: { id: userId } },
        data: { fcmToken: null },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { fcmToken } }),
    ]);

    return { registered: true };
  }

  async removeFcmToken(userId: string): Promise<{ registered: false }> {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });

    return { registered: false };
  }

  private buildSession(user: User): UserSession {
    const token = this.jwtService.sign({ sub: user.id });

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: roleToApi(user.role),
      avatarUrl: user.avatarUrl ?? undefined,
      token,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
