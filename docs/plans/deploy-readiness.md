# Plan: Deploy oldidan audit tuzatishlari (birinchi production deploy, yopiq sinov)
Source: orkestrator so'rovi — ikkita read-only audit natijalari (birinchi Contabo VPS deploy'idan oldin; mock SMS bilan yopiq sinov, adminlar haqiqiy ustalarni kirita boshlaydi). `TASKS.md` E-12 (yangi).
Base: main @ 3252b83 (branch `chore/deploy-readiness`, worktree `/Users/macstore.uz/Desktop/.worktrees/texnozor/deploy-readiness`)

## Goal
Birinchi production deploy'dan oldin auditda topilgan 8 ta muammoni yopish: (1) admin panel → backend so'rovlarida
haqiqiy mijoz IP'si yo'qolishi (hamma admin bitta throttle bucket'ida); (2) mock OTP (`123456`) + ochiq usta telefonlari
= akkaunt egallash — production'da faqat ruxsat ro'yxatidagi raqamlar; (3) seed qayta ishga tushganda admin
tahrirlarini bekor qilishi; (4) avatar/portfolio uchun istalgan tashqi URL va cheksiz portfolio; (5) admin JWT 30 kun;
(6) panel va `/uploads` xavfsizlik sarlavhalari; (7) `safeNextPath` boshqaruv belgisi orqali open redirect;
(8) `docs/DEPLOY.md` dagi yangi Ubuntu 24.04 VPS uchun bo'shliqlar va konteyner xotira limitlari. Hammasi avval
`docs/TZ.md`da yoziladi, so'ng kod; `TASKS.md`ga E-12 (✅) va qoldirilgan ishlar uchun E-13 (ochiq) qo'shiladi.
Dev/test (`NODE_ENV !== 'production'`) xatti-harakati 2-banddan tashqari hech qayerda o'zgarmaydi, 2-bandda ham o'zgarmaydi.

## Tekshirilgan faktlar (audit havolalari qayta ko'rildi, base `3252b83`)
- `apps/web/lib/backend.ts:23-41` — sarlavhalar faqat `Accept`, `Content-Type`, `Authorization`; IP uzatilmaydi.
  Chaqiruvchilar (3 ta): `app/api/auth/login/route.ts`, `app/api/backend/[...path]/route.ts`, `lib/session.ts` (`getAdminUser`).
  `backend.ts` `import 'server-only'` qiladi — vitest'da to'g'ridan-to'g'ri import qilib bo'lmaydi, shuning uchun sof
  helper alohida faylga chiqariladi.
- nginx (`deploy/nginx/templates/default.conf.template`): server darajasida `proxy_set_header X-Real-IP $remote_addr;`
  va `X-Forwarded-For $remote_addr` bor; `location /` (web) ichida `proxy_set_header` yo'q → meros oladi. Demak
  web konteyneri `x-real-ip` ni har doim nginx yozgan qiymat bilan oladi (mijoz yuborgani ustidan yoziladi). Web va
  backend konteynerlari host'ga port ochmaydi (`docker-compose.prod.yml`) — nginx'ni aylanib o'tib bo'lmaydi.
- Backend: `TRUST_PROXY=1` → Express `req.ip` = `X-Forwarded-For`ning eng o'ngdagi qiymati; `@nestjs/throttler`
  `getTracker` = `req.ip` (`node_modules/@nestjs/throttler/dist/throttler.guard.js:141`).
- `auth.service.ts:83` — `MOCK_OTP_CODE.slice(...)`; `auth.module.ts:40` — `SmsProvider` doim `MockSmsProvider`ga
  bog'langan, `SMS_MODE` faqat `production-guard.ts`da o'qiladi. **Natija: hozir production'da `SMS_MODE=eskiz` qo'yilsa
  guard o'tadi, lekin baribir mock ishlaydi** (ALLOW bayrog'isiz ham `123456`). Shu sababli D2 da `SMS_MODE≠mock` production'da rad etiladi.
- `auth.module.ts:26` — `expiresIn: JWT_EXPIRES_IN ?? '30d'`; `auth.service.ts:268` `buildSession` har chaqiruvda yangi token
  imzolaydi, u `getMe` (`GET /auth/me`) va `updateProfile`dan ham chaqiriladi → **o'g'irlangan admin tokeni `/auth/me` orqali
  cheksiz yangilanadi**; faqat TTL'ni qisqartirish yetarli emas (D5).
- `apps/web/lib/config.ts:7` — `TOKEN_COOKIE_MAX_AGE = 7 kun`, izohi "JWT 30 kun".
- `masters/dto/add-portfolio.dto.ts:8`, `auth/dto/update-profile.dto.ts:15` — faqat `@IsUrl`; `master-profile.service.ts:236`
  `addPortfolioImage`da son cheklovi yo'q. `StorageService.keyFromPublicUrl` (`upload/storage.service.ts:136`) faqat
  `STORAGE_PUBLIC_URL/images/<uuid>.(jpg|png|webp)` uchun kalit qaytaradi. `test/masters.e2e-spec.ts:185-186` uuid'siz
  `.../images/e2e-first.jpg` ishlatadi — yangilanishi shart. Mobil ilova (`mobile-app` `5807fff`): avatar va portfolio
  URL'i faqat `uploadApi.uploadImage` (`POST /upload/single`) javobidan olinadi; xato `Alert`da ko'rsatiladi.
- `prisma/seed.ts:333-378` — region `upsert` (`update` nomlarni qaytaradi), tuman `nameUz` bo'yicha `findFirst` →
  yo'q bo'lsa `create` (admin nomini o'zgartirsa dublikat), bor bo'lsa `nameRu` ni qaytaradi; kategoriya `upsert`
  (`update` nom/ikonka/tavsifni qaytaradi). Region `code` va kategoriya `slug` admin tomonidan tahrirlanadi
  (`UpdateRegionDto`/`UpdateCategoryDto` = `PartialType(Create…)`) — kalit bo'yicha "create-only" ham dublikat beradi (D8).
  CI e2e seed'ni ishga tushirmaydi.
- `next.config.ts` — `headers()` yo'q. Next 16 hujjati: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`
  (`headers()` async, `[{ source, headers: [{ key, value }] }]`); `next/headers` `headers()` — async, read-only
  (`.../04-functions/headers.md`).
- nginx `/uploads/` da hozir `add_header` yo'q (HSTS meros bo'ladi), lekin u yerga `nosniff` qo'shilsa server darajasidagi
  HSTS meros bo'lmay qoladi — shuning uchun ikkalasi ham `/uploads/` ichida yoziladi.
