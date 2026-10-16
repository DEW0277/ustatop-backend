import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, type User } from '@prisma/client';
import type { Redis } from 'ioredis';
import { hashPassword, verifyPassword } from '../../common/crypto/password.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { REDIS_CLIENT } from '../../common/redis/redis.constants.js';
import { FileCleanupService } from '../upload/file-cleanup.service.js';
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

// Admin paroli: bitta login uchun ketma-ket xato urinishlar cheklanadi (IP throttle'ga qo'shimcha —
// hujumchi IP almashtirsa ham bitta loginni cheksiz taxmin qila olmaydi).
const MAX_ADMIN_LOGIN_ATTEMPTS = 5;
const ADMIN_LOGIN_LOCK_SECONDS = 15 * 60;

function adminLoginAttemptsKey(login: string): string {
  return `admin-login:attempts:${login}`;
}

function roleToApi(role: Role): UserSession['role'] {
  return role.toLowerCase() as UserSession['role'];
}

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds: number;
  private readonly otpLength: number;
  // Login topilmaganda ham scrypt hisoblanadi — javob vaqti bo'yicha mavjud loginni aniqlab bo'lmasin.
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly smsProvider: SmsProvider,
    configService: ConfigService,
    private readonly fileCleanup: FileCleanupService,
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

    // Admin panelga faqat login + parol bilan kiriladi (`adminLogin`). Aks holda mock SMS rejimida
    // (kod doim 123456) admin raqamini bilgan har kim ADMIN tokenini olardi.
    if (user?.role === Role.ADMIN) {
      throw new ForbiddenException('Administrator faqat login va parol bilan kiradi');
    }

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

  async adminLogin(login: string, password: string): Promise<{ user: UserSession; token: string }> {
    const attemptsKey = adminLoginAttemptsKey(login);
    await this.assertNotLockedOut(attemptsKey);

    const user = await this.prisma.user.findUnique({ where: { login } });
    const canLogin = !!user && user.role === Role.ADMIN && !user.isBlocked && !!user.passwordHash;
    this.dummyHash ??= hashPassword('dummy-password');
    const passwordOk = await verifyPassword(password, canLogin ? user.passwordHash! : await this.dummyHash);

    if (!canLogin || !passwordOk) {
      await this.registerFailedAttempt(attemptsKey);
      // Sabab (login yo'q / parol xato / bloklangan) ataylab oshkor qilinmaydi.
      throw new UnauthorizedException("Login yoki parol noto'g'ri");
    }

    await this.redis.del(attemptsKey);

    const session = this.buildSession(user);
    return { user: session, token: session.token };
  }

  // `PUT /admin/me/password`. Xato urinishlar login bilan bir xil hisoblagichda — o'g'irlangan sessiya orqali
  // joriy parolni cheksiz taxmin qilib bo'lmaydi. 401 emas, 400: panel 401 da sessiyani tugatib yuboradi.
  async changeAdminPassword(userId: string, currentPassword: string, newPassword: string): Promise<{ changed: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.role !== Role.ADMIN || !user.login || !user.passwordHash) {
      throw new ForbiddenException("Parolni faqat login bilan kiradigan administrator almashtira oladi");
    }

    const attemptsKey = adminLoginAttemptsKey(user.login);
    await this.assertNotLockedOut(attemptsKey);

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      await this.registerFailedAttempt(attemptsKey);
      throw new BadRequestException({
        message: "Joriy parol noto'g'ri",
        errors: { currentPassword: ["Joriy parol noto'g'ri"] },
      });
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException({
        message: 'Yangi parol joriy paroldan farq qilishi kerak',
        errors: { newPassword: ['Yangi parol joriy paroldan farq qilishi kerak'] },
      });
    }

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
    await this.redis.del(attemptsKey);

    return { changed: true };
  }

  private async assertNotLockedOut(attemptsKey: string): Promise<void> {
    const attempts = Number((await this.redis.get(attemptsKey)) ?? 0);

    if (attempts >= MAX_ADMIN_LOGIN_ATTEMPTS) {
      const ttl = await this.redis.ttl(attemptsKey);
      throw new HttpException(
        `Juda ko'p xato urinish. ${Math.max(1, Math.ceil(ttl / 60))} daqiqadan keyin qayta urinib ko'ring`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async registerFailedAttempt(attemptsKey: string): Promise<void> {
    const failed = await this.redis.incr(attemptsKey);
    if (failed === 1) {
      await this.redis.expire(attemptsKey, ADMIN_LOGIN_LOCK_SECONDS);
    }
  }

  async getMe(userId: string): Promise<UserSession> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.buildSession(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserSession> {
    const previousAvatar =
      dto.avatarUrl !== undefined
        ? (await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarUrl: true } })).avatarUrl
        : null;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });

    // Eski avatar fayli omborda yetim qolmasin (faqat haqiqatan almashtirilgan bo'lsa).
    if (previousAvatar && previousAvatar !== user.avatarUrl) {
      await this.fileCleanup.deleteIfUnreferenced(previousAvatar);
    }

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
