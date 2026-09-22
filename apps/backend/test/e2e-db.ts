// Dev ma'lumotlarini buzmaslik uchun e2e testlar bir xil Postgres serverida, lekin alohida
// schema'da ishlaydi (`?schema=test`). `.env`dagi boshqa o'zgaruvchilar (Redis, JWT_SECRET, ...)
// dev bilan baham ko'riladi — bu xavfsiz, chunki testlar o'ziga xos (unikal) telefon raqamlaridan
// foydalanadi va yaratgan qatorlarini o'zi tozalaydi.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://ustatop:ustatop_dev_pass@localhost:5455/ustatop_db?schema=test';
