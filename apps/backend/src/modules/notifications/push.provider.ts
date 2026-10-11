export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Provider token endi hech qachon ishlamasligini aniqlasa (ilova o'chirilgan, token eskirgan) shu xatoni
// tashlaydi — NotificationsService tokenni bazadan o'chiradi. Vaqtinchalik xatolar oddiy Error bo'lib qoladi.
export class InvalidPushTokenError extends Error {
  constructor(message = 'Push token yaroqsiz') {
    super(message);
    this.name = 'InvalidPushTokenError';
  }
}

export abstract class PushProvider {
  abstract send(fcmToken: string, message: PushMessage): Promise<void>;
}