- `apps/web/lib/request-guard.ts:37` — `/\t/evil.com` o'tadi.
- `docs/DEPLOY.md:57` — `cut -d= -f2` va `-m admin@example.uz`; `:221` — "seed … boshqa ma'lumotlarga tegmaydi" (noto'g'ri).
- `TASKS.md` "Umumiy holat": A 3/4, B 4/8, C 4/6, D 12/13, E 3/11, F 0/6 = **26/48** (bo'limlardan qayta sanaldi — mos).

## Dizayn qarorlari (coder shu bo'yicha yozadi)

**D1. Mijoz IP'si (web).** Yangi sof modul `apps/web/lib/client-ip.ts` (`server-only` importisiz, faqat `node:net`):
- `clientIpFromHeaders(h: { get(name: string): string | null }): string | undefined` — faqat `x-real-ip` ni o'qiydi
  (`x-forwarded-for` ga **hech qachon** qaramaydi), `trim()`, `net.isIP(v) !== 0` bo'lsa qaytaradi, aks holda `undefined`
  (bo'sh, `unknown`, vergulli ro'yxat, probel/boshqaruv belgisi — rad).
- `buildBackendHeaders(opts: { token?: string; hasBody: boolean; clientIp?: string }): Record<string, string>` —
  `Accept: application/json`, `hasBody` → `Content-Type: application/json`, `token` → `Authorization: Bearer …`,
  `clientIp` → `X-Forwarded-For: <clientIp>` (bitta qiymat). `clientIp` yo'q bo'lsa `X-Forwarded-For` kaliti umuman yo'q.
- `backend.ts`: `BackendRequest`ga `clientIp?: string`, sarlavhalar `buildBackendHeaders` orqali.
- Chaqiruvchilar: route handler'larda `clientIp: clientIpFromHeaders(request.headers)`; `session.ts` `getAdminUser`da
  `clientIp: clientIpFromHeaders(await headers())` (`import { headers } from 'next/headers'`).
- Dev'da (nginx yo'q) `x-real-ip` odatda yo'q → sarlavha yuborilmaydi; dev backend `TRUST_PROXY`siz XFF'ni e'tiborsiz qoldiradi.
- nginx o'zgarmaydi (X-Real-IP allaqachon server darajasida va `location /` meros oladi) — faqat AC-3 da tekshiriladi.

**D2. Mock SMS ruxsat ro'yxati.** Yangi sof modul `apps/backend/src/common/config/mock-sms-allowlist.ts`:
```ts
export interface MockSmsAllowlist { active: boolean; phones: ReadonlySet<string>; invalid: string[] }
export function parseMockSmsAllowlist(env: Record<string, string | undefined>): MockSmsAllowlist
```
- `active = env.NODE_ENV === 'production' && (env.SMS_MODE ?? 'mock') === 'mock'`.
- `MOCK_SMS_ALLOWED_PHONES` — vergul bilan ajratilgan; har element `trim()`, bo'shlari tashlanadi, `normalizeUzPhone`
  (`common/decorators/normalized-phone.decorator.ts`) bilan kanonik `+998XXXXXXXXX` ga keltiriladi, `UZ_PHONE_REGEX`
  ga mos kelmasa `invalid`ga (asl qiymat) tushadi. `active=false` bo'lsa ham parse qilinadi (lekin ishlatilmaydi).
