import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Bir marta: test schema/jadvallarni tayyorlaydi (prisma migrate deploy).
    globalSetup: ['./test/e2e-global-setup.ts'],
    // Har bir test fayli (worker) ishga tushishidan oldin: DATABASE_URL'ni test schema'ga yo'naltiradi.
    setupFiles: ['./test/e2e-setup.ts'],
    // Barcha e2e fayllar bitta Postgres schema'sini baham ko'radi — parallel ishga tushirilsa
    // bir-birining ma'lumotiga aralashib, beqaror (flaky) natija berardi.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
