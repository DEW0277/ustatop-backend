# AGENTS.md — UstaTop repo qoidalari

Ushbu fayl shu repoda ishlaydigan **har qanday AI agent** (Claude, Gemini yoki boshqa) uchun umumiy qoidalarni belgilaydi. To'liq arxitektura uchun [`docs/TZ.md`](docs/TZ.md)ga qarang. Claude'ga xos qo'shimcha qoidalar [`CLAUDE.md`](CLAUDE.md)da.

## 1. Loyiha stek (qisqacha)

- Backend: `apps/backend` — NestJS + TypeScript + Prisma 6 (**7 emas** — sabab pastda) + PostgreSQL + Redis
- Admin panel: `apps/web` — Next.js 16 (App Router) + TypeScript + TailwindCSS
- Umumiy tiplar: `packages/shared-types`
- Monorepo: Turborepo + pnpm workspaces

### Muhim texnik holatlar (scaffold vaqtida aniqlangan)

- **Prisma versiyasi qat'iy 6.x'ga pin qilingan** (`6.19.3`). Prisma 7 `datasource.url`ni schema'dan olib tashlagan va `prisma.config.ts` + driver adapter talab qiladi — bu katta paradigma o'zgarishi va ikkala AI agent uchun ham xato xavfini oshiradi. **Hech qachon `prisma`/`@prisma/client`ni 7.x ga yangilamang**, agar bu haqda alohida qaror qabul qilinmagan bo'lsa.
- **Backend ESM (`"type": "module"`, `moduleResolution: nodenext`) rejimida ishlaydi.** Har qanday lokal (relative) import `.js` kengaytmasi bilan yozilishi SHART, hatto manba `.ts` bo'lsa ham: `import { Foo } from './foo.service.js';`. Buni unutish build xatosiga olib keladi.
- Backend test/lint stack: **vitest** (Jest emas) va **oxlint** (ESLint emas) — `nest new` shablonining joriy versiyasi shunday keladi. Buyruqlar bir xil (`pnpm test`, `pnpm lint`), faqat asboblar zamonaviyroq.
- Global API prefix `api/v1` (`app.setGlobalPrefix('api/v1')`) — barcha endpointlar `docs/TZ.md`dagi kabi `/api/v1/...` ko'rinishida ishlaydi, Swagger `/api/docs`da.
- Global response format, xato filter va validatsiya allaqachon tayyor: `apps/backend/src/common/{interceptors,filters,pipes,decorators,prisma}/`. Yangi controller yozganda buni qayta yaratmang — mavjudidan foydalaning. Custom xabar kerak bo'lsa `@ResponseMessage('...')` dekoratoridan foydalaning.
- `JwtAuthGuard`/`RolesGuard` istalgan moduldan ishlatilishi mumkin — `common/auth/shared-auth.module.ts` (`@Global()`) `PassportModule`ni bir marta ro'yxatga oladi. Buni har bir modulga alohida import qilishga urinmang (avval xato bo'lgan, tuzatilgan).
- Dockerdagi Postgres porti **5455** (5432 va 5433 shu mashinada boshqa xizmatlar tomonidan band edi) — `docker-compose.yml` va `apps/backend/.env.example`ga qarang.
- `apps/web` ichida Next.js o'zi avtomatik yaratgan alohida `AGENTS.md`/`CLAUDE.md` bor (Next 16'ning training data'dan farqlari haqida ogohlantirish) — Next.js kodiga tegishli ishni boshlashdan oldin albatta shuni ham o'qing, uni o'chirmang yoki qo'lda tahrirlamang (`next dev` uni avtomatik qayta yozadi).
- **Bilinigan cheklov**: hech qanday controller mos kelmagan yo'llar (masalan `/api/v1/typo`) standart Express HTML 404 sahifasini qaytaradi, bizning JSON error formatimizda emas. Buni `main.ts`da `app.use()` catch-all bilan tuzatishga urinib ko'rilgan edi — Nest o'z router'ini `app.init()` bosqichida bog'laydi, shuning uchun catch-all yo hamma so'rovni oldindan tutib oladi (routes ishlamay qoladi), yo Nest'ning global exception filter zanjiridan tashqarida qoladi (xato HTML bo'lib chiqadi). Amaliyotda muammo emas — mijozlar faqat hujjatlashtirilgan endpointlarga murojaat qiladi. Buni qayta "tuzatishga" urinmang, agar chindan ham kerak bo'lsa, Nest'ning o'z `HttpAdapterHost` darajasidagi 404 handler API'sini o'rganib chiqing.

