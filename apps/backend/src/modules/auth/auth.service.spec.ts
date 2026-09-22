import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

function createDeps() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  };
  const redis = {
    ttl: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
  };
  const jwtService = { sign: vi.fn().mockReturnValue('signed.jwt.token') };
  const smsProvider = { sendOtp: vi.fn() };
  const configService = { get: vi.fn().mockReturnValue(120) };

  return { prisma, redis, jwtService, smsProvider, configService };
}

describe('AuthService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: AuthService;

  beforeEach(() => {
    deps = createDeps();
    service = new AuthService(
      deps.prisma as never,
      deps.redis as never,
      deps.jwtService as never,
      deps.smsProvider as never,
      deps.configService as never,
    );
  });

  describe('sendOtp', () => {
    it("hali muddati o'tmagan kod bo'lsa qayta so'rovni rad etadi", async () => {
      deps.redis.ttl.mockResolvedValue(90);

      await expect(service.sendOtp('+998901234567')).rejects.toBeInstanceOf(BadRequestException);
      expect(deps.redis.set).not.toHaveBeenCalled();
      expect(deps.smsProvider.sendOtp).not.toHaveBeenCalled();
    });

    it("OTP_LENGTH=4 bo'lsa mock kod 4 xonali bo'ladi (mobil ilovadagi 4 katak uchun)", async () => {
      deps.configService.get.mockImplementation((key: string) => (key === 'OTP_LENGTH' ? 4 : 120));
      const shortService = new AuthService(
        deps.prisma as never,
        deps.redis as never,
        deps.jwtService as never,
        deps.smsProvider as never,
        deps.configService as never,
      );
      deps.redis.ttl.mockResolvedValue(-2);

      await shortService.sendOtp('+998901234567');

      expect(deps.redis.set).toHaveBeenCalledWith('otp:+998901234567', '1234', 'EX', 120);
    });

    it("kod yo'q bo'lsa yangi OTP saqlaydi va SMS yuboradi", async () => {
      deps.redis.ttl.mockResolvedValue(-2);

      const result = await service.sendOtp('+998901234567');

      expect(deps.redis.set).toHaveBeenCalledWith('otp:+998901234567', '123456', 'EX', 120);
      expect(deps.smsProvider.sendOtp).toHaveBeenCalledWith('+998901234567', '123456');
      expect(result.timeoutSeconds).toBe(120);
    });
  });

  describe('verifyOtp', () => {
    it("Redis'da kod topilmasa xato qaytaradi", async () => {
      deps.redis.get.mockResolvedValue(null);

      await expect(service.verifyOtp('+998901234567', '123456')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("kod mos kelmasa xato qaytaradi va foydalanuvchi yaratilmaydi", async () => {
      deps.redis.get.mockResolvedValue('123456');

      await expect(service.verifyOtp('+998901234567', '000000')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(deps.prisma.user.create).not.toHaveBeenCalled();
      expect(deps.redis.del).not.toHaveBeenCalledWith('otp:+998901234567');
    });

    it("birinchi noto'g'ri urinishda hisoblagichga TTL qo'yiladi", async () => {
      deps.redis.get.mockResolvedValue('123456');
      deps.redis.incr.mockResolvedValue(1);

      await expect(service.verifyOtp('+998901234567', '000000')).rejects.toBeInstanceOf(BadRequestException);

      expect(deps.redis.expire).toHaveBeenCalledWith('otp:attempts:+998901234567', 120);
    });

    it("5-urinishdan keyin kodni bekor qiladi (bruteforce himoyasi)", async () => {
      deps.redis.get.mockResolvedValue('123456');
      deps.redis.incr.mockResolvedValue(5);

      await expect(service.verifyOtp('+998901234567', '000000')).rejects.toThrow(/Urinishlar soni oshib ketdi/);

      expect(deps.redis.del).toHaveBeenCalledWith('otp:+998901234567');
    });

    it("to'g'ri kod va yangi telefon uchun foydalanuvchi yaratadi", async () => {
      deps.redis.get.mockResolvedValue('123456');
      deps.prisma.user.findUnique.mockResolvedValue(null);
      deps.prisma.user.create.mockResolvedValue({
        id: 'user-1',
        phone: '+998901234567',
        name: 'Foydalanuvchi',
        role: 'CLIENT',
        avatarUrl: null,
        isPhoneVerified: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await service.verifyOtp('+998901234567', '123456');

      expect(deps.redis.del).toHaveBeenCalledWith('otp:+998901234567');
      expect(deps.prisma.user.create).toHaveBeenCalled();
      expect(result.user.role).toBe('client');
      expect(result.token).toBe('signed.jwt.token');
    });

    it("to'g'ri kod va mavjud foydalanuvchi uchun qayta yaratmaydi", async () => {
      deps.redis.get.mockResolvedValue('123456');
      deps.prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+998901234567',
        name: 'Alisher',
        role: 'MASTER',
        avatarUrl: null,
        isPhoneVerified: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await service.verifyOtp('+998901234567', '123456');

      expect(deps.prisma.user.create).not.toHaveBeenCalled();
      expect(deps.prisma.user.update).not.toHaveBeenCalled();
      expect(result.user.role).toBe('master');
    });
  });

  describe('updateProfile', () => {
    it("faqat berilgan maydonlarni yangilaydi", async () => {
      deps.prisma.user.update.mockResolvedValue({
        id: 'user-1',
        phone: '+998901234567',
        name: 'Yangi ism',
        role: 'CLIENT',
        avatarUrl: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await service.updateProfile('user-1', { name: 'Yangi ism' });

      expect(deps.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Yangi ism' },
      });
    });
  });
});
