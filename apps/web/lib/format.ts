export const UZ_MONTHS = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyn',
  'iyl',
  'avg',
  'sen',
  'okt',
  'noy',
  'dek',
] as const;

const tashkentFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tashkent',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
});

interface DateParts {
  day: number;
  monthIndex: number;
  year: string;
  hour: string;
  minute: string;
}

function parseDateParts(val: string | Date | null | undefined): DateParts | null {
  if (val === null || val === undefined || val === '') return null;
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;

  const parts = tashkentFormatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const day = Number.parseInt(map.day ?? '', 10);
  const monthNum = Number.parseInt(map.month ?? '', 10);
  if (Number.isNaN(day) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return null;
  }

  return {
    day,
    monthIndex: monthNum - 1,
    year: map.year ?? '',
    hour: map.hour ?? '00',
    minute: map.minute ?? '00',
  };
}

/**
 * Sanani "9-okt, 2026" formatida qaytaradi.
 * Vaqt zonasi har doim Asia/Tashkent (UTC+5).
 * Yaroqsiz sana berilsa "—" qaytaradi.
 */
export function formatDate(iso: string | Date | null | undefined): string {
  const parts = parseDateParts(iso);
  if (!parts) return '—';
  return `${parts.day}-${UZ_MONTHS[parts.monthIndex]}, ${parts.year}`;
}

/**
 * Sanani va vaqtni "9-okt, 2026, 14:05" formatida qaytaradi.
 * Vaqt zonasi har doim Asia/Tashkent (UTC+5).
 * Yaroqsiz sana berilsa "—" qaytaradi.
 */
export function formatDateTime(iso: string | Date | null | undefined): string {
  const parts = parseDateParts(iso);
  if (!parts) return '—';
  return `${parts.day}-${UZ_MONTHS[parts.monthIndex]}, ${parts.year}, ${parts.hour}:${parts.minute}`;
}

/**
 * Qisqa sana formatini "9-okt" qaytaradi (grafik o'qlari va jadvallar uchun).
 * Yaroqsiz sana berilsa "—" qaytaradi.
 */
export function formatShortDate(iso: string | Date | null | undefined): string {
  const parts = parseDateParts(iso);
  if (!parts) return '—';
  return `${parts.day}-${UZ_MONTHS[parts.monthIndex]}`;
}

/**
 * Narxni mobil ilovadagidek formatlaydi: "150 000 so'm" (minglar oddiy probel bilan), 0 — "Kelishuv asosida".
 */
export function formatPrice(price: number | null | undefined): string {
  if (!price || !Number.isFinite(price) || price <= 0) return 'Kelishuv asosida';
  const rounded = Math.round(price);
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;
}
