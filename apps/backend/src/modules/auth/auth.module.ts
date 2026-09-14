import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { MockSmsProvider } from './sms/mock-sms.provider.js';
import { SmsProvider } from './sms/sms-provider.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // @nestjs/jwt expiresIn tipi `ms` paketining literal StringValue turini kutadi;
          // .env'dan kelayotgan umumiy string uchun runtime formatini o'zimiz kafolatlaymiz.
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ?? '30d') as unknown as number,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // SMS_MODE=mock hozircha qat'iy MockSmsProvider'ga bog'langan.
    // Real provider ulanganda: SMS_MODE qiymatiga qarab useClass tanlovchi factory yoziladi.
    { provide: SmsProvider, useClass: MockSmsProvider },
  ],
  exports: [AuthService],
})
export class AuthModule {}
