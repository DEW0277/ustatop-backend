export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export abstract class PushProvider {
  abstract send(fcmToken: string, message: PushMessage): Promise<void>;
}
