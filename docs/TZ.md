# UstaTop — Texnik Topshiriq (TZ) v1.0

> Ushbu hujjat loyihaning to'liq arxitekturasini belgilaydi. O'zgartirish kerak bo'lsa — shu faylni tahrirlang, chunki `AGENTS.md` va `CLAUDE.md` shu yerdagi qarorlarga tayanadi.

## 0. Holat (2026-10-09)

✅ Bajarildi (§7.3 roadmap 1-bosqich): Turborepo+pnpm monorepo, `apps/backend` (NestJS, Prisma 6 schema+migratsiya, global response/error format, Swagger, seed: 14 viloyat + 8 kategoriya + Toshkent shahri tumanlari), `apps/web` (Next.js skeleton), `docker-compose.yml` (Postgres/Redis/MinIO), GitHub private repo (https://github.com/DEW0277/ustatop-backend).

✅ Bajarildi (2-bosqich, Claude qismi): Auth modul — `POST /auth/send-otp`, `POST /auth/verify-otp`, `GET /auth/me`, `PUT /auth/profile` (PR #1, merge qilindi). Shared infra: `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser` (`apps/backend/src/common/`) — keyingi barcha modullar shulardan foydalanadi.

✅ Bajarildi (2-bosqich, Gemini qismi): Regions/Districts/Categories CRUD + admin endpointlar (PR #3, merge qilindi). Seed'ga barcha 14 viloyat uchun haqiqiy tumanlar qo'shildi (jami 207 ta). Review paytida topilgan `PassportModule` scoping xatosi (`JwtAuthGuard` boshqa modullarda ishlamayotgan edi) `common/auth/shared-auth.module.ts` bilan tuzatildi.

✅ Bajarildi (3-bosqich, Claude qismi): Masters modul (PR #4, merge qilindi) — mobil ilova tiplariga moslashtirilgan (§4.0).

✅ Bajarildi (3-bosqich, Gemini qismi): Upload modul (issue #5, branch `feat/upload-gemini`) — MinIO S3 integration, magic bytes tekshiruvi, `POST /api/v1/upload/single`.

✅ Bajarildi (4-bosqich, Claude qismi): Orders + Reviews + Notifications (mock push) — mobil `OrderItem`/`Review` shakllariga moslashtirilgan (§4.0).

✅ Bajarildi (5-bosqich, Claude qismi, backend): `admin` modul — statistika, foydalanuvchilar/bloklash, ustalarni tasdiqlash, buyurtmalar, sharh moderatsiyasi (§4.1). `prisma db seed` `ADMIN_PHONE` env bo'yicha birinchi ADMIN'ni yaratadi.

✅ Bajarildi (6-bosqich, Claude qismi): Next.js admin panel auth — OTP login (faqat ADMIN), JWT httpOnly cookie, `/api/backend/*` proksi, `proxy.ts`, himoyalangan layout, `lib/api-client.ts` (arxitektura: AGENTS.md "Admin panel").

✅ Bajarildi (6-bosqich, Claude qismi, UI stack): shadcn/ui (Base UI asosidagi yangi avlod, `base-nova` preset), TanStack Query, react-hook-form+zod o'rnatildi; namunaviy ro'yxat sahifasi `apps/web/app/(admin)/users/page.tsx` (filtr+qidiruv+sahifalash+bloklash) — naqsh AGENTS.md "UI stack va namunaviy sahifa"da.

✅ Bajarildi (6-bosqich, Gemini qismi, issue #11 → PR #15): Admin panel sahifalari — Dashboard (statistika + recharts trend), Masters (kutilayotganlar + tasdiqlash dialogi), Orders (status/viloyat/sana filtrlari), Regions CRUD, Districts CRUD (viloyat filtri bilan), Categories CRUD; barcha bo'limlar `NAV_ITEMS`ga ulandi. Review paytida topilgan xato: kategoriya yaratish formasi backend majburiy qiladigan `description` maydonini butunlay yubormas edi (har doim 400) — Claude tomonidan tuzatildi (forma+sxema+tip), jonli tekshirildi.

✅ Bajarildi (7-bosqich, Claude qismi): xavfsizlik review + e2e testlar + Swagger to'liqlashtirish (issue #12).
- **Xavfsizlik**: `ThrottlerGuard` global ulandi (avval sozlangan, lekin hech qayerda qo'llanilmagan edi — hech qanday endpoint cheklanmagan bo'lib chiqdi); `/auth/send-otp`+`/auth/verify-otp` uchun qo'shimcha 5/daq IP chegarasi; Redis'da OTP urinishlar hisoblagichi (5 marta noto'g'ridan keyin kod bekor qilinadi); CORS `CORS_ORIGINS` env bilan cheklanadi (prod'da standart — yopiq); `helmet` sarlavhalari. `pnpm audit`: 23 → 0 (ishlatilmagan `@nestjs/mau` olib tashlandi, `multer`/`deepmerge-ts`/`uuid` `pnpm-workspace.yaml` `overrides` bilan yangilandi).
- **Bonus tuzatish**: `admin/regions`, `admin/districts` `DELETE`da bog'liq qatorlar (ustalar/buyurtmalar/tumanlar) bo'lsa endi 500 emas, aniq 409 xabar bilan qaytadi (`common/prisma/delete-or-conflict.ts`) — bu Gemini'ning admin panel CRUD sahifalarida (issue #11) xato ko'rsatishga bevosita ta'sir qiladi.
- **E2e testlar**: `apps/backend/test/*.e2e-spec.ts` — real Postgres (`?schema=test`, `test:e2e` avtomatik migratsiya qiladi) va Redis bilan; auth (OTP oqimi, bruteforce, throttle, bloklangan user), admin (RolesGuard, block/verify/review moderatsiyasi), orders (to'liq lifecycle, ruxsatsiz o'tishlar, begona user 404). `pnpm --filter backend test:e2e`.
- **Swagger**: barcha controllerlarda asosiy xato javoblari (`@ApiErrorResponses` — `common/swagger/`) hujjatlangan; `auth`da yetishmayotgan `@ApiOperation`lar qo'shildi.

✅ Bajarildi (Gemini, issue #14 → PR #16): Favorites moduli — `GET /favorites`, `GET /favorites/ids`, `POST /favorites/:masterId`, `DELETE /favorites/:masterId`.

✅ Bajarildi (Gemini, PR #17 + PR #18): `GET /admin/reviews` (sahifalash, `masterId`/`rating` filtrlari) va admin panel **Sharhlar** sahifasi (filtr, jadval, o'chirish dialogi). Review paytida topilgan xatolar (UUID bo'lmagan `masterId` 400 berardi, "Faqat shu usta" forma bilan sinxron emas edi, URL'dagi `page` yo'qolardi) Claude tomonidan tuzatildi.

🔄 Jarayonda (2026-10-09 dan, uch agent — §7.4): CI, production Docker konfiguratsiyasi, admin "barcha ustalar" ro'yxati, admin panel UI tuzatishlari, FCM token endpointi.

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
- **OTP uzunligi**: **qaror (2026-10-10): 6 xona.** Backend standarti allaqachon 6 (`OTP_LENGTH=6`), production'da ham shunday qoladi. Ilovada hozir 4 ta katak — **ilova 6 katakka o'tkazilishi kerak** (§7.4, mobil integratsiya). `OTP_LENGTH` env (4–6) faqat texnik imkoniyat sifatida qoladi.
- **Usta bo'lish**: `PUT /masters/me/profile` — *upsert*; CLIENT/MASTER chaqira oladi; birinchi yaratilganda majburiy maydonlar (`firstName, lastName, bio, regionId, districtId, address, workingHours`), rol avtomatik `MASTER` ga o'tadi, `User.name` = `firstName lastName`. `categoryIds` berilsa kategoriyalar to'liq almashtiriladi. Qo'shimcha: `GET /masters/me/profile`.
- **Ilova ishlatadigan, spec'da yo'q endpointlar (qo'shildi)**: `PUT /masters/me/services/:serviceId` (xizmatni tahrirlash), `DELETE /masters/me/portfolio?url=...` (rasm URL bo'yicha o'chiriladi — ilovada rasmlar ID'siz).
- Qolganlari: `POST/DELETE /masters/me/services`, `POST /masters/me/portfolio`, `PATCH /masters/me/availability` — faqat MASTER; xizmat egaligi tekshiriladi. `GET /masters` bloklangan ustalarni ko'rsatmaydi; `sortBy`: `rating|reviews|orders|experience|newest`.

**Orders va Reviews (4-bosqich) — qarorlar:**
- **Buyurtma javobi** mobil `OrderItem` bilan bir xil (`statusTextUz`, `masterName`, `masterAvatar`, `masterPhone`). `preferredDate`/`preferredTime` ilovada erkin matn (`"Bugun"`, `"12:00 - 15:00"`) — spec'dagi `2026-09-10`/`14:00` formatidan farqli, shuning uchun backend faqat uzunlikni tekshiradi, formatni emas. `statusTextUz`: `Kutilmoqda | Qabul qilindi | Bajarildi | Bekor qilindi | Rad etildi` (usta bekor qilsa "Rad etildi", mijoz bekor qilsa "Bekor qilindi" — `orders.cancelledBy` ustuni).
- **Yaratish**: `serviceId` berilsa narx va sarlavha bazadagi xizmatdan olinadi (mijoz yuborgan qiymatga ishonilmaydi); o'ziga buyurtma bera olmaydi; band (`isAvailable=false`) yoki bloklangan ustaga buyurtma rad etiladi. Ustaga push yuboriladi.
- **`GET /orders/my`**: MASTER roli uchun kelib tushganlar, qolganlar uchun o'zi bergan buyurtmalar (spec bo'yicha). Qo'shimcha `?as=client|master` — ilovadagi "usta rejimi" foydalanuvchisi ikkala ro'yxatni ola olishi uchun.
- **`PUT /orders/:id/status`** → `{ orderId, status }` (mobil `ordersApi` shunday kutadi). O'tishlar: usta — `pending→in_progress|cancelled`, `in_progress→completed|cancelled`; mijoz — faqat `pending→cancelled`; tugagan buyurtma o'zgarmaydi. Begona foydalanuvchi uchun 404. `completed` da `completedOrdersCount +1` (parallel so'rovda ikki marta oshmaydi — ikkinchisi 409). Qarshi tomonga push.
- **Sharhlar**: `GET /masters/:id/reviews` public (tekis mobil `Review`, `page/limit`, default 50). `POST` — bitta foydalanuvchi bitta ustaga bitta sharh: qayta yuborsa avvalgisi **yangilanadi** (reytingni takroriy ovozlar bilan buzib bo'lmasin; `reviews(masterId,userId)` unique). **Qaror (2026-10-10): faqat shu ustada `completed` holatidagi buyurtmasi bor mijoz sharh qoldira oladi** (yangilash uchun ham) — aks holda `403` ("Sharh qoldirish uchun shu ustada tugallangan buyurtmangiz bo'lishi kerak"). Ilova hozir sharh formasini istalgan foydalanuvchiga ko'rsatadi — ilovada 403 xabarini ko'rsatish yoki formani faqat tugallangan buyurtmadan keyin ochish kerak (§7.4). Qoidadan oldin qoldirilgan sharhlar saqlanadi. O'ziga sharh qoldirib bo'lmaydi. `rating` va `reviewCount` har safar qayta hisoblanadi (2 xonagacha yaxlitlanadi).
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
| `GET /api/v1/admin/stats/dashboard` | Umumiy statistika: userlar soni, ustalar soni, status bo'yicha buyurtmalar soni, so'nggi 30 kunlik trend |
| `GET /api/v1/admin/users` | Foydalanuvchilar ro'yxati (filter: role, isBlocked, qidiruv) |
| `PATCH /api/v1/admin/users/:id/block` | Foydalanuvchini bloklash/blokdan chiqarish |
| `GET /api/v1/admin/masters/pending` | Tasdiqlanmagan (`isVerified: false`) ustalar ro'yxati |
| `GET /api/v1/admin/masters` | Barcha ustalar ro'yxati (filter: isVerified, viloyat, qidiruv) — tasdiqni bekor qilish va umumiy ko'rish uchun |
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
- `GET /admin/masters?isVerified&regionId&query&page&limit` → `items[]`: `masters/pending` bilan bir xil maydonlar **+** `rating`, `reviewCount`, `completedOrdersCount`, `isAvailable`. `isVerified` — `true|false` (berilmasa hammasi); `regionId` — UUID; `query` — ism (`firstName`/`lastName`) yoki telefon bo'yicha, 1–100 belgi. Tartib: eng yangi birinchi (`createdAt desc`). Bloklangan ustalar ham ko'rinadi (`isBlocked: true`).
- `PATCH /admin/masters/:id/verify` body `{ isVerified?: boolean }` (standart `true`, `false` — tasdiqni bekor qilish) → `{ id, isVerified }`. Birinchi tasdiqlashda ustaga push yuboriladi (mock).
- `GET /admin/orders?status&regionId&from&to&page&limit` → `items[]`: `{ id, orderNumber, masterId, masterName, masterPhone, clientId?, clientName, clientPhone, serviceTitle, price, region{id,nameUz}, districtId, districtName, address, preferredDate, preferredTime, comment?, status, cancelledBy?, createdAt }`. `regionId` — buyurtma manzili (tumani) shu viloyatda. `from`/`to` — `createdAt` bo'yicha; `to=2026-09-30` butun kunni qamrab oladi; `from > to` → 400.
- `GET /admin/reviews?masterId&rating&page&limit` → `items[]`: `{ id, masterId, masterName, masterPhone, userId, userName, userPhone, userAvatar?, rating, comment, createdAt }`.
- `GET /admin/stats/dashboard` → `{ users{total,clients,masters,admins,blocked}, masters{total,verified,pending}, orders{total,pending,in_progress,completed,cancelled}, trend[30]{date,orders,newUsers} }`. Trend — so'nggi 30 kun (bugun ham), Toshkent vaqti (UTC+5) bo'yicha, bo'sh kunlar 0.
- `DELETE /admin/reviews/:id` → `{ id, masterId }`; usta `rating`/`reviewCount` qayta hisoblanadi (oxirgi sharh o'chirilsa 0).
- Auth eslatma: admin `verify-otp` orqali kirganda sessiya `role: 'admin'` (kichik harf) qaytadi; panel shu bo'yicha tekshiradi, lekin haqiqiy himoya backend'dagi `RolesGuard`.

### 4.2. Qurilma push tokeni (yangi, FCM uchun)

Original spec'da ham, ilovada ham token yuboradigan endpoint yo'q edi — haqiqiy push uchun qo'shiladi (additiv, mavjud kontraktni buzmaydi; `users.fcmToken` ustuni allaqachon bor, migratsiya kerak emas):

| Endpoint | Tavsif |
|---|---|
| `PUT /api/v1/auth/fcm-token` | Body `{ fcmToken: string }` (1–4096 belgi) → `{ registered: true }`. Joriy foydalanuvchining qurilma tokenini saqlaydi; shu token boshqa foydalanuvchida turgan bo'lsa, undan olib tashlanadi (bitta qurilma — bitta akkaunt). |
| `DELETE /api/v1/auth/fcm-token` | → `{ registered: false }`. Logout'da chaqiriladi — token tozalanadi. |

Ikkalasi ham `JwtAuthGuard` bilan. Provider `PUSH_PROVIDER` env orqali tanlanadi: `log` (standart, mock) yoki `fcm` (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` majburiy — bo'lmasa ilova ishga tushmaydi). FCM "token yaroqsiz" xatosini qaytarsa, token bazadan o'chiriladi. Push yuborishdagi xato hech qachon asosiy amalni (buyurtma yaratish va h.k.) buzmaydi.

**Xavfsizlik qoidasi**: `/api/v1/admin/*` barcha endpointlar `JwtAuthGuard` + `RolesGuard(Role.ADMIN)` bilan himoyalanadi. ADMIN role'ga ega foydalanuvchi faqat qo'lda (seed yoki to'g'ridan-to'g'ri DB orqali) yaratiladi — ochiq ro'yxatdan o'tish orqali ADMIN bo'lib bo'lmaydi. Dev'da `apps/backend/.env`dagi `ADMIN_PHONE` bo'yicha `prisma db seed` uni yaratadi (OTP mock: `123456`).

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

Loyiha uchta AI agent yordamida quriladi: **Claude** (arxitektor + reviewer, PR'larni qabul qilib `main`ga merge qiladi), **Gemini (Flash)** va **Codex** (2026-10-09 dan). Har bir agent alohida terminalda, **o'zining git worktree'sida** ishlaydi (§7.2). Batafsil qoidalar `AGENTS.md` va `CLAUDE.md`da, quyida — umumiy sxema:

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

**Codex** (2026-10-09 dan): infratuzilma va DevOps — GitHub Actions CI, Dockerfile'lar, production `docker compose`, Nginx konfiguratsiyasi, deploy hujjatlari; shuningdek Claude topshirgan, aniq spetsifikatsiyali backend vazifalari. Codex PR'lari ham Claude review'idan o'tadi.

### 7.2. Git workflow

- **Har agent o'z worktree'sida**: uch agent bitta papkada branch almashtirsa, bir-birining fayllarini buzadi. Shuning uchun: `git fetch origin && git worktree add ../texnozor-<agent> -b <branch> origin/main`, keyin shu papkada `pnpm install` va `cp ../texnozor/apps/backend/.env apps/backend/.env` (web uchun `apps/web/.env.local` ham). Asosiy papka (`texnozor/`) — Claude'niki.
- Vazifa GitHub issue sifatida beriladi (`[Gemini] ...`, `[Codex] ...`); PR tavsifida `Closes #<issue>` yoziladi. Agent o'z PR'ini **o'zi merge qilmaydi** — Claude review qilib merge qiladi.

- `main` — himoyalangan, faqat PR orqali
- Branch nomlash: `feat/<module>-<agent>` (`claude` | `gemini` | `codex`), masalan `feat/auth-claude`, `feat/regions-gemini`, `feat/ci-codex`
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

### 7.4. Qolgan ishlar (2026-10-09 holatiga ko'ra)

1–7-bosqichlar yopilgan (backend, admin panel, xavfsizlik, e2e, Swagger, Favorites, Sharhlar sahifasi). Joriy raund:

| # | Ish | Agent | Branch | Holat / bog'liqlik |
|---|---|---|---|---|
| 1 | **CI**: GitHub Actions — har PR va `main` push'da lint + typecheck + unit test + build; alohida job'da e2e (Postgres/Redis service konteynerlari) | **Codex** | `feat/ci-codex` | Bog'liqlik yo'q |
| 2 | **Production konfiguratsiya** (8-bosqichning VPS'siz qismi): `apps/backend/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.prod.yml`, Nginx (TLS, `/api` → backend, `/` → web, `/uploads` → MinIO), `.env.production.example`, `docs/DEPLOY.md` (birinchi deploy, yangilash, backup/restore) | **Codex** | `feat/deploy-config-codex` | 1-banddan keyin. Haqiqiy deploy **qilinmaydi** |
| 3 | **Admin panel UI tuzatishlari**: `Select` qiymat o'rniga yorliq ko'rsatsin (`ALL` emas), sana formati (`2026 M10 9` → `9-okt, 2026`, umumiy `lib/format.ts`), users/orders/masters sahifalarida URL'dagi `page` saqlansin | **Gemini** | `fix/web-polish-gemini` | Bog'liqlik yo'q |
| 4 | **Admin: barcha ustalar ro'yxati** — `GET /admin/masters` (§4.1) + Ustalar sahifasida "Kutilayotganlar / Barchasi" ko'rinishi, filtrlar, tasdiqni bekor qilish | **Gemini** | `feat/admin-masters-list-gemini` | 3-banddan keyin |
| 5 | **FCM**: `PUT`/`DELETE /auth/fcm-token` + `FcmPushProvider` (`PUSH_PROVIDER` env, §4.2) | **Claude** | `feat/fcm-claude` | Kod kalitlarsiz yoziladi va testlanadi; haqiqiy yuborishni yoqish uchun Firebase kalitlari foydalanuvchidan kerak |
| 6 | ~~Ochiq qarorlar (§4.0)~~: (a) OTP — **6 xona**; (b) sharh — **faqat tugallangan buyurtmasi bor mijoz** | Claude | `feat/review-rule-claude` | ✅ Qaror 2026-10-10, backend tayyor; ilova tomoni 8-bandda |
| 7 | **Real SMS** (Eskiz.uz): `SmsProvider` implementatsiyasi | Claude | — | Yangi tashqi xizmat — foydalanuvchi tasdig'i va Eskiz hisobi kerak |
| 8 | **Mobil ilova integratsiyasi** (`/Users/macstore.uz/Desktop/mobile-app`, alohida repo): `API_BASE_URL` + `/api/v1` prefiks, `mastersApi`ga `limit=100`/sahifalash, `updateProfile` faqat `name`/`avatarUrl`, `favoritesApi.ts`, FCM token yuborish (§4.2), OTP kiritish 6 katak, sharh uchun 403 holati (§4.0) | Foydalanuvchi ruxsati bilan Claude yoki mobil dasturchi | — | Alohida repo — tegishdan oldin aniq ruxsat so'raladi |
| 9 | **Haqiqiy deploy** (Contabo VPS) | Claude + foydalanuvchi | — | 2-band tayyor bo'lgach; VPS'ga SSH, domen va foydalanuvchi tasdig'i kerak (CLAUDE.md) |
