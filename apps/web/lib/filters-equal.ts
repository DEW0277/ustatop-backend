/**
 * Ikki filtr obyektining shallow (tekis) tengligini tekshiradi.
 * Forma mount bo'lganda `onChange` chaqirilsa, filtrlar o'zgarmagan bo'lsa
 * URL'dagi sahifa (page) bekor qilinishining oldini olish uchun ishlatiladi.
 */
export function areFiltersEqual<T extends Record<string, unknown>>(
  prev: T,
  next: T,
): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) {
      return false;
    }
    if (prev[key] !== next[key]) {
      return false;
    }
  }

  return true;
}
