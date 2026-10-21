import { BadRequestException, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '../../common/crypto/password.js';
import { ADMIN_TOKEN_TTL_SECONDS, AuthService } from './auth.service.js';

function createDeps() {
  const $transaction = vi.fn(async (operations: unknown[]) => Promise.all(operations));
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    $transaction,
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
  const fileCleanup = { deleteIfUnreferenced: vi.fn() };

  return { prisma, redis, jwtService, smsProvider, configService, fileCleanup };
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
      deps.fileCleanup as never,
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
        deps.fileCleanup as never,
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

  describe('verifyOtp (admin)', () => {
    it("ADMIN akkaunti OTP bilan kira olmaydi (mock SMS'da 123456 admin tokenini bermasin)", async () => {
      deps.redis.get.mockResolvedValue('123456');
      deps.prisma.user.findUnique.mockResolvedValue({ id: 'a-1', phone: '+998900000001', role: 'ADMIN' });

      await expect(service.verifyOtp('+998900000001', '123456')).rejects.toBeInstanceOf(ForbiddenException);
      expect(deps.jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('adminLogin', () => {
    const adminRow = async (overrides: Record<string, unknown> = {}) => ({
      id: 'a-1',
      phone: '+998900000001',
      name: 'Administrator',
      role: 'ADMIN',
      avatarUrl: null,
      isBlocked: false,
      login: 'admin',
      passwordHash: await hashPassword('to-g-ri-parol'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    });

    beforeEach(() => {
      deps.redis.get.mockResolvedValue(null);
    });

    it("to'g'ri login va parol bilan admin sessiyasini qaytaradi va urinishlar hisobini tozalaydi", async () => {
      deps.prisma.user.findUnique.mockResolvedValue(await adminRow());

      const result = await service.adminLogin('admin', 'to-g-ri-parol');

      expect(deps.prisma.user.findUnique).toHaveBeenCalledWith({ where: { login: 'admin' } });
      expect(result.user.role).toBe('admin');
      expect(result.token).toBe('signed.jwt.token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(deps.redis.del).toHaveBeenCalledWith('admin-login:attempts:admin');
    });

    it("noto'g'ri parol: 401, urinish sanaladi va birinchi xatoda blok muddati qo'yiladi", async () => {
      deps.prisma.user.findUnique.mockResolvedValue(await adminRow());

      await expect(service.adminLogin('admin', 'xato-parol')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(deps.redis.incr).toHaveBeenCalledWith('admin-login:attempts:admin');
      expect(deps.redis.expire).toHaveBeenCalledWith('admin-login:attempts:admin', 900);
      expect(deps.jwtService.sign).not.toHaveBeenCalled();
    });

    it.each([
      ["login mavjud emas", null],
      ["ADMIN emas (login/parol tasodifan qo'yilgan usta)", { role: 'MASTER' }],
      ["bloklangan admin", { isBlocked: true }],
      ["paroli o'rnatilmagan admin", { passwordHash: null }],
    ])("%s — to'g'ri parol bilan ham bir xil 401", async (_name, overrides) => {
      deps.prisma.user.findUnique.mockResolvedValue(overrides ? await adminRow(overrides) : null);

      await expect(service.adminLogin('admin', 'to-g-ri-parol')).rejects.toMatchObject({
        status: 401,
        message: "Login yoki parol noto'g'ri",
      });
      expect(deps.redis.incr).toHaveBeenCalled();
    });

    it("5 ta xato urinishdan keyin to'g'ri parol ham qabul qilinmaydi (429), baza so'ralmaydi", async () => {
      deps.redis.get.mockResolvedValue('5');
      deps.redis.ttl.mockResolvedValue(600);

      const error = await service.adminLogin('admin', 'to-g-ri-parol').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      expect(deps.prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('admin sessiyasi (12 soat, yangilanmaydi)', () => {
    const adminRow = async () => ({
      id: 'a-1',
      phone: '+998900000001',
      name: 'Administrator',
      role: 'ADMIN',
      avatarUrl: null,
      isBlocked: false,
      login: 'admin',
      passwordHash: await hashPassword('to-g-ri-parol'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const clientRow = {
      id: 'c-1',
      phone: '+998901234567',
      name: 'Mijoz',
      role: 'CLIENT',
      avatarUrl: null,
      isPhoneVerified: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const realJwt = () => new JwtService({ secret: 'x'.repeat(32), signOptions: { expiresIn: '30d' } });
    const withRealJwt = () =>
      new AuthService(
        deps.prisma as never,
        deps.redis as never,
        realJwt() as never,
        deps.smsProvider as never,
        deps.configService as never,
        deps.fileCleanup as never,
      );
    const lifetime = (token: string) => {
      const payload = realJwt().decode(token) as { exp: number; iat: number };
      return payload.exp - payload.iat;
    };

    it('ADMIN_TOKEN_TTL_SECONDS 12 soat', () => {
      expect(ADMIN_TOKEN_TTL_SECONDS).toBe(43_200);
    });

    it('adminLogin tokeni 12 soat amal qiladi', async () => {
      deps.redis.get.mockResolvedValue(null);
      deps.prisma.user.findUnique.mockResolvedValue(await adminRow());

      const result = await withRealJwt().adminLogin('admin', 'to-g-ri-parol');

      expect(lifetime(result.token)).toBe(43_200);
    });

    it('verifyOtp (CLIENT) tokeni modul standarti bo\'yicha 30 kun amal qiladi', async () => {
      deps.redis.get.mockResolvedValue('123456');
      deps.prisma.user.findUnique.mockResolvedValue(clientRow);

      const result = await withRealJwt().verifyOtp('+998901234567', '123456');

      expect(lifetime(result.token)).toBe(2_592_000);
    });

    it("getMe ADMIN uchun token bermaydi (12 soatlik cheklov /auth/me orqali uzaytirilmasin)", async () => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue(await adminRow());

      const session = await service.getMe('a-1');

      expect(session).not.toHaveProperty('token');
      expect(session.role).toBe('admin');
      expect(deps.jwtService.sign).not.toHaveBeenCalled();
    });

    it('getMe CLIENT uchun token beradi (mobil kontrakt o\'zgarmagan)', async () => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue(clientRow);

      const session = await service.getMe('c-1');

      expect(session.token).toBe('signed.jwt.token');
    });

    it('updateProfile ADMIN uchun ham tokensiz', async () => {
      deps.prisma.user.update.mockResolvedValue(await adminRow());

      const session = await service.updateProfile('a-1', { name: 'Yangi' });

      expect(session).not.toHaveProperty('token');
      expect(deps.jwtService.sign).not.toHaveBeenCalled();
    });

    it('updateProfile CLIENT uchun token beradi', async () => {
      deps.prisma.user.update.mockResolvedValue(clientRow);

      const session = await service.updateProfile('c-1', { name: 'Yangi' });

      expect(session.token).toBe('signed.jwt.token');
    });
  });

  describe('changeAdminPassword', () => {
    const admin = async () => ({
      id: 'a-1',
      role: 'ADMIN',
      login: 'admin',
      passwordHash: await hashPassword('joriy-parol-123'),
    });

    beforeEach(() => {
      deps.redis.get.mockResolvedValue(null);
    });

    it("joriy parol to'g'ri bo'lsa yangi xeshni saqlaydi va urinishlar hisobini tozalaydi", async () => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue(await admin());

      expect(await service.changeAdminPassword('a-1', 'joriy-parol-123', 'yangi-parol-456')).toEqual({ changed: true });

      const saved = deps.prisma.user.update.mock.calls[0][0];
      expect(saved.where).toEqual({ id: 'a-1' });
      expect(saved.data.passwordHash).toMatch(/^scrypt\$/);
      expect(await verifyPassword('yangi-parol-456', saved.data.passwordHash)).toBe(true);
      expect(deps.redis.del).toHaveBeenCalledWith('admin-login:attempts:admin');
    });

    it("joriy parol noto'g'ri — 400 (401 emas) va urinish sanaladi", async () => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue(await admin());

      await expect(service.changeAdminPassword('a-1', 'xato', 'yangi-parol-456')).rejects.toBeInstanceOf(BadRequestException);
      expect(deps.redis.incr).toHaveBeenCalledWith('admin-login:attempts:admin');
      expect(deps.prisma.user.update).not.toHaveBeenCalled();
    });

    it("yangi parol joriysi bilan bir xil bo'lsa 400", async () => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue(await admin());

      await expect(
        service.changeAdminPassword('a-1', 'joriy-parol-123', 'joriy-parol-123'),
      ).rejects.toMatchObject({ response: { errors: { newPassword: expect.any(Array) } } });
      expect(deps.prisma.user.update).not.toHaveBeenCalled();
    });

    it("blok holatida (5 xato) to'g'ri parol bilan ham 429, parol tekshirilmaydi", async () => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue(await admin());
      deps.redis.get.mockResolvedValue('5');
      deps.redis.ttl.mockResolvedValue(300);

      await expect(service.changeAdminPassword('a-1', 'joriy-parol-123', 'yangi-parol-456')).rejects.toMatchObject({
        status: 429,
      });
      expect(deps.prisma.user.update).not.toHaveBeenCalled();
    });

    it("login/parolsiz akkaunt uchun 403", async () => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'a-2', role: 'ADMIN', login: null, passwordHash: null });

      await expect(service.changeAdminPassword('a-2', 'x', 'yangi-parol-456')).rejects.toBeInstanceOf(ForbiddenException);
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

    it("avatar almashtirilsa eski faylni tozalashga yuboradi; o'zgarmasa yoki avatar berilmasa — yo'q", async () => {
      const row = (avatarUrl: string | null) => ({
        id: 'user-1',
        phone: '+998901234567',
        name: 'Ism',
        role: 'CLIENT',
        avatarUrl,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      deps.prisma.user.findUniqueOrThrow.mockResolvedValue({ avatarUrl: 'http://s/old.png' });
      deps.prisma.user.update.mockResolvedValue(row('http://s/new.png'));
      await service.updateProfile('user-1', { avatarUrl: 'http://s/new.png' });
      expect(deps.fileCleanup.deleteIfUnreferenced).toHaveBeenCalledWith('http://s/old.png');

      deps.fileCleanup.deleteIfUnreferenced.mockClear();
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue({ avatarUrl: 'http://s/new.png' });
      await service.updateProfile('user-1', { avatarUrl: 'http://s/new.png' });
      expect(deps.fileCleanup.deleteIfUnreferenced).not.toHaveBeenCalled();

      deps.prisma.user.findUniqueOrThrow.mockClear();
      await service.updateProfile('user-1', { name: 'Ism' });
      expect(deps.prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(deps.fileCleanup.deleteIfUnreferenced).not.toHaveBeenCalled();
    });
  });

  describe('fcm token', () => {
    it("tokenni saqlaydi va shu token turgan boshqa akkauntlardan olib tashlaydi (bitta tranzaksiyada)", async () => {
      const result = await service.registerFcmToken('u-1', 'device-token');

      expect(deps.prisma.user.updateMany).toHaveBeenCalledWith({
        where: { fcmToken: 'device-token', NOT: { id: 'u-1' } },
        data: { fcmToken: null },
      });
      expect(deps.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { fcmToken: 'device-token' },
      });
      expect(deps.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ registered: true });
    });

    it("removeFcmToken faqat joriy foydalanuvchining tokenini tozalaydi", async () => {
      const result = await service.removeFcmToken('u-1');

      expect(deps.prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { fcmToken: null },
      });
      expect(result).toEqual({ registered: false });
    });
  });
});
