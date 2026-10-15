'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, authApi } from '@/lib/api-client';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700';
const buttonClass =
  'w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-50';

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await authApi('/login', { login: login.trim(), password });
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kutilmagan xatolik');
      setPassword('');
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 p-6 shadow-sm dark:border-slate-800">
      <h1 className="text-xl font-bold text-indigo-600">UstaTop Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Login va parolingizni kiriting</p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Login
          <input
            className={inputClass}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            autoFocus
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Parol
          <input
            className={inputClass}
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" className={buttonClass} disabled={pending || !login.trim() || !password}>
          {pending ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
