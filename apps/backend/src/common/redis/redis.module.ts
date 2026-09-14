import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => new Redis(configService.getOrThrow<string>('REDIS_URL')),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
