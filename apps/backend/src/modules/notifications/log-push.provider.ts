import { Injectable, Logger } from '@nestjs/common';
import { PushMessage, PushProvider } from './push.provider.js';

@Injectable()
export class LogPushProvider extends PushProvider {
  private readonly logger = new Logger(LogPushProvider.name);

  async send(fcmToken: string, message: PushMessage): Promise<void> {
    this.logger.log(`[MOCK PUSH] ${fcmToken.slice(0, 12)}... -> ${message.title}: ${message.body}`);
  }
}
