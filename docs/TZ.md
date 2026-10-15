# UstaTop — Texnik Topshiriq (TZ) v1.0

> Ushbu hujjat loyihaning to'liq arxitekturasini belgilaydi. O'zgartirish kerak bo'lsa — shu faylni tahrirlang, chunki `AGENTS.md` va `CLAUDE.md` shu yerdagi qarorlarga tayanadi.

## 0. Holat (2026-10-16)

> Qolgan ishlarning jonli ro'yxati — [`TASKS.md`](../TASKS.md). Bu bo'lim faqat tugagan bosqichlar tarixi.

✅ Bajarildi (§7.3 roadmap 1-bosqich): Turborepo+pnpm monorepo, `apps/backend` (NestJS, Prisma 6 schema+migratsiya, global response/error format, Swagger, seed: 14 viloyat + 8 kategoriya + Toshkent shahri tumanlari), `apps/web` (Next.js skeleton), `docker-compose.yml` (Postgres/Redis/MinIO), GitHub private repo (https://github.com/DEW0277/ustatop-backend).

✅ Bajarildi (2-bosqich, Claude qismi): Auth modul — `POST /auth/send-otp`, `POST /auth/verify-otp`, `GET /auth/me`, `PUT /auth/profile` (PR #1, merge qilindi). Shared infra: `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser` (`apps/backend/src/common/`) — keyingi barcha modullar shulardan foydalanadi.

✅ Bajarildi (2-bosqich, Gemini qismi): Regions/Districts/Categories CRUD + admin endpointlar (PR #3, merge qilindi). Seed'ga barcha 14 viloyat uchun haqiqiy tumanlar qo'shildi (jami 207 ta). Review paytida topilgan `PassportModule` scoping xatosi (`JwtAuthGuard` boshqa modullarda ishlamayotgan edi) `common/auth/shared-auth.module.ts` bilan tuzatildi.

✅ Bajarildi (3-bosqich, Claude qismi): Masters modul (PR #4, merge qilindi) — mobil ilova tiplariga moslashtirilgan (§4.0).

✅ Bajarildi (3-bosqich, Gemini qismi): Upload modul (issue #5, branch `feat/upload-gemini`) — MinIO S3 integration, magic bytes tekshiruvi, `POST /api/v1/upload/single`.

✅ Bajarildi (4-bosqich, Claude qismi): Orders + Reviews + Notifications (mock push) — mobil `OrderItem`/`Review` shakllariga moslashtirilgan (§4.0).

✅ Bajarildi (5-bosqich, Claude qismi, backend): `admin` modul — statistika, foydalanuvchilar/bloklash, ustalarni tasdiqlash, buyurtmalar, sharh moderatsiyasi (§4.1). `prisma db seed` birinchi ADMIN'ni yaratadi (2026-10-13 dan `ADMIN_LOGIN` + `ADMIN_PASSWORD` + `ADMIN_PHONE`, §4.1).

✅ Bajarildi (6-bosqich, Claude qismi): Next.js admin panel auth — login (faqat ADMIN; dastlab OTP edi, 2026-10-13 dan login + parol — §4.1), JWT httpOnly cookie, `/api/backend/*` proksi, `proxy.ts`, himoyalangan layout, `lib/api-client.ts` (arxitektura: AGENTS.md "Admin panel").

✅ Bajarildi (6-bosqich, Claude qismi, UI stack): shadcn/ui (Base UI asosidagi yangi avlod, `base-nova` preset), TanStack Query, react-hook-form+zod o'rnatildi; namunaviy ro'yxat sahifasi `apps/web/app/(admin)/users/page.tsx` (filtr+qidiruv+sahifalash+bloklash) — naqsh AGENTS.md "UI stack va namunaviy sahifa"da.

✅ Bajarildi (6-bosqich, Gemini qismi, issue #11 → PR #15): Admin panel sahifalari — Dashboard (statistika + recharts trend), Masters (kutilayotganlar + tasdiqlash dialogi), Orders (status/viloyat/sana filtrlari), Regions CRUD, Districts CRUD (viloyat filtri bilan), Categories CRUD; barcha bo'limlar `NAV_ITEMS`ga ulandi. Review paytida topilgan xato: kategoriya yaratish formasi backend majburiy qiladigan `description` maydonini butunlay yubormas edi (har doim 400) — Claude tomonidan tuzatildi (forma+sxema+tip), jonli tekshirildi.

✅ Bajarildi (7-bosqich, Claude qismi): xavfsizlik review + e2e testlar + Swagger to'liqlashtirish (issue #12).
- **Xavfsizlik**: `ThrottlerGuard` global ulandi (avval sozlangan, lekin hech qayerda qo'llanilmagan edi — hech qanday endpoint cheklanmagan bo'lib chiqdi); `/auth/send-otp`+`/auth/verify-otp` uchun qo'shimcha 5/daq IP chegarasi; Redis'da OTP urinishlar hisoblagichi (5 marta noto'g'ridan keyin kod bekor qilinadi); CORS `CORS_ORIGINS` env bilan cheklanadi (prod'da standart — yopiq); `helmet` sarlavhalari. `pnpm audit`: 23 → 0 (ishlatilmagan `@nestjs/mau` olib tashlandi, `multer`/`deepmerge-ts`/`uuid` `pnpm-workspace.yaml` `overrides` bilan yangilandi).
- **Bonus tuzatish**: `admin/regions`, `admin/districts` `DELETE`da bog'liq qatorlar (ustalar/buyurtmalar/tumanlar) bo'lsa endi 500 emas, aniq 409 xabar bilan qaytadi (`common/prisma/delete-or-conflict.ts`) — bu Gemini'ning admin panel CRUD sahifalarida (issue #11) xato ko'rsatishga bevosita ta'sir qiladi.
- **E2e testlar**: `apps/backend/test/*.e2e-spec.ts` — real Postgres (`?schema=test`, `test:e2e` avtomatik migratsiya qiladi) va Redis bilan; auth (OTP oqimi, bruteforce, throttle, bloklangan user), admin (RolesGuard, block/verify/review moderatsiyasi), orders (to'liq lifecycle, ruxsatsiz o'tishlar, begona user 404). `pnpm --filter backend test:e2e`.
- **Swagger**: barcha controllerlarda asosiy xato javoblari (`@ApiErrorResponses` — `common/swagger/`) hujjatlangan; `auth`da yetishmayotgan `@ApiOperation`lar qo'shildi.

✅ Bajarildi (Gemini, issue #14 → PR #16): Favorites moduli — `GET /favorites`, `GET /favorites/ids`, `POST /favorites/:masterId`, `DELETE /favorites/:masterId`.

✅ Bajarildi (Gemini, PR #17 + PR #18): `GET /admin/reviews` (sahifalash, `masterId`/`rating` filtrlari) va admin panel **Sharhlar** sahifasi (filtr, jadval, o'chirish dialogi). Review paytida topilgan xatolar (UUID bo'lmagan `masterId` 400 berardi, "Faqat shu usta" forma bilan sinxron emas edi, URL'dagi `page` yo'qolardi) Claude tomonidan tuzatildi.

✅ Bajarildi (2026-10-13, Claude, PR #31): admin panelda usta qo'shish (`POST /admin/masters` + "Usta qo'shish" dialogi); admin kirishi login + parolga o'tkazildi (`POST /auth/admin/login`, OTP bilan admin kirishi yopildi); usta profilini faqat admin yaratadi (`PUT /masters/me/profile` endi faqat tahrirlash). Batafsil: §4.0, §4.1.

✅ Bajarildi (2026-10-09 – 10-12 raund, §7.4): CI — GitHub Actions (PR #27); production Docker konfiguratsiyasi, Nginx, `docs/DEPLOY.md` (PR #28); admin panel UI tuzatishlari (Gemini, PR #29); `GET /admin/masters` + "Barcha ustalar" ko'rinishi (Gemini, PR #30); FCM token endpointlari + `FcmPushProvider` (PR #24); sharh faqat tugallangan buyurtmadan keyin (PR #25).

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
- **Auth**: Telefon + SMS OTP (hozircha **mock**, test kodi `123456`) + JWT — bitta access token (`JWT_EXPIRES_IN`, standart 30 kun); original spec va mobil ilova refresh endpointini ko'zda tutmaydi, shuning uchun refresh token **yo'q**
- **Validatsiya**: class-validator / class-transformer, global `ValidationPipe`
- **API docs**: `@nestjs/swagger` → `/api/docs`
- **Push**: firebase-admin (FCM) — mobil ilovaga bildirishnoma
- **Rate limiting**: `@nestjs/throttler` + Redis store
- **Test**: Vitest (unit) + Supertest (e2e, haqiqiy Postgres/Redis); lint — oxlint

### Admin Panel (`apps/web`)
- **Framework**: Next.js (App Router) + TypeScript
- **Stil**: TailwindCSS + shadcn/ui (komponentlar uchun)
- **Data fetching**: TanStack Query (React Query)
- **Form**: react-hook-form + zod
- **Auth**: **login + parol** (`POST /auth/admin/login`, faqat `role: ADMIN`; telefon/OTP bilan admin panelga kirib bo'lmaydi — §4.1); JWT httpOnly cookie'da saqlanadi (Next.js Route Handler orqali backend proxy qilinadi — token brauzer JS'iga chiqmaydi)
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
│   │   │   │   ├── auth/           # profil (`/auth/me`, `/auth/profile`) ham shu yerda — alohida `users` moduli yo'q
│   │   │   │   ├── regions/
│   │   │   │   ├── categories/
│   │   │   │   ├── masters/
│   │   │   │   ├── orders/
│   │   │   │   ├── reviews/
│   │   │   │   ├── upload/
│   │   │   │   ├── favorites/
│   │   │   │   ├── notifications/  # PushProvider (strategy), hozircha mock
│   │   │   │   └── admin/          # faqat ADMIN role uchun endpointlar
│   │   │   ├── common/             # global filter, interceptor, guard, decorator
│   │   │   └── main.ts
│   │   └── prisma/schema.prisma
│   └── web/                 # Next.js admin panel
│       ├── app/
│       └── components/
├── packages/
│   └── shared-types/        # Hozircha bo'sh (faqat package.json) — admin panel tiplari `apps/web/lib/types.ts`da; to'ldirish MVP'dan keyinga qoldirilgan
├── docker-compose.yml
├── turbo.json
├── package.json
├── AGENTS.md
├── CLAUDE.md
├── TASKS.md             # qolgan ishlar — yagona jonli ro'yxat
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
- **OTP uzunligi**: **qaror (2026-10-10): 6 xona.** Backend standarti allaqachon 6 (`OTP_LENGTH=6`), production'da ham shunday qoladi. Ilovada hozir 4 ta katak — **ilova 6 katakka o'tkazilishi kerak** (`TASKS.md` D-04). `OTP_LENGTH` env (4–6) faqat texnik imkoniyat sifatida qoladi.
- **Usta profili — faqat admin yaratadi (qaror 2026-10-13).** Ilovadan o'zi "usta bo'lish" yopilgan: usta profili faqat admin panel orqali qo'shiladi (`POST /admin/masters`, §4.1). `PUT /masters/me/profile` endi faqat **mavjud profilni tahrirlaydi** (barcha maydonlar ixtiyoriy; `categoryIds` berilsa kategoriyalar to'liq almashtiriladi; `User.name` = `firstName lastName`); profili yo'q foydalanuvchi `403` oladi ("Usta profili faqat administrator tomonidan yaratiladi..."). `GET /masters/me/profile` — profil yo'q bo'lsa `404`. ⚠️ Ilovadagi "usta bo'lish" formasi olib tashlanishi (yoki "administratorga murojaat qiling" xabari bilan almashtirilishi) kerak.
- **Ilova ishlatadigan, spec'da yo'q endpointlar (qo'shildi)**: `PUT /masters/me/services/:serviceId` (xizmatni tahrirlash), `DELETE /masters/me/portfolio?url=...` (rasm URL bo'yicha o'chiriladi — ilovada rasmlar ID'siz).
- **Fayl tozalash (2026-10-16)**: portfolio rasmi o'chirilganda (`DELETE /masters/me/portfolio`) yoki avatar almashtirilganda (`PUT /auth/profile`) eski fayl ombordan o'chiriladi — faqat o'z bucket'imizga o'zimiz yuklagan fayl (`images/<uuid>.<ext>`) bo'lsa va bazada boshqa portfolio/avatar uni ishlatmasa. Ombor xatosi asosiy amalni buzmaydi (log). `avatarUrl` va portfolio `url` — `http(s)://` majburiy, TLD shart emas (dev: `localhost`).
- Qolganlari: `POST/DELETE /masters/me/services`, `POST /masters/me/portfolio`, `PATCH /masters/me/availability` — faqat MASTER; xizmat egaligi tekshiriladi. `GET /masters` bloklangan ustalarni ko'rsatmaydi; `sortBy`: `rating|reviews|orders|experience|newest`.

**Orders va Reviews (4-bosqich) — qarorlar:**
- **Buyurtma javobi** mobil `OrderItem` bilan bir xil (`statusTextUz`, `masterName`, `masterAvatar`, `masterPhone`). `preferredDate`/`preferredTime` ilovada erkin matn (`"Bugun"`, `"12:00 - 15:00"`) — spec'dagi `2026-09-10`/`14:00` formatidan farqli, shuning uchun backend faqat uzunlikni tekshiradi, formatni emas. `statusTextUz`: `Kutilmoqda | Qabul qilindi | Bajarildi | Bekor qilindi | Rad etildi` (usta bekor qilsa "Rad etildi", mijoz bekor qilsa "Bekor qilindi" — `orders.cancelledBy` ustuni).
- **Yaratish**: `serviceId` berilsa narx va sarlavha bazadagi xizmatdan olinadi (mijoz yuborgan qiymatga ishonilmaydi); o'ziga buyurtma bera olmaydi; band (`isAvailable=false`) yoki bloklangan ustaga buyurtma rad etiladi. Ustaga push yuboriladi.
- **`GET /orders/my`**: MASTER roli uchun kelib tushganlar, qolganlar uchun o'zi bergan buyurtmalar (spec bo'yicha). Qo'shimcha `?as=client|master` — ilovadagi "usta rejimi" foydalanuvchisi ikkala ro'yxatni ola olishi uchun.
- **`PUT /orders/:id/status`** → `{ orderId, status }` (mobil `ordersApi` shunday kutadi). O'tishlar: usta — `pending→in_progress|cancelled`, `in_progress→completed|cancelled`; mijoz — faqat `pending→cancelled`; tugagan buyurtma o'zgarmaydi. Begona foydalanuvchi uchun 404. `completed` da `completedOrdersCount +1` (parallel so'rovda ikki marta oshmaydi — ikkinchisi 409). Qarshi tomonga push.
- **Sharhlar**: `GET /masters/:id/reviews` public (tekis mobil `Review`, `page/limit`, default 50). `POST` — bitta foydalanuvchi bitta ustaga bitta sharh: qayta yuborsa avvalgisi **yangilanadi** (reytingni takroriy ovozlar bilan buzib bo'lmasin; `reviews(masterId,userId)` unique). **Qaror (2026-10-10): faqat shu ustada `completed` holatidagi buyurtmasi bor mijoz sharh qoldira oladi** (yangilash uchun ham) — aks holda `403` ("Sharh qoldirish uchun shu ustada tugallangan buyurtmangiz bo'lishi kerak"). Ilova hozir sharh formasini istalgan foydalanuvchiga ko'rsatadi — ilovada 403 xabarini ko'rsatish yoki formani faqat tugallangan buyurtmadan keyin ochish kerak (`TASKS.md` D-09). Qoidadan oldin qoldirilgan sharhlar saqlanadi. O'ziga sharh qoldirib bo'lmaydi. `rating` va `reviewCount` har safar qayta hisoblanadi (2 xonagacha yaxlitlanadi).
- **Push (FCM)**: `NotificationsModule` tayyor, hozir `LogPushProvider` (mock, faqat log). Haqiqiy FCM uchun: `FcmPushProvider` + Firebase kalitlari + qurilma tokenini saqlash endpointi kerak (`users.fcmToken` ustuni bor, lekin spec'da ham, ilovada ham token yuboradigan endpoint yo'q) — alohida vazifa.
- **Migratsiya**: `orders.cancelledBy` (nullable) va `reviews(masterId,userId)` unique qo'shildi (additiv).
- **Eslatma**: buyurtmasi bor ustani (foydalanuvchini) bazadan o'chirib bo'lmaydi (`orders.masterId` FK, tarix saqlanadi) — admin panelda o'chirish emas, bloklash ishlatiladi.

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
| `POST /api/v1/auth/admin/login` | Admin panelga login + parol bilan kirish (yagona ochiq admin endpointi) |
| `GET /api/v1/admin/stats/dashboard` | Umumiy statistika: userlar soni, ustalar soni, status bo'yicha buyurtmalar soni, so'nggi 30 kunlik trend |
| `GET /api/v1/admin/users` | Foydalanuvchilar ro'yxati (filter: role, isBlocked, qidiruv) |
| `PATCH /api/v1/admin/users/:id/block` | Foydalanuvchini bloklash/blokdan chiqarish |
| `GET /api/v1/admin/masters/pending` | Tasdiqlanmagan (`isVerified: false`) ustalar ro'yxati |
| `GET /api/v1/admin/masters` | Barcha ustalar ro'yxati (filter: isVerified, viloyat, qidiruv) — tasdiqni bekor qilish va umumiy ko'rish uchun |
| `POST /api/v1/admin/masters` | Admin tomonidan yangi usta qo'shish (telefon bo'yicha akkaunt + usta profili) — usta profilini yaratishning **yagona** yo'li |
| `PATCH /api/v1/admin/masters/:id/verify` | Ustani tasdiqlash (`isVerified: true`) |
| `GET /api/v1/admin/orders` | Barcha buyurtmalar (filter: status, sana oralig'i, viloyat) |
| `POST /api/v1/admin/regions`, `PUT .../:id`, `DELETE .../:id` | Viloyatlarni boshqarish (original spec'da faqat GET bor edi) |
| `POST /api/v1/admin/districts`, `PUT .../:id`, `DELETE .../:id` | Tumanlarni boshqarish |
| `POST /api/v1/admin/categories`, `PUT .../:id`, `DELETE .../:id` | Kategoriyalarni boshqarish |
| `GET /api/v1/admin/reviews` | Barcha sharhlar ro'yxati (filter: masterId, rating, sahifalash) |
| `DELETE /api/v1/admin/reviews/:id` | Nomaqbul sharhni o'chirish (moderatsiya) |

**Javob shakllari (admin)** — ro'yxatlar `{ items, total, page, limit }` (`page` standart 1, `limit` standart 20, max 100); mobil kontraktga bog'liq emas, admin panelga moslangan:

- `GET /admin/users?role&isBlocked&query&page&limit` → `items[]`: `{ id, phone, name, role, avatarUrl?, isBlocked, isPhoneVerified, masterId?, createdAt }`. `query` — ism yoki telefon bo'yicha.
- `PATCH /admin/users/:id/block` body `{ isBlocked: boolean }` → `{ id, isBlocked }`. O'zini va boshqa ADMIN'ni bloklab bo'lmaydi (400/403). Bloklangan foydalanuvchining token'i keyingi so'rovdayoq 401 beradi (`JwtStrategy` har so'rovda DB'ni tekshiradi).
- `GET /admin/masters/pending?page&limit` → `items[]`: `{ id, userId, fullName, phone, telegram?, avatarUrl?, bio, experienceYears, isVerified, isBlocked, region{id,nameUz}, district{id,nameUz}, address, categories[{id,nameUz}], createdAt }`, eng eski so'rov birinchi.
- `GET /admin/masters?isVerified&regionId&query&page&limit` → `items[]`: `masters/pending` bilan bir xil maydonlar **+** `rating`, `reviewCount`, `completedOrdersCount`, `isAvailable`. `isVerified` — `true|false` (berilmasa hammasi); `regionId` — UUID; `query` — ism (`firstName`/`lastName`) yoki telefon bo'yicha, 1–100 belgi; bo'shliq bilan ajratilgan har bir so'z (ko'pi bilan 5 ta) alohida mos kelishi kerak — shuning uchun to'liq ism (`Ali Valiyev`) va bo'shliqli telefon (`+998 90 123`) ham topiladi. Tartib: eng yangi birinchi (`createdAt desc`). Bloklangan ustalar ham ko'rinadi (`isBlocked: true`).
- `POST /admin/masters` body `{ phone, firstName, lastName, bio, regionId, districtId, address, workingHours{start,end,workDays[]}, experienceYears?, telegram?, categoryIds?, isVerified? }` → `201`, `GET /admin/masters` elementi bilan bir xil shakl. Maydon qoidalari `PUT /masters/me/profile` bilan bir xil (§4.0), lekin `phone` majburiy (`+998XXXXXXXXX`, probelli variantlar ham qabul qilinadi). `isVerified` standart `true` (admin qo'shgan usta darhol tasdiqlangan). Telefon bo'yicha: akkaunt yo'q bo'lsa — yaratiladi (`role: MASTER`, `isPhoneVerified: false`; usta keyin shu raqam bilan oddiy OTP orqali kiradi va profil o'ziniki bo'ladi); mavjud CLIENT bo'lsa — unga profil biriktiriladi va rol `MASTER`ga o'tadi, `User.name` = `firstName lastName`. Rad etiladi: shu raqamda usta profili allaqachon bor yoki foydalanuvchi bloklangan → `409`; raqam ADMIN'ga tegishli → `400`; tuman viloyatga mos emas / kategoriya topilmadi → `400`. Hammasi bitta tranzaksiyada (xatoda akkaunt ham yaratilmaydi). Push yuborilmaydi. Additiv — mobil kontraktga ta'sir qilmaydi.
- `PATCH /admin/masters/:id/verify` body `{ isVerified?: boolean }` (standart `true`, `false` — tasdiqni bekor qilish) → `{ id, isVerified }`. Birinchi tasdiqlashda ustaga push yuboriladi (mock).
- `GET /admin/orders?status&regionId&from&to&page&limit` → `items[]`: `{ id, orderNumber, masterId, masterName, masterPhone, clientId?, clientName, clientPhone, serviceTitle, price, region{id,nameUz}, districtId, districtName, address, preferredDate, preferredTime, comment?, status, cancelledBy?, createdAt }`. `regionId` — buyurtma manzili (tumani) shu viloyatda. `from`/`to` — `createdAt` bo'yicha; `to=2026-09-30` butun kunni qamrab oladi; `from > to` → 400.
- `GET /admin/reviews?masterId&rating&page&limit` → `items[]`: `{ id, masterId, masterName, masterPhone, userId, userName, userPhone, userAvatar?, rating, comment, createdAt }`.
- `GET /admin/stats/dashboard` → `{ users{total,clients,masters,admins,blocked}, masters{total,verified,pending}, orders{total,pending,in_progress,completed,cancelled}, trend[30]{date,orders,newUsers} }`. Trend — so'nggi 30 kun (bugun ham), Toshkent vaqti (UTC+5) bo'yicha, bo'sh kunlar 0.
- `DELETE /admin/reviews/:id` → `{ id, masterId }`; usta `rating`/`reviewCount` qayta hisoblanadi (oxirgi sharh o'chirilsa 0).
- **Admin kirishi — login + parol (qaror 2026-10-13).** `POST /auth/admin/login` body `{ login, password }` → `verify-otp` bilan bir xil shakl (`{ user, token }`, `user.role: 'admin'`). `login` — 3–32 belgi (`a-z 0-9 . _ -`), registrga bog'liq emas. Xato login, xato parol, ADMIN bo'lmagan yoki bloklangan akkaunt — bir xil `401` ("Login yoki parol noto'g'ri"). Himoya: IP bo'yicha 5/daq (`429`) + bitta login uchun 5 ta xato urinishdan keyin 15 daqiqa blok (`429`, Redis). Parol `scrypt` (Node `crypto`, tashqi kutubxonasiz) bilan xeshlanadi — `users.login` (unique, nullable) va `users.passwordHash` (nullable) ustunlari, additiv migratsiya; javoblarda hech qachon qaytmaydi. **ADMIN akkaunti telefon + OTP bilan kira olmaydi**: `verify-otp` unga `403` qaytaradi (aks holda mock SMS'da `123456` bilan admin tokenini olish mumkin edi). Panel sessiyani `role: 'admin'` bo'yicha tekshiradi, lekin haqiqiy himoya backend'dagi `RolesGuard`. Parolni almashtirish: `ADMIN_PASSWORD`ni o'zgartirib `prisma db seed`ni qayta ishga tushirish (panelda parol almashtirish sahifasi hali yo'q).

### 4.2. Qurilma push tokeni (yangi, FCM uchun)

Original spec'da ham, ilovada ham token yuboradigan endpoint yo'q edi — haqiqiy push uchun qo'shiladi (additiv, mavjud kontraktni buzmaydi; `users.fcmToken` ustuni allaqachon bor, migratsiya kerak emas):

| Endpoint | Tavsif |
|---|---|
| `PUT /api/v1/auth/fcm-token` | Body `{ fcmToken: string }` (1–4096 belgi) → `{ registered: true }`. Joriy foydalanuvchining qurilma tokenini saqlaydi; shu token boshqa foydalanuvchida turgan bo'lsa, undan olib tashlanadi (bitta qurilma — bitta akkaunt). |
| `DELETE /api/v1/auth/fcm-token` | → `{ registered: false }`. Logout'da chaqiriladi — token tozalanadi. |

Ikkalasi ham `JwtAuthGuard` bilan. Provider `PUSH_PROVIDER` env orqali tanlanadi: `log` (standart, mock) yoki `fcm` (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` majburiy — bo'lmasa ilova ishga tushmaydi). FCM "token yaroqsiz" xatosini qaytarsa, token bazadan o'chiriladi. Push yuborishdagi xato hech qachon asosiy amalni (buyurtma yaratish va h.k.) buzmaydi.

### 4.3. Akkauntni o'chirish (yangi, 2026-10-16 qarori)

App Store / Google Play talabi: foydalanuvchi akkauntini ilova ichida o'chira olishi kerak. Buyurtmasi bor foydalanuvchini FK tufayli jismonan o'chirib bo'lmaydi va buyurtma/sharh tarixi ikkinchi tomon uchun saqlanishi kerak — shuning uchun **anonimlashtirish**:

| Endpoint | Tavsif |
|---|---|
| `DELETE /api/v1/auth/me` | `JwtAuthGuard`. → `{ deleted: true }`. ADMIN uchun `403` (adminlar DEPLOY.md §10 orqali boshqariladi). Qaytarib bo'lmaydi. |

Bitta tranzaksiyada:
- **User**: `phone` → `deleted:<id>` (raqam bo'shaydi — shu raqam bilan keyin yangi akkaunt ochish mumkin), `name` → `O'chirilgan foydalanuvchi`, `avatarUrl`, `fcmToken`, `login`, `passwordHash` → `null`, `isBlocked: true` (token keyingi so'rovdayoq `401`), `deletedAt` = hozir (yangi nullable ustun, additiv migratsiya).
- **Faol buyurtmalar** (`pending`, `in_progress`) bekor qilinadi: mijoz sifatida — `cancelledBy: CLIENT`, usta sifatida — `cancelledBy: MASTER`; ikkinchi tomonga push (best-effort).
- **Mijoz sifatidagi barcha buyurtmalar**: `clientName` → `O'chirilgan foydalanuvchi`, `clientPhone` → `""`, `address` → `—`, `comment` → `null`. Buyurtma o'zi (usta tarixi, `completedOrdersCount`) saqlanadi.
- **Usta profili** (bo'lsa): `firstName/lastName` → `O'chirilgan` / `usta`, `phone` → `""`, `telegram` → `null`, `bio/address` → `—`, `isAvailable/isVerified: false`; xizmatlar, kategoriyalar, portfolio va boshqalarning sevimlilaridagi yozuvlar o'chiriladi. Profil qatori buyurtma/sharh FK'lari uchun qoladi, `GET /masters`da ko'rinmaydi (bloklangan).
- **Sharhlar** saqlanadi (usta reytingi buzilmasin), muallif nomi avtomatik `O'chirilgan foydalanuvchi` bo'ladi, avatar yo'q.
- **Sevimlilar** (foydalanuvchining o'zi qo'shganlari) o'chiriladi.
- Tranzaksiyadan keyin avatar va portfolio fayllari ombordan o'chiriladi (§4.0 "Fayl tozalash").

Admin: `GET /admin/users` elementida `deletedAt?` (ISO) qo'shiladi; o'chirilgan foydalanuvchini bloklash/blokdan chiqarish — `409`. ⚠️ Mobil: Profil ekranida "Akkauntni o'chirish" (tasdiqlash bilan) → `DELETE /auth/me` → lokal sessiyani tozalash (`TASKS.md` D-13).

**Xavfsizlik qoidasi**: `/api/v1/admin/*` barcha endpointlar `JwtAuthGuard` + `RolesGuard(Role.ADMIN)` bilan himoyalanadi. ADMIN role'ga ega foydalanuvchi faqat qo'lda (seed yoki to'g'ridan-to'g'ri DB orqali) yaratiladi — ochiq ro'yxatdan o'tish orqali ADMIN bo'lib bo'lmaydi. `prisma db seed` uni `ADMIN_LOGIN` + `ADMIN_PASSWORD` (kamida 8, production'da 12 belgi) + `ADMIN_PHONE` (akkauntning majburiy telefon maydoni uchun; u bilan kirib bo'lmaydi) bo'yicha yaratadi/yangilaydi. Dev: `apps/backend/.env`.

## 5. Xavfsizlik va operatsion qoidalar

1. SMS OTP hozircha **mock** (`123456`), lekin kod tuzilishi shundayki, `SmsProvider` interfeysi orqali keyinchalik Eskiz.uz ulash bitta faylni almashtirish bilan bo'lishi kerak (strategy pattern).
2. Rate limit: bitta telefon raqamidan 120 soniyada 1 marta OTP so'rovi (Redis TTL).
3. Barcha request body'lar DTO + `class-validator` orqali qat'iy tekshiriladi (`whitelist: true, forbidNonWhitelisted: true`).
4. Prisma indekslar: `master_profiles(regionId, districtId, rating)`, `orders(masterId, clientId, status)`.
5. JWT secret, MinIO kalitlari, DB parol — faqat `.env` da, hech qachon commit qilinmaydi (`.env.example` bilan taqqoslab tekshiriladi).
6. Admin panelda JWT httpOnly cookie'da, `SameSite=Lax`, `Secure` (production'da).
7. Admin panelga faqat login + parol bilan kiriladi; ADMIN akkauntiga OTP orqali kirish yopiq (§4.1).

## 6. Deployment (Contabo VPS)

```
Internet → Nginx (TLS, reverse proxy)
              ├── /api/v1/*  → backend konteyner (NestJS, port 3000)
              ├── /uploads/* → MinIO konteyner (bucket, faqat o'qish)
              └── /*         → web konteyner (Next.js, port 3001)
Docker tarmog'i ichida: postgres, redis, minio (tashqariga port ochilmaydi)
```

Backend'ga faqat `/api/v1/` yo'naltiriladi (butun `/api/` emas): `/api/auth/*` va `/api/backend/*` — admin panelning o'z route handler'lari.

Konfiguratsiya tayyor (`docker-compose.prod.yml`, Dockerfile'lar, `deploy/nginx/`, `.env.production.example`), to'liq yo'riqnoma — [`docs/DEPLOY.md`](DEPLOY.md). Production himoyalari (backend ishga tushishda tekshiradi, `common/config/production-guard.ts`): `JWT_SECRET` kamida 32 belgi; `SMS_MODE=mock` faqat `ALLOW_MOCK_SMS_IN_PRODUCTION=true` bilan (mock'da OTP doim `123456`); `CORS_ORIGINS` majburiy. `TRUST_PROXY=1` — rate limit Nginx ortidagi haqiqiy mijoz IP'si bo'yicha. Swagger production'da yopiq (`SWAGGER_ENABLED=true` bilan yoqiladi).

CI/CD (keyingi bosqich, hozircha rejalashtiriladi): GitHub Actions → `main` branch'ga merge bo'lganda Contabo'ga SSH orqali `docker compose pull && up -d`.

## 7. Ikki AI agent bilan ishlash workflow'i

Loyiha ikkita AI agent yordamida quriladi: **Claude** (arxitektor + reviewer, PR'larni qabul qilib `main`ga merge qiladi) va **Gemini (Flash)**. Har bir agent alohida terminalda, **o'zining git worktree'sida** ishlaydi (§7.2). (Codex 2026-10-09 da rejalashtirilgan edi, lekin ishlamadi — uning infratuzilma vazifalari 2026-10-12 da Claude'ga o'tdi.) Batafsil qoidalar `AGENTS.md` va `CLAUDE.md`da, quyida — umumiy sxema:

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

**Infratuzilma va DevOps** (GitHub Actions CI, Dockerfile'lar, production `docker compose`, Nginx, deploy hujjatlari) — Claude zonasi.

### 7.2. Git workflow

- **Har agent o'z worktree'sida**: uch agent bitta papkada branch almashtirsa, bir-birining fayllarini buzadi. Shuning uchun: `git fetch origin && git worktree add ../texnozor-<agent> -b <branch> origin/main`, keyin shu papkada `pnpm install` va `cp ../texnozor/apps/backend/.env apps/backend/.env` (web uchun `apps/web/.env.local` ham). Asosiy papka (`texnozor/`) — Claude'niki.
- Vazifa GitHub issue sifatida beriladi (`[Gemini] ...`, `[Claude] ...`); PR tavsifida `Closes #<issue>` yoziladi. Agent o'z PR'ini **o'zi merge qilmaydi** — Claude review qilib merge qiladi.

- `main` — himoyalangan, faqat PR orqali
- Branch nomlash: `feat/<module>-<agent>` (`claude` | `gemini`), masalan `feat/auth-claude`, `feat/regions-gemini`
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

### 7.4. Qolgan ishlar

Qolgan ishlar, ularning mas'uli, bog'liqligi va "Tayyor mezoni" — [`TASKS.md`](../TASKS.md)da (yagona jonli ro'yxat; har bir vazifa tugagach o'sha PR'da "Bajarildi" deb belgilanadi — AGENTS.md §8). Bu yerda takrorlanmaydi, aks holda ikki ro'yxat bir-biridan farqlanib ketadi.

2026-10-09 raundidagi vazifalar (CI, production konfiguratsiya, admin UI tuzatishlari, barcha ustalar ro'yxati, FCM, OTP/sharh qarorlari) bajarilgan — §0. Ochiq qolganlari (real SMS, mobil integratsiya, haqiqiy deploy) `TASKS.md`ga o'tkazilgan: B-01, D-bo'limi, E-bo'limi.
