# AGENTS.md — UstaTop repo qoidalari

Ushbu fayl shu repoda ishlaydigan **har qanday AI agent** (Claude, Gemini yoki boshqa) uchun umumiy qoidalarni belgilaydi. To'liq arxitektura uchun [`docs/TZ.md`](docs/TZ.md)ga qarang. Claude'ga xos qo'shimcha qoidalar [`CLAUDE.md`](CLAUDE.md)da.

## 1. Loyiha stek (qisqacha)

- Backend: `apps/backend` — NestJS + TypeScript + Prisma + PostgreSQL + Redis
- Admin panel: `apps/web` — Next.js (App Router) + TypeScript + TailwindCSS
- Umumiy tiplar: `packages/shared-types`
- Monorepo: Turborepo + pnpm workspaces

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
