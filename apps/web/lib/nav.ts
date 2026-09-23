// Yon paneldagi bo'limlar. Yangi sahifa qo'shganda shu yerga qator qo'shing.
export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Bosh sahifa' },
  { href: '/users', label: 'Foydalanuvchilar' },
  { href: '/masters', label: 'Ustalar' },
  { href: '/orders', label: 'Buyurtmalar' },
  { href: '/regions', label: 'Viloyatlar' },
  { href: '/districts', label: 'Tumanlar' },
  { href: '/categories', label: 'Kategoriyalar' },
];
