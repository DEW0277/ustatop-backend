# UstaTop — Texnik Topshiriq (TZ) v1.0

> Ushbu hujjat loyihaning to'liq arxitekturasini belgilaydi. O'zgartirish kerak bo'lsa — shu faylni tahrirlang, chunki `AGENTS.md` va `CLAUDE.md` shu yerdagi qarorlarga tayanadi.

## 0. Holat (2026-09-15)

✅ Bajarildi (§7.3 roadmap 1-bosqich): Turborepo+pnpm monorepo, `apps/backend` (NestJS, Prisma 6 schema+migratsiya, global response/error format, Swagger, seed: 14 viloyat + 8 kategoriya + Toshkent shahri tumanlari), `apps/web` (Next.js skeleton), `docker-compose.yml` (Postgres/Redis/MinIO), GitHub private repo (https://github.com/DEW0277/ustatop-backend).

✅ Bajarildi (2-bosqich, Claude qismi): Auth modul — `POST /auth/send-otp`, `POST /auth/verify-otp`, `GET /auth/me`, `PUT /auth/profile` (PR #1, merge qilindi). Shared infra: `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser` (`apps/backend/src/common/`) — keyingi barcha modullar shulardan foydalanadi.

✅ Bajarildi (2-bosqich, Gemini qismi): Regions/Districts/Categories CRUD + admin endpointlar (PR #3, merge qilindi). Seed'ga barcha 14 viloyat uchun haqiqiy tumanlar qo'shildi (jami 207 ta). Review paytida topilgan `PassportModule` scoping xatosi (`JwtAuthGuard` boshqa modullarda ishlamayotgan edi) `common/auth/shared-auth.module.ts` bilan tuzatildi.

🔄 3-bosqich: Masters modul (Claude, `feat/masters-claude`) — kod tayyor, 50/50 test, jonli tekshirilgan; PR ochilishi GitHub auth'ni (`gh auth login`) yangilashni kutmoqda. Upload modul (Gemini) — issue tayyorlanadi, navbat Masters merge bo'lgach.

## 1. Loyiha haqida

**UstaTop** — O'zbekistondagi usta/mutaxassislarni mijozlar bilan bog'lovchi platforma. Uchta komponentdan iborat:

| Komponent | Maqsad | Holati |
|---|---|---|
| **Mobil ilova** (React Native/Expo) | Mijoz va usta uchun asosiy mahsulot | Allaqachon mavjud, **alohida repoda**, ushbu monorepoga kirmaydi |
| **Admin panel** (Next.js) | Platforma administratorlari uchun boshqaruv paneli | **Yangi quriladi**, shu monorepo ichida |
| **Backend API** (NestJS) | Ikkalasiga ham xizmat ko'rsatuvchi yagona REST API | **Yangi quriladi**, shu monorepo ichida |

Backend bitta bo'lib, `role` (CLIENT / MASTER / ADMIN) orqali huquqlar farqlanadi — mobil ilova CLIENT/MASTER uchun, admin panel esa faqat ADMIN role uchun ishlaydi.

## 2. Yakuniy texnologik stek

### Backend (`apps/backend`)
- **Framework**: NestJS + TypeScript
- **ORM**: Prisma **6.x** (7.x emas — datasource/config paradigmasi keskin o'zgargan, 6.x barqaror va keng hujjatlashtirilgan) + PostgreSQL 16
- **Cache/Session**: Redis (ioredis) — OTP saqlash, rate-limiting
- **Fayl saqlash**: MinIO (S3-compatible), dev'da docker-compose ichida, production'da Contabo VPS'dagi konteynerda
- **Auth**: Telefon + SMS OTP (hozircha **mock**, test kodi `123456`) + JWT (access + refresh)
- **Validatsiya**: class-validator / class-transformer, global `ValidationPipe`
- **API docs**: `@nestjs/swagger` → `/api/docs`
- **Push**: firebase-admin (FCM) — mobil ilovaga bildirishnoma
- **Rate limiting**: `@nestjs/throttler` + Redis store
- **Test**: Jest (unit) + Supertest (e2e)

### Admin Panel (`apps/web`)
- **Framework**: Next.js (App Router) + TypeScript
- **Stil**: TailwindCSS + shadcn/ui (komponentlar uchun)
- **Data fetching**: TanStack Query (React Query)
- **Form**: react-hook-form + zod
- **Auth**: Backend bilan bir xil OTP+JWT oqimi, lekin faqat `role: ADMIN`; JWT httpOnly cookie'da saqlanadi (Next.js Route Handler orqali backend proxy qilinadi — token brauzer JS'iga chiqmaydi)
- **Grafiklar**: dashboard statistikasi uchun recharts (yoki teng darajadagi kutubxona)

### Infratuzilma
- **Monorepo tool**: Turborepo + **pnpm** workspaces (tez, disk tejamkor, keshlash bilan build)
- **Dev muhit**: Docker Compose (Postgres — `localhost:5455` (5432/5433 shu mashinada band edi), Redis — `6379`, MinIO — `9000`/konsol `9001`)
- **Production**: Contabo VPS, Docker Compose (backend, web, postgres, redis, minio konteynerlari) + Nginx reverse proxy + Let's Encrypt (certbot)
- **CI**: GitHub Actions — har PR'da lint + test + build
- **Version control**: Git + GitHub (private repo, `gh` CLI orqali yaratiladi)

## 3. Monorepo tuzilishi

```
ustatop/
├── apps/
│   ├── backend/            # NestJS API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── regions/
│   │   │   │   ├── categories/
│   │   │   │   ├── masters/
│   │   │   │   ├── orders/
│   │   │   │   ├── reviews/
│   │   │   │   ├── upload/
│   │   │   │   └── admin/          # faqat ADMIN role uchun endpointlar
│   │   │   ├── common/             # global filter, interceptor, guard, decorator
│   │   │   └── main.ts
│   │   └── prisma/schema.prisma
│   └── web/                 # Next.js admin panel
│       ├── app/
│       └── components/
├── packages/
│   └── shared-types/        # Backend DTO'lari bilan bir xil TS interfeyslar (admin panel import qiladi)
├── docker-compose.yml
├── turbo.json
├── package.json
├── AGENTS.md
├── CLAUDE.md
└── docs/
    └── TZ.md
```

> **Eslatma**: Mobil ilova alohida repoda bo'lgani uchun `shared-types` package'ni avtomatik sinxronlashtirib bo'lmaydi. Backend DTO'lari o'zgarsa, mobil tomondagi `src/types/index.ts` va `src/services/api/client.ts` fayllari **qo'lda** yangilanishi kerak — bu haqda PR tavsifida alohida eslatma yozilishi shart.

## 4. Ma'lumotlar bazasi va API

Prisma schema va barcha REST endpoint kontraktlari **avvalgi spetsifikatsiya hujjatida** (`UstaTop Mobile App — Backend Blueprint`) to'liq belgilangan va **o'zgarishsiz kuchda qoladi**:
- `User`, `Region`, `District`, `Category`, `MasterProfile`, `MasterCategory`, `MasterService`, `PortfolioImage`, `Order`, `Review`, `FavoriteMaster` modellari
- `/api/v1/auth/*`, `/api/v1/regions`, `/api/v1/districts`, `/api/v1/categories`, `/api/v1/masters/*`, `/api/v1/orders/*`, `/api/v1/masters/:id/reviews`, `/api/v1/upload/single`

### 4.0. Mobil ilova kontrakti bilan moslashtirish (2026-09-19)

Mobil ilova kodi (`/Users/macstore.uz/Desktop/mobile-app/src/types/index.ts`, `src/services/api/*.ts`) o'qib chiqildi va backend javoblari **shu tiplarga aynan mos** qilindi. Original spec ba'zi joylarda jim yoki mobil kod bilan ziddiyatli edi — qarorlar:

**Backend tomonda moslashtirilgan (kod tayyor):**
- **Master javobi** mobil `Master` bilan bir xil kalitlarda: `id` (= MasterProfile.id), `fullName`, `avatarUrl` (User.avatarUrl, bo'lmasa `""`), `regionId`, `districtId`, `categoryIds: string[]`, `portfolioImages: string[]` (URL'lar, yangisi birinchi), `reviews[]` — tekis `{id, masterId, userId, userName, userAvatar, rating, comment, createdAt}`, `createdAt` ISO string. `telegram` yo'q bo'lsa kalit umuman yuborilmaydi.
- **UserSession**: `createdAt` (ISO) qo'shildi, `avatarUrl` yo'q bo'lsa yuborilmaydi (`null` emas), `role` — `'client' | 'master'` (admin faqat web panel uchun).
- **Telefon**: ilova `+998 90 123 45 67` (probelli) yuboradi — backend `NormalizedPhone` dekoratori bilan kiruvchi qiymatni `+998901234567` ga keltiradi (probelli, `998...`, 9 xonali variantlar ham qabul qilinadi). Javoblarda doim kanonik format.
- **OTP uzunligi**: ilovada 4 ta katak, spec'da 6 xonali. `OTP_LENGTH` env (4–6, default 6): mock kod `123456` ning boshi (6 → `123456`, 4 → `1234`); DTO 4–6 xonali kodni qabul qiladi. **Qaror kerak**: ilovani 6 katakka o'tkazish yoki prod'da `OTP_LENGTH=4`.
- **Usta bo'lish**: `PUT /masters/me/profile` — *upsert*; CLIENT/MASTER chaqira oladi; birinchi yaratilganda majburiy maydonlar (`firstName, lastName, bio, regionId, districtId, address, workingHours`), rol avtomatik `MASTER` ga o'tadi, `User.name` = `firstName lastName`. `categoryIds` berilsa kategoriyalar to'liq almashtiriladi. Qo'shimcha: `GET /masters/me/profile`.
- **Ilova ishlatadigan, spec'da yo'q endpointlar (qo'shildi)**: `PUT /masters/me/services/:serviceId` (xizmatni tahrirlash), `DELETE /masters/me/portfolio?url=...` (rasm URL bo'yicha o'chiriladi — ilovada rasmlar ID'siz).
- Qolganlari: `POST/DELETE /masters/me/services`, `POST /masters/me/portfolio`, `PATCH /masters/me/availability` — faqat MASTER; xizmat egaligi tekshiriladi. `GET /masters` bloklangan ustalarni ko'rsatmaydi; `sortBy`: `rating|reviews|orders|experience|newest`.

**Mobil ilova tomonida o'zgarishi kerak (backend'ga bog'liq emas):**
1. `API_BASE_URL` hozir `https://api.ustatop.uz/v1` — backend prefiksi `/api/v1` (yoki Nginx'da `/v1` → `/api/v1` rewrite).
2. `GET /masters` sahifalaydi (default `limit=20`, maks. 100), ilova esa `page/limit` yubormaydi — 20 tadan ortiq usta ko'rinmay qoladi. Ilovaga sahifalash qo'shish yoki `limit=100` yuborish kerak.
3. `authApi.updateProfile(data: Partial<UserSession>)` butun obyektni yuborishi mumkin; backend faqat `name`, `avatarUrl` qabul qiladi va begona maydonda 400 qaytaradi — faqat shu ikkitasini yuboring.
4. Ekranlar hali API qatlamidan emas, lokal store/mock'dan foydalanadi (`useMasterProfileStore`, `loginWithOtp` 4 xonali istalgan kodni qabul qiladi) — haqiqiy integratsiya alohida ish.
5. Keyingi modullar uchun kutilgan shakllar: `OrderItem` (`statusTextUz`, `masterName`, `masterAvatar`, `masterPhone` qo'shimcha maydonlari), `PUT /orders/:id/status` javobi `{ orderId, status }`, `POST /orders` → `OrderItem`.

### 4.1. Admin panel uchun qo'shimcha endpointlar (yangi)

Original spec faqat mobil ilova uchun edi — admin panelga quyidagi qo'shimcha endpointlar kerak:

| Endpoint | Tavsif |
|---|---|
| `GET /api/v1/admin/stats/dashboard` | Umumiy statistika: userlar soni, ustalar soni, status bo'yicha buyurtmalar soni, so'nggi 30 kunlik trend |
| `GET /api/v1/admin/users` | Foydalanuvchilar ro'yxati (filter: role, isBlocked, qidiruv) |
| `PATCH /api/v1/admin/users/:id/block` | Foydalanuvchini bloklash/blokdan chiqarish |
| `GET /api/v1/admin/masters/pending` | Tasdiqlanmagan (`isVerified: false`) ustalar ro'yxati |
| `PATCH /api/v1/admin/masters/:id/verify` | Ustani tasdiqlash (`isVerified: true`) |
| `GET /api/v1/admin/orders` | Barcha buyurtmalar (filter: status, sana oralig'i, viloyat) |
| `POST /api/v1/admin/regions`, `PUT .../:id`, `DELETE .../:id` | Viloyatlarni boshqarish (original spec'da faqat GET bor edi) |
| `POST /api/v1/admin/districts`, `PUT .../:id`, `DELETE .../:id` | Tumanlarni boshqarish |
| `POST /api/v1/admin/categories`, `PUT .../:id`, `DELETE .../:id` | Kategoriyalarni boshqarish |
| `DELETE /api/v1/admin/reviews/:id` | Nomaqbul sharhni o'chirish (moderatsiya) |

**Xavfsizlik qoidasi**: `/api/v1/admin/*` barcha endpointlar `JwtAuthGuard` + `RolesGuard(Role.ADMIN)` bilan himoyalanadi. ADMIN role'ga ega foydalanuvchi faqat qo'lda (seed yoki to'g'ridan-to'g'ri DB orqali) yaratiladi — ochiq ro'yxatdan o'tish orqali ADMIN bo'lib bo'lmaydi.

## 5. Xavfsizlik va operatsion qoidalar

1. SMS OTP hozircha **mock** (`123456`), lekin kod tuzilishi shundayki, `SmsProvider` interfeysi orqali keyinchalik Eskiz.uz ulash bitta faylni almashtirish bilan bo'lishi kerak (strategy pattern).
2. Rate limit: bitta telefon raqamidan 120 soniyada 1 marta OTP so'rovi (Redis TTL).
3. Barcha request body'lar DTO + `class-validator` orqali qat'iy tekshiriladi (`whitelist: true, forbidNonWhitelisted: true`).
4. Prisma indekslar: `master_profiles(regionId, districtId, rating)`, `orders(masterId, clientId, status)`.
5. JWT secret, MinIO kalitlari, DB parol — faqat `.env` da, hech qachon commit qilinmaydi (`.env.example` bilan taqqoslab tekshiriladi).
6. Admin panelda JWT httpOnly cookie'da, `SameSite=Lax`, `Secure` (production'da).

## 6. Deployment (Contabo VPS)

```
Internet → Nginx (TLS, reverse proxy)
              ├── /api/*  → backend konteyner (NestJS, port 3000)
              ├── /       → web konteyner (Next.js, port 3001)
              └── /uploads/* → MinIO konteyner (yoki MinIO'ning o'z public endpoint'i)
Docker tarmog'i ichida: postgres, redis, minio
```

CI/CD (keyingi bosqich, hozircha rejalashtiriladi): GitHub Actions → `main` branch'ga merge bo'lganda Contabo'ga SSH orqali `docker compose pull && up -d`.

## 7. Ikki AI agent bilan ishlash workflow'i

Loyiha **Antigravity** muharririda ikkita AI yordamida quriladi: **Claude Sonnet 5 (High)** va **Gemini (Flash)**. Batafsil qoidalar `AGENTS.md` va `CLAUDE.md`da, quyida — umumiy sxema:

### 7.1. Vazifa taqsimoti (murakkablik bo'yicha)

| Claude Sonnet 5 (arxitektor + reviewer) | Gemini Flash (tez ijrochi) |
|---|---|
| Auth modul (OTP+JWT+refresh, guard'lar) | Regions/Districts/Categories CRUD |
| Orders modul (status mashinasi, push trigger) | MasterService, PortfolioImage CRUD |
| Reviews modul (rating avtomatik hisoblash) | Barcha modullar uchun DTO + Swagger annotatsiyalar |
| Masters modul (verifikatsiya, availability) | Prisma seed script (14 viloyat, tumanlar, kategoriyalar) |
| Prisma schema va migratsiyalar review | Upload modul (multer + MinIO wiring, spec bo'yicha) |
| Admin auth/middleware (Next.js) | Admin panel oddiy CRUD sahifalari (jadval, forma) |
| **Barcha Gemini PR'larini review qilish va merge qilishdan oldin tasdiqlash** | Oddiy modullar uchun unit test boilerplate |

### 7.2. Git workflow

- `main` — himoyalangan, faqat PR orqali
- Branch nomlash: `feat/<module>-claude` yoki `feat/<module>-gemini` (masalan `feat/auth-claude`, `feat/regions-gemini`)
- Har bir PR: kamida bitta boshqa agent (yoki foydalanuvchi) tomonidan review qilinishi kerak
- Commit format: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`) + scope, masalan `feat(orders): add status transition guard`

### 7.3. Bosqichlar (MVP roadmap)

1. Monorepo scaffold + docker-compose + Prisma schema + migratsiya
2. Auth modul (Claude) + Regions/Districts/Categories (Gemini) — parallel
3. Masters modul + Upload modul
4. Orders modul + Reviews modul
5. Admin panel: auth + dashboard + users/masters boshqaruvi
6. Admin panel: regions/categories CRUD sahifalari
7. Swagger to'liqlashtirish, e2e testlar, xavfsizlik review
8. Contabo VPS'ga birinchi deploy
