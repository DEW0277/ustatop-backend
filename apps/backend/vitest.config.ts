import { configDefaults, defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // `*.e2e-spec.ts` ham `*.spec.ts` bilan tugaydi — ular alohida (haqiqiy DB/Redis kerak
    // bo'ladigan, sekinroq) to'plam, shuning uchun oddiy `pnpm test`ga qo'shilmasligi kerak
    // (`pnpm test:e2e` -> vitest.config.e2e.ts orqali ishga tushadi).
    exclude: [...configDefaults.exclude, '**/*.e2e-spec.ts'],
  },
});
