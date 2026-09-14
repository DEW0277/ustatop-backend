import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from './sms-provider.js';

@Injectable()
export class MockSmsProvider extends SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`[MOCK SMS] ${phone} -> kod: ${code} (haqiqiy SMS yuborilmadi)`);
  }
}