- `production-guard.ts` `findProductionConfigErrors` (faqat production):
  - `SMS_MODE` berilgan va `mock` emas → xato: `SMS_MODE=<qiymat> hali qo'llab-quvvatlanmaydi — faqat mock (haqiqiy provider: TASKS.md B-01)`.
    (B-01 Eskiz'ni ulaganda shu qoidani yumshatadi.)
  - mock + `ALLOW_MOCK_SMS_IN_PRODUCTION=true` + `phones.size === 0` → xato (matnida `MOCK_SMS_ALLOWED_PHONES`).
  - mock + ALLOW + `invalid.length > 0` → xato (matnida `MOCK_SMS_ALLOWED_PHONES` va noto'g'ri elementlar).
  - Mavjud qoidalar (JWT_SECRET, ALLOW bayrog'i, CORS_ORIGINS) o'zgarmaydi.
- `AuthService` konstruktorida `parseMockSmsAllowlist({ NODE_ENV, SMS_MODE, MOCK_SMS_ALLOWED_PHONES })` (`configService.get`
  orqali) bir marta. Private `assertPhoneAllowed(phone)`: `active && !phones.has(phone)` → `ForbiddenException`
  ("Yopiq sinov: bu raqam bilan kirish hali ochilmagan"). `sendOtp` va `verifyOtp`ning **birinchi** qadami (Redis'ga
  murojaatdan oldin). `active` va ro'yxat bo'sh (guard aylanib o'tilgan) → hamma raqam 403 (fail-closed).
- Controller: `sendOtp`/`verifyOtp` `@ApiErrorResponses`ga `403` qo'shiladi (send-otp'da hozir yo'q).
- Ro'yxatni o'zgartirish: `.env.production` → `dc up -d backend` (qayta ishga tushirish shart — DEPLOY.md'da).

**D3. Seed (ma'lumotnomalar) — faqat bo'sh bazada yaratadi.** Yangi `apps/backend/prisma/seed-reference.ts`:
```ts
export async function seedReferenceData(db: PrismaClient, data: {
  regions: readonly { code: string; nameUz: string; nameRu: string }[];
  districtsByRegionCode: Record<string, readonly { nameUz: string; nameRu: string }[]>;
  categories: readonly { slug: string; nameUz: string; nameRu: string; icon: string; description: string }[];
}): Promise<{ regions: 'created' | 'skipped'; categories: 'created' | 'skipped' }>
```
- Viloyat+tumanlar: bitta `db.$transaction(async (tx) => …, { timeout: 30_000 })` ichida `tx.region.count()`; `> 0`
  bo'lsa `'skipped'` (hech narsa yozilmaydi). `0` bo'lsa har viloyat `tx.region.create({ data: { …region, districts:
  { createMany: { data: districts } } } })`.
- Kategoriyalar: `db.category.count()`; `0` bo'lsa `db.category.createMany({ data: categories })`, aks holda `'skipped'`.
- Hech qanday `update`/`upsert`/`updateMany` chaqirilmaydi. Sabab (`update: {}` emas): region `code` va kategoriya `slug`
  admin tomonidan tahrirlanadi, tumanning kaliti yo'q — kalit bo'yicha create-only ham admin o'chirgan/o'zgartirgan
  yozuvni qayta yaratardi.
- `prisma/seed.ts`: ma'lumot massivlari shu faylda qoladi; `main()` dagi viloyat/tuman/kategoriya bloki
  `seedReferenceData(prisma, { regions, districtsByRegionCode, categories })` chaqiruvi va natijani log qilish bilan
  almashtiriladi (`import { seedReferenceData } from './seed-reference.js';` — tsx `.js`→`.ts` ni hal qiladi). Admin
  `upsert` bloki **o'zgarmaydi** (hujjatlashtirilgan: parol/login/rol/blok `.env` ga qaytadi).
- Test: `apps/backend/prisma/seed-reference.spec.ts` (backend `vitest.config.ts` `**/*.spec.ts` ni oladi; `tsc --noEmit`
  ham qamraydi). Haqiqiy DB'da sinov lokal mavjud emas (dev Postgres — `texnozor` project, tegilmaydi; CI e2e seed
  qilmaydi) — real ishlash birinchi deploy'da DEPLOY.md §3 tekshiruvida ko'riladi (Risks).

**D4. O'z omborimiz URL'i va portfolio cheklovi.**
- `StorageService.publicUrlForKey(key: string): string` (= oxiridagi `/` olib tashlangan `publicUrl` + `/` + `key`); `uploadFile` uni ishlatadi.
- `MasterProfileService` (konstruktorga `StorageService`; `UploadModule` uni allaqachon eksport qiladi, `MastersModule`
  uni import qiladi): `addPortfolioImage` — profil topilgach (1) `storage.keyFromPublicUrl(dto.url) === null` →
  `BadRequestException({ message, errors: { url: [...] } })`; (2) `prisma.portfolioImage.count({ where: { masterId } }) >= 20`
  → `BadRequestException({ message: "Portfolio'da ko'pi bilan 20 ta rasm bo'lishi mumkin", errors: { url: [...] } })`.
  Konstanta `MAX_PORTFOLIO_IMAGES = 20`.
- `AuthService.updateProfile` (konstruktorga `StorageService`): `dto.avatarUrl !== undefined` va
  `keyFromPublicUrl(dto.avatarUrl) === null` → `BadRequestException({ message, errors: { avatarUrl: [...] } })`, bazaga
  yozishdan oldin. DTO'lardagi `@IsUrl`/`@MaxLength` qoladi (format xatosi DTO'da, egalik — service'da); DTO izohlari va
  Swagger misoli yangilanadi (MinIO eslatmasi olib tashlanadi).
- Mavjud bazadagi eski URL'lar o'zgarmaydi; `DELETE /masters/me/portfolio?url=` eski (begona) URL bilan ham ishlaydi.
- `test/masters.e2e-spec.ts`: `first`/`second` → `app.get(StorageService).publicUrlForKey(\`images/${randomUUID()}.jpg\`)`;
  yangi assert: `https://example.com/images/<uuid>.jpg` → 400.

**D5. Admin sessiyasi — 12 soat, yangilanmaydi.**
- `auth.service.ts`: `export const ADMIN_TOKEN_TTL_SECONDS = 12 * 60 * 60;` (env emas — web cookie bilan bir xil son
  bo'lishi uchun konstanta). ADMIN uchun token `jwtService.sign({ sub }, { expiresIn: ADMIN_TOKEN_TTL_SECONDS })`;
  CLIENT/MASTER — modul standarti (`JWT_EXPIRES_IN ?? '30d'`, o'zgarmaydi).
- `getMe` va `updateProfile` ADMIN uchun `token` kalitisiz sessiya qaytaradi (yangi token imzolanmaydi) — aks holda
  `/auth/me` orqali 12 soatlik cheklovni cheksiz uzaytirish mumkin. `UserSession.token` → `token?: string`.
  CLIENT/MASTER javoblari o'zgarmaydi. `adminLogin` va `verifyOtp` javob shakli o'zgarmaydi.
- Web `lib/config.ts`: `TOKEN_COOKIE_MAX_AGE = 60 * 60 * 12` (izoh: backend `ADMIN_TOKEN_TTL_SECONDS` bilan bir xil).
  401 oqimi o'zgarmaydi: proksi 401 da cookie'ni o'chiradi (`[...path]/route.ts`), `api-client.ts` `/login?next=` ga
  yo'naltiradi, `(admin)/layout.tsx` `getAdminUser() === null` da `redirect('/login')`, login sahifasi yaroqsiz cookie
  bilan forma ko'rsatadi (sikl yo'q, `/login` `proxy.ts` matcher'idan tashqarida).

**D6. Xavfsizlik sarlavhalari.**
- Yangi `apps/web/lib/security-headers.ts`: `export const SECURITY_HEADERS = [...] as const` — aynan:
  `X-Frame-Options: DENY`; `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`;
  `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`. `script-src`/`default-src`
  **qo'shilmaydi** (Next inline script'larini sindirmaslik uchun; nonce CSP — kelajak).
- `next.config.ts`: `async headers() { return [{ source: '/:path*', headers: [...SECURITY_HEADERS] }]; }`.
- nginx `location /uploads/` ichiga: `add_header X-Content-Type-Options "nosniff" always;` va
  `add_header Strict-Transport-Security "max-age=31536000" always;` (izoh: location'dagi `add_header` server darajasidagi
  HSTS'ni bekor qiladi). Server darajasidagi HSTS qoladi; boshqa location'larga tegilmaydi.

**D7. `safeNextPath`.** Avval: `/[\u0000-\u001F\u007F\\]/` (boshqaruv belgilari va istalgan joydagi backslash) bo'lsa `'/'`.
So'ng mavjud tekshiruvlar (`/` bilan boshlanadi, `//` emas, `/login` emas) va qo'shimcha
`new URL(next, 'http://panel.invalid').origin === 'http://panel.invalid'` (aks holda `'/'`). Qaytariladigan qiymat — asl `next`.

**D8. Konteyner xotira limitlari** (`docker-compose.prod.yml`, 4–8 GB VPS uchun; jami ≈ 3.3 GB, qolgani host build va
OS uchun, swap bilan): `x-backend` anchor (backend + migrate) `mem_limit: 768m`; `web` `512m`; `postgres` `1g` +
`oom_score_adj: -500` (host xotirasi tugasa OOM-killer postgres'ni oxirgi navbatda tanlasin); `redis` `256m`; `garage` `512m`.
nginx/certbot/garage-init — limitsiz (kichik). Izoh qatori compose faylida.

## Acceptance criteria
Belgilar: `[unit]` — vitest test nomi bilan; `[grep]` — diff/fayl bo'yicha statik tekshiruv; `[run]` — Verification
commands'dagi buyruq; `post-PR` — faqat PR ochilgandan keyin tekshiriladi.

**1 — Mijoz IP'si**
- [ ] AC-1 [unit] `apps/web/lib/client-ip.test.ts`: `clientIpFromHeaders` → `x-real-ip: '203.0.113.7'` → `'203.0.113.7'`;
  `' 203.0.113.7 '` → trim qilingan; `'2001:db8::1'` → o'zi; `undefined` qaytadi: sarlavha yo'q, `''`, `'unknown'`,
  `'1.2.3.4, 5.6.7.8'`, `'1.2.3.4 x'`, `'1.2.3.4\nX-Evil: 1'` (oddiy `{ get }` fake orqali); faqat `x-forwarded-for: '6.6.6.6'`
  bo'lsa ham `undefined`. `buildBackendHeaders`: `clientIp` bilan `X-Forwarded-For` aynan shu qiymat; `clientIp`siz
  `X-Forwarded-For` kaliti yo'q; `token` → `Authorization: Bearer <token>`; `hasBody: false` → `Content-Type` yo'q.
- [ ] AC-2 [grep] `apps/web/lib/backend.ts` `buildBackendHeaders` dan foydalanadi va `BackendRequest`da `clientIp?: string`;
  `rg -n "backendRequest\(" apps/web --glob '!**/node_modules/**'` faqat 3 ta chaqiruv (login route, backend proxy route,
  `session.ts`) ko'rsatadi va har birida `clientIp: clientIpFromHeaders(` bor; `session.ts` `headers` ni `next/headers` dan import qiladi.
  `client-ip.ts`da `x-forwarded-for` o'qilmaydi (`rg -i "x-forwarded-for" apps/web/lib/client-ip.ts` faqat chiquvchi sarlavha nomi).
- [ ] AC-3 [grep] nginx shablonida server darajasidagi `proxy_set_header X-Real-IP $remote_addr;` saqlangan va
  `location / {` bloki ichida `proxy_set_header` yo'q.

**2 — Mock SMS ruxsat ro'yxati**
- [ ] AC-4 [unit] `mock-sms-allowlist.spec.ts`: `NODE_ENV: 'development'` (ro'yxat bilan ham) → `active: false`;
  production + `SMS_MODE: 'eskiz'` → `active: false`; production + `SMS_MODE` yo'q → `active: true`;
  `'+998 90 123 45 67, 998901234568 ,901234569,,'` → `phones` = `{+998901234567, +998901234568, +998901234569}`, `invalid: []`;
  `'abc,+1234,+998901234567'` → `phones` 1 ta, `invalid` = `['abc', '+1234']`.
- [ ] AC-5 [unit] `production-guard.spec.ts`: production + mock + `ALLOW_MOCK_SMS_IN_PRODUCTION: 'true'` +
  `MOCK_SMS_ALLOWED_PHONES` yo'q / `''` / `' , '` → bitta xato, matnida `MOCK_SMS_ALLOWED_PHONES`; noto'g'ri element bilan →
  xato; to'g'ri ro'yxat bilan → `[]`; production + `SMS_MODE: 'eskiz'` → xato (`SMS_MODE`); dev'da hammasi `[]`.
  `SAFE` fixture mock + ALLOW + ro'yxat ko'rinishiga o'tkazilgan; `assertProductionConfig({ NODE_ENV: 'production' })`
  xabarida hamon `JWT_SECRET`, `SMS_MODE`, `CORS_ORIGINS` bor.
- [ ] AC-6 [unit] `auth.service.spec.ts` (`configService.get` kalit bo'yicha: `NODE_ENV=production`, `SMS_MODE=mock`,
  `MOCK_SMS_ALLOWED_PHONES='+998901234567'`): `sendOtp('+998901234568')` → `ForbiddenException`, `redis.ttl`/`redis.set`/
  `smsProvider.sendOtp` chaqirilmagan; `verifyOtp('+998901234568', '123456')` → `ForbiddenException`, `redis.get` va
  `prisma.user.create` chaqirilmagan; `sendOtp('+998901234567')` → odatdagidek ishlaydi. Faol, ro'yxat bo'sh → ro'yxatdagi
  istalgan raqam ham 403. `NODE_ENV=test` + o'sha ro'yxat → ro'yxatda yo'q raqam ham ishlaydi (dev o'zgarmagan).

**3 — Seed**
- [ ] AC-7 [unit] `apps/backend/prisma/seed-reference.spec.ts` (fake `db`, har modelning `create/createMany/update/upsert/updateMany`
  spy'lari): bo'sh jadvallar → `region.create` fixture'dagi viloyatlar soni marta, har birida `districts.createMany.data`
  shu viloyat tumanlari bilan; `category.createMany` bir marta; natija `{ regions: 'created', categories: 'created' }`.
  `region.count → 3` → hech qanday region/district yozuvi yo'q, `regions: 'skipped'`; `category.count → 8` → kategoriya
  yozuvi yo'q. Barcha holatlarda `update`/`upsert`/`updateMany` hech qachon chaqirilmagan; viloyatlar `$transaction` ichida yaratilgan.
- [ ] AC-8 [grep] `prisma/seed.ts`da `region.upsert`, `district.update`, `district.findFirst`, `category.upsert` yo'q;
  `seedReferenceData(` chaqiruvi bor; admin `prisma.user.upsert` bloki diff'da o'zgarmagan.
- [ ] AC-9 [run] backend Docker image build bo'ladi va image ichida `prisma/seed.ts` hamda `prisma/seed-reference.ts` bor.

**4 — Ombor URL'lari va portfolio cheklovi**
- [ ] AC-10 [unit] `storage.service.spec.ts`: `keyFromPublicUrl(publicUrlForKey(k)) === k` (`k = images/<uuid>.webp`);
  `uploadFile` qaytargan URL `publicUrlForKey(key)` ga teng.
- [ ] AC-11 [unit] `master-profile.service.spec.ts`: `https://example.com/images/<uuid>.jpg` → `BadRequestException`,
  `portfolioImage.create` chaqirilmagan; o'z URL + `count → 19` → yaratiladi; o'z URL + `count → 20` → `BadRequestException`
  (xabarda `20`), `create` chaqirilmagan.
- [ ] AC-12 [unit] `auth.service.spec.ts` `updateProfile`: begona `avatarUrl` → `BadRequestException` (`errors.avatarUrl`),
  `prisma.user.update` va `fileCleanup.deleteIfUnreferenced` chaqirilmagan; o'z URL → yangilanadi (mavjud test saqlanadi);
  faqat `name` → `keyFromPublicUrl` chaqirilmagan.
- [ ] AC-13 [grep] `test/masters.e2e-spec.ts` portfolio URL'larini `publicUrlForKey` + `randomUUID()` bilan yasaydi va begona
  host'li URL uchun `.expect(400)` bor. `docs/TZ.md` §4.0 "Fayl tozalash" bandi yangi qoidani (faqat o'z ombor URL'i, 20 ta) aytadi.

**5 — Admin sessiyasi**
- [ ] AC-14 [unit] haqiqiy `new JwtService({ secret: 'x'.repeat(32), signOptions: { expiresIn: '30d' } })` bilan:
  `adminLogin` tokeni `decode` → `exp - iat === 43200`; `verifyOtp` (CLIENT) tokeni → `exp - iat === 2592000`.
- [ ] AC-15 [unit] `getMe` ADMIN uchun → natijada `token` kaliti yo'q (`not.toHaveProperty('token')`) va `jwtService.sign`
  chaqirilmagan; CLIENT uchun `token` bor. `updateProfile` ADMIN uchun ham `token`siz.
- [ ] AC-16 [unit] `apps/web/lib/config.test.ts`: `TOKEN_COOKIE_MAX_AGE === 43200` va `tokenCookieOptions().maxAge === 43200`;
  backend `ADMIN_TOKEN_TTL_SECONDS === 43200` (auth spec'da). [grep] `[...path]/route.ts`dagi
  `status === 401 ? clearTokenCookie(response)` va `api-client.ts`dagi 401 → `/login?next=` yo'naltirish diff'da o'chirilmagan.

**6 — Sarlavhalar**
- [ ] AC-17 [unit] `apps/web/lib/security-headers.test.ts`: `../next.config` default eksportining `await headers()` natijasida
  `source: '/:path*'` yozuvi va unda D6 dagi 4 ta sarlavha aynan shu qiymatlar bilan; CSP qiymatida `script-src` va
  `default-src` yo'q.
- [ ] AC-18 [run] `pnpm --filter web build` o'tadi; `next start -p 3101` bilan `curl -sI http://localhost:3101/login` va
  `/privacy` → `200`, javobda 4 ta sarlavha bor.
- [ ] AC-19 [grep+run] nginx `location /uploads/` ichida `add_header X-Content-Type-Options "nosniff" always;` va
  `add_header Strict-Transport-Security "max-age=31536000" always;`; server darajasidagi HSTS qatori saqlangan; renderlangan
  shablon `nginx -t` dan o'tadi.

**7 — Open redirect**
- [ ] AC-20 [unit] `request-guard.test.ts`: `'/\t/evil.com'`, `'/\n/evil.com'`, `'/\r//evil.com'`, `'/\u0000x'`, `'/\u007f'`,
  `'/users\\x'` → `'/'`; mavjud yomon holatlar hamon `'/'`; `'/users?page=2'` va `'/masters#top'` o'zgarmay qaytadi.

**8 — DEPLOY.md va compose**
- [ ] AC-21 [run] renderlangan prod compose config'da: `postgres` `mem_limit` `1073741824` va `oom_score_adj: -500`,
  `redis` `268435456`, `garage` `536870912`, `backend` va `migrate` `805306368`, `web` `536870912`; `config -q` exit 0.
- [ ] AC-22 [grep] `docs/DEPLOY.md`:
  (a) §0 va §2 da `MOCK_SMS_ALLOWED_PHONES` — format (vergul, `+998…`/probelli qabul), ro'yxatda yo'q raqamga `403`, bo'sh
  ro'yxat bilan backend ishga tushmasligi, o'zgartirgach `dc up -d backend`, `SMS_MODE` faqat `mock` (B-01 gacha);
  (b) deploy key: `ssh-keygen -t ed25519`, GitHub "Deploy keys" (read-only), `gh repo deploy-key add`, `ssh -T git@github.com`,
  va HTTPS (read-only token) muqobili;
  (c) host hardening bo'limi: `/etc/ssh/sshd_config.d/` drop-in bilan `PasswordAuthentication no` va
  `PermitRootLogin prohibit-password`, `sshd -t` va ikkinchi SSH sessiyada sinash ogohlantirishi, `ufw` (Docker publish
  qilingan portlar ufw'ni chetlab o'tishi haqida izoh), `unattended-upgrades`, `fail2ban` (`fail2ban-client status sshd`),
  swap fayl (`fallocate`, `mkswap`, `swapon`, `/etc/fstab`);
  (d) `admin@example.uz` yo'q, o'rnida `<EMAIL>`; 3-band tekshiruvlarida
  `certbot renew --webroot -w /var/www/certbot --dry-run` (compose orqali, `--entrypoint certbot`) va sarlavhalar uchun `curl -sI`;
  (e) `cut -d= -f2)` yo'q; DOMAIN olish snippet'i AC-23 dagidek ishlaydi;
  (f) xotira limitlari (D8 sonlari) va nima uchunligi;
  (g) §10: "boshqa ma'lumotlarga tegmaydi" iborasi yo'q; seed mavjud viloyat/tuman/kategoriyalarni o'zgartirmasligi
  (faqat bo'sh bazada yaratadi) va asosiy admin parol/login/rol/blokni `.env.production`ga qaytarishi aytilgan;
  (h) §11 `ADMIN_PASSWORD` qatori va §9 "Shubhali faollik" — admin sessiyasi ko'pi bilan 12 soat.
- [ ] AC-23 [run] DEPLOY.md'dagi DOMAIN olish snippet'i (aynan hujjatdagi matn) to'rtta vaqtinchalik faylda —
  `DOMAIN=example.uz`, `DOMAIN="example.uz"`, `DOMAIN='example.uz'`, `DOMAIN=example.uz` + `\r` — har birida `example.uz` beradi.
- [ ] AC-24 [grep] `.env.production.example` diff'ida `MOCK_SMS_ALLOWED_PHONES=` qatori izoh bilan qo'shilgan
  (`git diff origin/main -- .env.production.example`; agar ruxsat tizimi bu faylni o'qishni rad etsa — verifier
  "permission bilan tekshirilmadi" deb yozadi, FAIL emas).

**Hujjatlar va umumiy**
- [ ] AC-25 [grep] `docs/TZ.md`: §2 Backend Auth — ADMIN tokeni 12 soat; §4.0 UserSession — ADMIN'ning `/auth/me`/`/auth/profile`
  javobida `token` yo'q; §4.0 fayl URL qoidasi (AC-13); §4.1 admin kirish bandi — 12 soat, yangilanmasligi, 401 → login;
  §4.1 `PUT /admin/me/password` — "ko'pi bilan 12 soat"; §5 — yopiq sinov ruxsat ro'yxati, panel→backend `X-Forwarded-For`,
  panel sarlavhalari; §6 production himoyalari ro'yxatida `MOCK_SMS_ALLOWED_PHONES` va `SMS_MODE` faqat `mock`;
  §4.1 seed bandi — ma'lumotnomalar faqat bo'sh bazada yaratiladi. TZ commit'i kod o'zgarishidan oldin yoki o'sha commit'da.
- [ ] AC-26 [grep] `TASKS.md`: E bo'limida `- [x] **E-12 · Deploy oldidan audit tuzatishlari** — Claude — ✅ Bajarildi (2026-10-22, PR #__PR__)`,
  ostida 1–8 bandlar qisqa ro'yxati; `- [ ] **E-13 · …**` ochiq vazifa — "Out of scope"dagi barcha bandlar bilan;
  E-02 ostida `MOCK_SMS_ALLOWED_PHONES` eslatmasi; "Umumiy holat": E `4 | 13`, Jami `27 | 50`, qolgan qatorlar o'zgarmagan;
  Verification'dagi qayta sanash skripti jadval bilan mos.
- [ ] AC-27 [run] Verification commands'dagi barcha buyruqlar exit 0 (lint, typecheck, backend/web unit, backend/web build).
- [ ] AC-28 `post-PR`: PR CI'da `check`, `docker`, `e2e` (yangilangan `masters.e2e-spec.ts` bilan), `shellcheck` job'lari yashil.
- [ ] AC-29 `post-PR`: PR tavsifida "⚠️ Mobile app contract impact" bo'limi: (1) `PUT /auth/profile` `avatarUrl` va
  `POST /masters/me/portfolio` `url` faqat `POST /upload/single` qaytargan URL (aks holda 400), portfolio ≤ 20 — ilova
  allaqachon shunday ishlaydi, o'zgarish kerak emas; (2) production yopiq sinovda ro'yxatda yo'q raqamga `send-otp`/`verify-otp` → 403
  (ilova `message`ni Alert'da ko'rsatadi); (3) `/auth/me` ADMIN uchun `token`siz — ilovaga ta'sir yo'q. Hamda
  `TASKS.md`dagi `PR #__PR__` haqiqiy PR raqami bilan almashtirilgan.

## Tasks

### T1 — `docs/TZ.md` (kontrakt avval)
- route: sonnet
- why route: auth/xavfsizlik kontrakti (token muddati, 403/400 qoidalari) — keyingi kod va mobil ilova shunga tayanadi.
- files: modify `docs/TZ.md` (§0 ga 2026-10-22 qatori, §2 Backend Auth, §4.0 UserSession va "Fayl tozalash", §4.1 admin kirish,
  `PUT /admin/me/password`, seed bandi, §5 yangi bandlar, §6 production himoyalari) — D1–D7 bo'yicha.
- tests first: yo'q (hujjat); AC-25 grep ro'yxati bo'yicha o'zi tekshiradi.
- done when: AC-25.

### T2 — Web: mijoz IP'sini backend'ga uzatish
- route: sonnet
- why route: ishonch chegarasi (soxtalashtirilgan IP rate limit va admin-login blokini aylanib o'tishi mumkin).
- files: create `apps/web/lib/client-ip.ts`, `apps/web/lib/client-ip.test.ts`; modify `apps/web/lib/backend.ts`,
  `apps/web/lib/session.ts`, `apps/web/app/api/auth/login/route.ts`, `apps/web/app/api/backend/[...path]/route.ts`.
- tests first: `client-ip.test.ts` AC-1 holatlari (modul yo'qligida FAIL).
- done when: AC-1, AC-2, AC-3.

### T3 — Web: `safeNextPath` qattiqlashtirish
- route: sonnet
- why route: open redirect (xavfsizlik), kichik lekin nozik.
- files: modify `apps/web/lib/request-guard.ts`, `apps/web/lib/request-guard.test.ts`.
- tests first: AC-20 dagi yangi holatlar (`'/\t/evil.com'` hozir FAIL).
- done when: AC-20.

### T4 — Xavfsizlik sarlavhalari (panel + nginx `/uploads`)
- route: sonnet
- why route: CSP/sarlavha xatosi panelni sindiradi yoki himoyani jimgina o'chiradi; nginx `add_header` meros qoidasi nozik.
- files: create `apps/web/lib/security-headers.ts`, `apps/web/lib/security-headers.test.ts`; modify `apps/web/next.config.ts`,
  `deploy/nginx/templates/default.conf.template` (faqat `location /uploads/` + izoh).
- tests first: `security-headers.test.ts` (AC-17) `headers` yo'qligida FAIL.
- done when: AC-17, AC-18, AC-19.

### T5 — Admin JWT 12 soat, yangilanmaydigan sessiya
- route: sonnet
- why route: autentifikatsiya; sessiyani uzaytirish teshigi (`/auth/me`).
- files: modify `apps/backend/src/modules/auth/auth.service.ts`, `apps/backend/src/modules/auth/auth.service.spec.ts`,
  `apps/backend/src/modules/auth/types/user-session.type.ts`, `apps/web/lib/config.ts`; create `apps/web/lib/config.test.ts`.
- tests first: AC-14 (haqiqiy `JwtService`, `exp - iat`), AC-15, AC-16 — hozir FAIL (admin tokeni 30 kun, `getMe` token beradi, cookie 7 kun).
- done when: AC-14, AC-15, AC-16.

### T6 — Mock SMS ruxsat ro'yxati (T5 dan keyin — o'sha fayllar)
- route: sonnet
- why route: akkaunt egallashga qarshi asosiy to'siq; production startup guard.
- files: create `apps/backend/src/common/config/mock-sms-allowlist.ts`, `apps/backend/src/common/config/mock-sms-allowlist.spec.ts`;
  modify `apps/backend/src/common/config/production-guard.ts`, `production-guard.spec.ts`, `apps/backend/src/modules/auth/auth.service.ts`,
  `auth.service.spec.ts`, `apps/backend/src/modules/auth/auth.controller.ts` (faqat `@ApiErrorResponses` 403).
- tests first: AC-4, AC-5, AC-6 — yangi testlar FAIL, `SAFE` fixture yangilanadi.
- done when: AC-4, AC-5, AC-6.

### T7 — Faqat o'z ombor URL'lari + portfolio ≤ 20 (T6 dan keyin — `auth.service.ts`)
- route: sonnet
- why route: ishonch chegarasidagi kirish validatsiyasi (begona kontentni bizning domen nomidan ko'rsatish, cheksiz yozuv).
- files: modify `apps/backend/src/modules/upload/storage.service.ts`, `storage.service.spec.ts`,
  `apps/backend/src/modules/masters/master-profile.service.ts`, `master-profile.service.spec.ts`,
  `apps/backend/src/modules/auth/auth.service.ts`, `auth.service.spec.ts` (konstruktorga `StorageService` — barcha `new AuthService(...)`),
  `apps/backend/src/modules/masters/dto/add-portfolio.dto.ts`, `apps/backend/src/modules/auth/dto/update-profile.dto.ts` (faqat izoh/Swagger),
  `apps/backend/test/masters.e2e-spec.ts`.
- tests first: AC-10, AC-11, AC-12 FAIL; e2e o'zgarishi (AC-13) CI'da tekshiriladi.
- done when: AC-10, AC-11, AC-12, AC-13.

### T8 — Seed: ma'lumotnomalar faqat bo'sh bazada
- route: sonnet
- why route: production ma'lumotiga ta'sir qiluvchi skript (admin tahrirlarini o'chirish, dublikatlar) — data migratsiyaga teng.
- files: create `apps/backend/prisma/seed-reference.ts`, `apps/backend/prisma/seed-reference.spec.ts`; modify `apps/backend/prisma/seed.ts`.
- tests first: `seed-reference.spec.ts` AC-7 holatlari (modul yo'qligida FAIL).
- done when: AC-7, AC-8, AC-9.

### T9 — Prod compose xotira limitlari
- route: gemini
- why route: aniq qiymatlar berilgan mexanik YAML o'zgarishi, mantiq yo'q.
- files: modify `docker-compose.prod.yml` — D8 bo'yicha aynan: `x-backend` ga `mem_limit: 768m`; `web` `mem_limit: 512m`;
  `postgres` `mem_limit: 1g` va `oom_score_adj: -500`; `redis` `mem_limit: 256m`; `garage` `mem_limit: 512m`; fayl boshidagi
  izohga bitta qator: "Xotira limitlari 4–8 GB VPS uchun (DEPLOY.md §1); host'da image build swap'ga tayanadi."
- tests first: yo'q; AC-21 buyrug'i o'zgarishdan oldin limitlarsiz natija beradi.
- done when: AC-21.

### T10 — `docs/DEPLOY.md` + `.env.production.example` (T6, T8, T9 dan keyin)
- route: sonnet
- why route: buyruqlar va env nomlari kod bilan aynan mos bo'lishi kerak; SSH hardening xatosi serverga kirishni yo'qotadi.
- files: modify `docs/DEPLOY.md` (§0, §1 — host hardening, deploy key, xotira; §2; §3 — `<EMAIL>`, DOMAIN snippet, certbot dry-run,
  sarlavha tekshiruvi; §8 jadvali — guard xatolari va "403 ro'yxatda yo'q" qatori; §9/§10/§11), `.env.production.example`
  (faylni o'qimasdan oxiriga izohli blok qo'shish mumkin: `# Yopiq sinov (SMS_MODE=mock): OTP faqat shu raqamlarga…` +
  `MOCK_SMS_ALLOWED_PHONES=`).
- tests first: AC-23 snippet'ini hujjatga yozishdan oldin vaqtinchalik fayllarda sinab ko'rish.
- done when: AC-22, AC-23, AC-24.

### T11 — `TASKS.md` (oxirgi)
- route: sonnet
- why route: "Bajarildi" belgisi faqat yuqoridagi AC'lar bajarilganda; sonlar bo'limlardan qayta sanaladi.
- files: modify `TASKS.md` — "Holat sanasi" (2026-10-22, `main` = `3252b83`); E-12 (✅, PR #__PR__) 1–8 ro'yxati bilan; E-13 ochiq
  (Out of scope'dagi barcha bandlar, "Bog'liqlik: E-02 dan keyin, F-06 dan oldin"); E-02 ostiga `MOCK_SMS_ALLOWED_PHONES`
  eslatmasi; jadval E 4/13, Jami 27/50.
- tests first: Verification'dagi qayta sanash skripti o'zgarishdan oldin `E 3 11`, keyin `E 4 13`.
- done when: AC-26.

## Out of scope
(`TASKS.md` E-13 ga kiradi, amalga oshirilmaydi.)
- Token revocation (`tokenVersion`, schema o'zgarishi).
- OTP uchun telefon bo'yicha kunlik limit; `POST /orders` throttle.
- Yangi Prisma indekslar; `page` uchun `@Max`; admin DTO'larda `MaxLength`/slug formati.
- Health check'da DB/Redis tekshiruvi.
- Push logida va Prisma xato logida shaxsiy ma'lumot (PII).
- Dockerfile: corepack versiyasini pin qilish, kod fayllari root egaligida.
- `env_file` minimal huquq (har servisga faqat kerakli o'zgaruvchilar).
- nginx: `default_server`, gzip, `limit_req`, certbot image pin.
- `error.tsx` / `not-found.tsx`; admin layout redirect'ida `?next=`; `public/` dagi qolgan SVG'lar.

## Risks / open questions
- **Qabul qilingan qarorlar (savol emas, orkestrator bilishi kerak):** (1) seed — `update: {}` o'rniga "jadval bo'sh bo'lsa"
  (D3), chunki `code`/`slug` tahrirlanadi va tumanlarning kaliti yo'q; oqibat: kelajakda seed'ga yangi viloyat/kategoriya
  qo'shilsa, mavjud bazaga avtomatik tushmaydi (admin panel orqali qo'shiladi). (2) `GET /auth/me`/`PUT /auth/profile` ADMIN
  uchun `token`siz (D5) — busiz 12 soat cheklovi ma'nosiz. (3) production'da `SMS_MODE≠mock` rad etiladi (D2) — hozir
  `SMS_MODE=eskiz` jimgina mock'ni ruxsatsiz yoqib yuboradi. (4) postgres `oom_score_adj: -500` (D8).
- Seed haqiqiy Postgres'da lokal sinalmaydi (dev DB — `texnozor` project, tegilmaydi; CI e2e seed qilmaydi). Kafolat — unit test
  (AC-7) + `tsc` + image ichida fayl borligi (AC-9); haqiqiy ishlash birinchi deploy'da `dc run --rm backend node_modules/.bin/tsx prisma/seed.ts`
  logidagi `created`/`skipped` qatori va `/api/v1/regions` bilan ko'riladi.
- Portfolio 20 cheklovi `count` → `create` (tranzaksiyasiz): bir vaqtdagi parallel so'rovlar 21+ ga olib chiqishi mumkin —
  yumshoq cheklov sifatida qabul qilingan (bitta usta, bitta qurilma).
- Admin-login bloki login nomi bo'yicha (5 xato → 15 daqiqa) — IP tuzatilgandan keyin ham login nomini bilgan begona odam
  adminni 15 daqiqaga bloklashi mumkin. Bu reja doirasida emas; kerak bo'lsa orkestrator E-13 ga qo'shadi.
- `oom_score_adj` manfiy qiymati rootless Docker'da ishlamaydi — VPS'da oddiy (root) Docker ishlatiladi (DEPLOY.md §1).
- e2e (`masters.e2e-spec.ts` o'zgaradi) lokal ishga tushirilmaydi — dev Postgres/Redis `texnozor` project'iga tegmaslik uchun;
  CI `e2e` job'i (AC-28) hal qiluvchi.
- `.env.production.example` ni o'qish ruxsat tizimi tomonidan rad etilishi mumkin — coder faqat oxiriga qo'shadi (AC-24).

## Verification commands
Hammasi worktree'da: `cd /Users/macstore.uz/Desktop/.worktrees/texnozor/deploy-readiness`. `texnozor` compose project'iga
(`docker compose up/down/restart`, uning konteynerlari va volume'lari) **tegilmaydi**; `.env*` fayllar o'qilmaydi.

```bash
# 0) Tayyorlash (yangi worktree'da shart, aks holda tsc/test/build yolg'on yiqiladi)
pnpm install --frozen-lockfile
pnpm --filter backend exec prisma generate

# 1) Lint, typecheck, unit testlar, build (AC-27 va barcha [unit] AC'lar)
pnpm lint
pnpm typecheck
pnpm --filter backend test
pnpm --filter web test
pnpm --filter backend build
pnpm --filter web build

# 2) Panel sarlavhalari jonli (AC-18) — 3101 port, dev server (3001) bilan to'qnashmaydi
(cd apps/web && pnpm exec next start -p 3101 > /tmp/web-3101.log 2>&1 & echo $! > /tmp/web-3101.pid)
sleep 5
curl -sI http://localhost:3101/login   | grep -iE '^(HTTP|x-frame-options|content-security-policy|x-content-type-options|referrer-policy)'
curl -sI http://localhost:3101/privacy | grep -iE '^(HTTP|x-frame-options|content-security-policy|x-content-type-options|referrer-policy)'
kill "$(cat /tmp/web-3101.pid)"

# 3) Statik tekshiruvlar (AC-2, AC-3, AC-8, AC-19, AC-22)
rg -n "backendRequest\(" apps/web --glob '!**/node_modules/**'
rg -n "clientIpFromHeaders|from 'next/headers'" apps/web/lib apps/web/app
rg -n -i "x-forwarded-for" apps/web/lib/client-ip.ts
rg -n "X-Real-IP|add_header|location " deploy/nginx/templates/default.conf.template
rg -n "region\.upsert|district\.update|district\.findFirst|category\.upsert|seedReferenceData\(" apps/backend/prisma/seed.ts
git diff origin/main -- apps/backend/prisma/seed.ts | rg -n "user\.upsert|passwordHash" || echo "admin block untouched"
rg -n "admin@example\.uz|cut -d= -f2\)|boshqa ma'lumotlarga tegmaydi" docs/DEPLOY.md || echo "old wording gone"
rg -n "MOCK_SMS_ALLOWED_PHONES|PasswordAuthentication no|PermitRootLogin prohibit-password|sshd -t|unattended-upgrades|fail2ban|fallocate|deploy-key add|ssh-keygen -t ed25519|ssh -T git@github.com|<EMAIL>|--dry-run|mem_limit|12 soat" docs/DEPLOY.md
rg -n "MOCK_SMS_ALLOWED_PHONES|12 soat|X-Forwarded-For|frame-ancestors|bo'sh bazada|20 ta" docs/TZ.md
git diff origin/main -- .env.production.example | rg "MOCK_SMS_ALLOWED_PHONES"   # AC-24 (ruxsat rad etsa — qayd qiling)

# 4) nginx konfiguratsiyasi sintaksisi (AC-19) — mustaqil konteyner, hech qaysi compose project emas
T=$(mktemp -d); mkdir -p "$T/live/ci.example"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=ci.example \
  -keyout "$T/live/ci.example/privkey.pem" -out "$T/live/ci.example/fullchain.pem" 2>/dev/null
docker run --rm -e DOMAIN=ci.example -e S3_BUCKET=ustatop-uploads \
  -v "$PWD/deploy/nginx/templates:/etc/nginx/templates:ro" -v "$T:/etc/letsencrypt:ro" \
  nginx:1.29-alpine sh -c '/docker-entrypoint.d/20-envsubst-on-templates.sh && nginx -t'
rm -rf "$T"

# 5) Prod compose xotira limitlari (AC-21) — faqat render, hech narsa ishga tushmaydi; worktree'da .env yaratilmaydi
T=$(mktemp -d); cp docker-compose.prod.yml "$T/"
printf 'DOMAIN=ci.example\nPOSTGRES_USER=u\nPOSTGRES_PASSWORD=p\nPOSTGRES_DB=d\nS3_ACCESS_KEY=GK000000000000000000000001\nS3_SECRET_KEY=s\nGARAGE_RPC_SECRET=r\nGARAGE_ADMIN_TOKEN=t\n' > "$T/.env.production"
(cd "$T" && docker compose -f docker-compose.prod.yml --env-file .env.production config -q && \
  docker compose -f docker-compose.prod.yml --env-file .env.production config | grep -nE '^  [a-z-]+:$|mem_limit|oom_score_adj')
rm -rf "$T"

# 6) DEPLOY.md DOMAIN snippet'i (AC-23): hujjatdagi snippet'ni aynan nusxalab, har faylga qarshi ishga tushiring
T=$(mktemp -d)
printf 'DOMAIN=example.uz\n'     > "$T/a"; printf 'DOMAIN="example.uz"\n' > "$T/b"
printf "DOMAIN='example.uz'\n"   > "$T/c"; printf 'DOMAIN=example.uz\r\n' > "$T/d"
# for f in a b c d: snippet'dagi `.env.production` ni "$T/$f" ga almashtirib ishga tushiring → har biri `example.uz`
rm -rf "$T"

# 7) Backend image ichida seed fayllari (AC-9) — faqat build, compose emas
docker build -f apps/backend/Dockerfile -t ustatop-backend:deploy-readiness .
docker run --rm --entrypoint ls ustatop-backend:deploy-readiness prisma/seed.ts prisma/seed-reference.ts
docker image rm ustatop-backend:deploy-readiness

# 8) TASKS.md jadvalini bo'limlardan qayta sanash (AC-26) — kutilgan: A 3 4, B 4 8, C 4 6, D 12 13, E 4 13, F 0 6
awk '/^## [A-F]\./{s=substr($2,1,1)} /^- \[x\] \*\*[A-F]-[0-9]+/{d[s]++} /^- \[[ x]\] (~~)?\*\*[A-F]-[0-9]+/{t[s]++} END{for(k in t) print k, d[k]+0, t[k]}' TASKS.md | sort
rg -n "E-12|E-13|PR #__PR__|\*\*27\*\*|\*\*50\*\*" TASKS.md
```

`post-PR` (AC-28, AC-29): `gh pr checks <PR>` — `check`, `docker`, `e2e`, `shellcheck` yashil; `gh pr view <PR> --json body`
da "⚠️ Mobile app contract impact" bo'limi uchta band bilan; `TASKS.md`da `PR #__PR__` o'rnida haqiqiy raqam.
