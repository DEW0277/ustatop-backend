'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, authApi } from '@/lib/api-client';

interface SendOtpResult {
  message: string;
  timeoutSeconds: number;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700';
const buttonClass =
  'w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50';

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const phone = `+998${digits}`;

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await authApi<SendOtpResult>('/send-otp', { phone });
      setCooldown(result.timeoutSeconds);
      setCode('');
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kutilmagan xatolik');
    } finally {
      setPending(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await authApi('/verify-otp', { phone, code });
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kutilmagan xatolik');
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 p-6 shadow-sm dark:border-slate-800">
      <h1 className="text-xl font-bold text-indigo-600">UstaTop Admin</h1>
      <p className="mt-1 text-sm text-slate-500">
        {step === 'phone' ? 'Telefon raqamingizni kiriting' : `${phone} raqamiga yuborilgan kodni kiriting`}
      </p>

      {step === 'phone' ? (
        <form onSubmit={sendCode} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Telefon
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-slate-300 px-3 py-2 text-slate-500 dark:border-slate-700">+998</span>
              <input
                className={inputClass}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="901234567"
                maxLength={9}
                value={digits}
                onChange={(event) => setDigits(event.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
            </div>
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" className={buttonClass} disabled={pending || digits.length !== 9}>
            {pending ? 'Yuborilmoqda...' : 'Kod yuborish'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Tasdiqlash kodi
            <input
              className={`${inputClass} tracking-widest`}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" className={buttonClass} disabled={pending || code.length < 4}>
            {pending ? 'Tekshirilmoqda...' : 'Kirish'}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-slate-500 hover:underline" onClick={() => { setStep('phone'); setError(null); }}>
              Raqamni o&apos;zgartirish
            </button>
            <button type="button" className="text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline" disabled={cooldown > 0 || pending} onClick={() => sendCode()}>
              {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : 'Qayta yuborish'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
