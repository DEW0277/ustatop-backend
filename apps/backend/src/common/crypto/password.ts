import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SALT_BYTES = 16;
const KEY_BYTES = 64;

// Format: `scrypt$<salt hex>$<hash hex>`. Tashqi kutubxonasiz (Node `crypto.scrypt`, standart N=16384,r=8,p=1).
// DIQQAT: `prisma/seed.ts` birinchi admin parolini aynan shu formatda yozadi (production image'da `src/`
// yo'q, shuning uchun u yerda nusxasi bor) — formatni o'zgartirsangiz ikkalasini birga o'zgartiring.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password, salt, KEY_BYTES);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');

  if (scheme !== 'scrypt' || !saltHex || !hashHex) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length || KEY_BYTES);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