## 2. Modul tuzilishi (NestJS)

Har bir modul quyidagi shablonga qat'iy amal qiladi:

```
modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── dto/
│   ├── create-<name>.dto.ts
│   └── update-<name>.dto.ts
└── <name>.service.spec.ts
```

- Controller — faqat routing va Swagger dekoratorlar, biznes mantiq yo'q.
- Service — barcha biznes mantiq shu yerda, Prisma bilan to'g'ridan-to'g'ri ishlaydi.
- Har bir DTO `class-validator` dekoratorlari bilan to'liq validatsiya qilinishi shart (`@IsString()`, `@IsUUID()`, `@IsEnum()` va h.k.).

## 3. API javob formati (majburiy, `docs/TZ.md` va asl spec bo'yicha)

Har bir endpoint global interceptor orqali quyidagi formatga o'raladi — buni qo'lda controller ichida qaytarish shart emas:

```json
// Success
{ "success": true, "data": { ... }, "message": "...", "timestamp": "ISO-8601" }
// Error
{ "success": false, "message": "...", "statusCode": 400, "errors": { "field": ["..."] }, "timestamp": "ISO-8601" }
```

Bu `common/interceptors/response.interceptor.ts` va `common/filters/http-exception.filter.ts` orqali global qo'llaniladi — yangi modul yozganda buni qayta yozmang, mavjudidan foydalaning.

## 4. Xavfsizlik qoidalari (hech qachon buzilmaydi)

- `/api/v1/admin/*` — har doim `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`.
- Hech qachon parol/JWT secret/MinIO kalitlarini kodga yoki commit'ga yozmang — faqat `.env` orqali (`ConfigService`).
- Prisma orqali raw SQL yozishdan qoching (`$queryRawUnsafe` taqiqlangan); kerak bo'lsa parametrlashtirilgan `$queryRaw` ishlatiladi.
- Foydalanuvchidan kelgan har qanday `id` bilan DB'dan yozuv olishdan oldin, agar resurs egasi tekshirilishi kerak bo'lsa (masalan `PUT /masters/me/...`), albatta `req.user.id` bilan solishtiring — boshqa userning resursini o'zgartirib bo'lmasin.

## 5. Git va commit qoidalari

- Branch nomlash: `feat/<module>-<agent>` (masalan `feat/orders-claude`, `feat/regions-gemini`)
- Commit format — Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`, `refactor(scope): ...`
- Har bir PR tavsifida: nima o'zgardi, qaysi modulga tegishli, agar backend DTO o'zgargan bo'lsa — **"⚠️ Mobile app contract impact"** deb alohida belgilang (chunki mobil ilova alohida repoda, qo'lda sync qilinadi).
- `main` branch'ga to'g'ridan-to'g'ri commit qilinmaydi, faqat PR orqali.

## 6. Vazifa taqsimoti (murakkablik bo'yicha — batafsili `docs/TZ.md` §7.1)

- **Claude Sonnet 5**: Auth, Orders, Reviews, Masters biznes-mantiq, xavfsizlik-muhim kod, barcha PR review.
- **Gemini Flash**: Regions/Districts/Categories CRUD, DTO/Swagger boilerplate, seed data, Upload wiring, admin panelning oddiy CRUD sahifalari.

O'z zonangizdan tashqari modulga tegishli faylni o'zgartirishdan oldin, agar boshqa agent shu modulda ochiq branch/PR'ga ega bo'lsa — konflikt oldini olish uchun avval mavjud branch'larni tekshiring (`git branch -a`, `git log --all --oneline`).

## 7. Test va sifat nazorati

- Yangi service metodiga kamida bitta unit test (`*.service.spec.ts`) yozilishi shart.
- PR ochishdan oldin: `pnpm lint && pnpm test` xatosiz o'tishi kerak.
- Murakkab/kritik modullar (auth, orders status, rating hisoblash) uchun edge-case testlar majburiy (masalan: noto'g'ri OTP, muddati o'tgan token, ruxsatsiz status o'zgartirish).

## 8. Nima qilmaslik kerak

- Spec'da yo'q yangi endpoint yoki DB ustun qo'shmang — avval `docs/TZ.md`ni yangilang, keyin kod yozing.
- `node_modules`, `.env`, `dist`, `.next` kabi fayllarni commit qilmang (`.gitignore`da bor).
- Hech qachon `prisma migrate reset` yoki production DB'ga bevosita ulanishni so'ramasdan bajarmang.
