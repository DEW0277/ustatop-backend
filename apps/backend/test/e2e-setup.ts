import { TEST_DATABASE_URL } from './e2e-db.js';

// Vitest `setupFiles`: har bir test fayli (worker) o'z spec faylini import qilishdan OLDIN
// ishga tushadi — shuning uchun `AppModule`ni import qiladigan har qanday spec fayli
// PrismaService test schema'siga ulanishini kafolatlaydi.
process.env.DATABASE_URL = TEST_DATABASE_URL;
