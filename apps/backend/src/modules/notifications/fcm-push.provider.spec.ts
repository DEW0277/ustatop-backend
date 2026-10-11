import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FcmPushProvider } from './fcm-push.provider.js';
import { createPushProvider } from './push-provider.factory.js';
import { LogPushProvider } from './log-push.provider.js';
import { InvalidPushTokenError } from './push.provider.js';

function config(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as never;
}

describe('FcmPushProvider', () => {
  const messaging = { send: vi.fn() };
  let provider: FcmPushProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new FcmPushProvider(messaging);
  });

  it("xabarni FCM formatida yuboradi, data bo'lmasa kalit qo'shilmaydi", async () => {
    await provider.send('tok', { title: 'Yangi buyurtma', body: 'Kran tuzatish' });

    expect(messaging.send).toHaveBeenCalledWith({
      token: 'tok',
      notification: { title: 'Yangi buyurtma', body: 'Kran tuzatish' },
    });
  });

  it("data berilsa uzatadi", async () => {
    await provider.send('tok', { title: 't', body: 'b', data: { orderId: 'o-1' } });

    expect(messaging.send).toHaveBeenCalledWith(expect.objectContaining({ data: { orderId: 'o-1' } }));
  });

  it.each(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])(
    "%s xatosini InvalidPushTokenError'ga aylantiradi",
    async (code) => {
      messaging.send.mockRejectedValue(Object.assign(new Error('fcm'), { code }));

      await expect(provider.send('tok', { title: 't', body: 'b' })).rejects.toBeInstanceOf(InvalidPushTokenError);
    },
  );

  it("vaqtinchalik xatolar (kvota, server) token yaroqsiz deb hisoblanmaydi", async () => {
    const error = Object.assign(new Error('quota'), { code: 'messaging/message-rate-exceeded' });
    messaging.send.mockRejectedValue(error);

    await expect(provider.send('tok', { title: 't', body: 'b' })).rejects.toBe(error);
  });
});

describe('createPushProvider', () => {
  it("PUSH_PROVIDER berilmasa yoki bo'sh bo'lsa mock (log) provider", () => {
    expect(createPushProvider(config({}))).toBeInstanceOf(LogPushProvider);
    expect(createPushProvider(config({ PUSH_PROVIDER: '' }))).toBeInstanceOf(LogPushProvider);
  });

  it("noma'lum qiymatda jimgina mock'ga tushmaydi — xato beradi", () => {
    expect(() => createPushProvider(config({ PUSH_PROVIDER: 'firebase' }))).toThrow(/PUSH_PROVIDER/);
  });

  it("fcm tanlanib kalitlar to'liq bo'lmasa ishga tushmaydi", () => {
    expect(() =>
      createPushProvider(config({ PUSH_PROVIDER: 'fcm', FIREBASE_PROJECT_ID: 'p', FIREBASE_CLIENT_EMAIL: '' })),
    ).toThrow(/FIREBASE_PRIVATE_KEY/);
  });
});
