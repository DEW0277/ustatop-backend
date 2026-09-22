'use client';

import { useEffect, useState } from 'react';

// Qidiruv maydonlari uchun: foydalanuvchi yozib bo'lguncha so'rov yubormaslik.
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
