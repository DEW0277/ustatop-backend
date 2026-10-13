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
- **E2e testlar** (`apps/backend/test/*.e2e-spec.ts`, `pnpm --filter backend test:e2e`): haqiqiy Postgres (`?schema=test` — dev ma'lumotiga tegmaydi, `test:e2e` avtomatik `prisma migrate deploy` qiladi) va dev Redis'ga ulanadi (`test/e2e-global-setup.ts` oldingi ishga tushirishdan qolgan `otp:*` kalitlarni tozalaydi). PR ochishdan oldin **shart emas** (Postgres/Redis ishga tushirilgan bo'lishi kerak), lekin auth/admin/orders kabi muhim oqimlarga tegadigan o'zgarishlarda ishga tushirib ko'rish tavsiya etiladi. Yangi e2e fayl yozsangiz: `test/e2e-utils.ts`dagi `createTestApp`/`otpLogin`dan foydalaning, o'ziga xos 2 xonali `tag` bilan telefon raqami oling (`testPhone`/`testPhonePrefix`) va `afterAll`da o'zi yaratgan qatorlarni tozalang — **hech qachon haqiqiy seed ma'lumotini (region/district/category) to'g'ridan-to'g'ri o'zgartirmang yoki o'chirmang**, doim testga xos yangi fixture yarating.
- Global API prefix `api/v1` (`app.setGlobalPrefix('api/v1')`) — barcha endpointlar `docs/TZ.md`dagi kabi `/api/v1/...` ko'rinishida ishlaydi, Swagger `/api/docs`da.
- Global response format, xato filter va validatsiya allaqachon tayyor: `apps/backend/src/common/{interceptors,filters,pipes,decorators,prisma}/`. Yangi controller yozganda buni qayta yaratmang — mavjudidan foydalaning. Custom xabar kerak bo'lsa `@ResponseMessage('...')` dekoratoridan foydalaning.
- `JwtAuthGuard`/`RolesGuard` istalgan moduldan ishlatilishi mumkin — `common/auth/shared-auth.module.ts` (`@Global()`) `PassportModule`ni bir marta ro'yxatga oladi. Buni har bir modulga alohida import qilishga urinmang (avval xato bo'lgan, tuzatilgan).
- Dockerdagi Postgres porti **5455** (5432 va 5433 shu mashinada boshqa xizmatlar tomonidan band edi) — `docker-compose.yml` va `apps/backend/.env.example`ga qarang.
- **Mobil ilova kontrakti**: javob shakllari `/Users/macstore.uz/Desktop/mobile-app/src/types/index.ts` va `src/services/api/*.ts` bilan aynan mos bo'lishi shart (tekis `Master`/`Review`/`OrderItem`, `portfolioImages: string[]`, ISO string sanalar, yo'q maydon `null` emas — kalitsiz). Yangi endpoint/javob yozishdan oldin shu fayllarni o'qing; batafsil qarorlar `docs/TZ.md` §4.0. Telefon DTO'larida `@NormalizedPhone()` ishlating (ilova probelli format yuboradi).
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

- **Har agent o'z git worktree'sida ishlaydi** — bir papkada bir nechta agent branch almashtirsa, bir-birining ishini buzadi. Asosiy papka (`texnozor/`) Claude'niki; boshqa agent (Gemini): `git fetch origin && git worktree add ../texnozor-<agent> -b <branch> origin/main`, so'ng o'sha papkada `pnpm install`, `cp ../texnozor/apps/backend/.env apps/backend/.env`, `cp ../texnozor/apps/web/.env.local apps/web/.env.local`. Keyingi vazifada: `git fetch origin && git switch -c <yangi-branch> origin/main`.
- Vazifalar GitHub issue sifatida beriladi (`[Gemini] ...`). Ish tugagach: branch'ni push qiling, `gh pr create --base main` bilan PR oching (tavsifda `Closes #<issue>`), **o'zingiz merge qilmang** — Claude review qilib merge qiladi. Review izohlari kelsa, o'sha branch'ga yangi commit qo'shing (force-push emas).
- Branch nomlash: `feat/<module>-<agent>` (`claude` | `gemini`; masalan `feat/orders-claude`, `feat/regions-gemini`)
- Commit format — Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`, `refactor(scope): ...`
- Har bir PR tavsifida: nima o'zgardi, qaysi modulga tegishli, agar backend DTO o'zgargan bo'lsa — **"⚠️ Mobile app contract impact"** deb alohida belgilang (chunki mobil ilova alohida repoda, qo'lda sync qilinadi).
- `main` branch'ga to'g'ridan-to'g'ri commit qilinmaydi, faqat PR orqali.

## 6. Vazifa taqsimoti (murakkablik bo'yicha — batafsili `docs/TZ.md` §7.1)

- **Claude**: Auth, Orders, Reviews, Masters biznes-mantiq, xavfsizlik-muhim kod, infratuzilma, barcha PR review va `main`ga merge.
- **Gemini Flash**: Regions/Districts/Categories CRUD, DTO/Swagger boilerplate, seed data, Upload wiring, admin panelning oddiy CRUD sahifalari.
- **Infratuzilma** (CI, Dockerfile'lar, production compose/Nginx, deploy hujjatlari) — Claude.

O'z zonangizdan tashqari modulga tegishli faylni o'zgartirishdan oldin, agar boshqa agent shu modulda ochiq branch/PR'ga ega bo'lsa — konflikt oldini olish uchun avval mavjud branch'larni tekshiring (`git branch -a`, `git log --all --oneline`).

## 7. Test va sifat nazorati

- Yangi service metodiga kamida bitta unit test (`*.service.spec.ts`) yozilishi shart.
- PR ochishdan oldin: `pnpm lint && pnpm typecheck && pnpm test` xatosiz o'tishi kerak.
- **CI** (`.github/workflows/ci.yml`, har PR va `main` push'da): `check` — lint, typecheck (`tsc --noEmit`, test fayllari ham), unit testlar, build; `e2e` — backend e2e haqiqiy Postgres/Redis bilan. Ikkalasi yashil bo'lmaguncha PR merge qilinmaydi.
- Murakkab/kritik modullar (auth, orders status, rating hisoblash) uchun edge-case testlar majburiy (masalan: noto'g'ri OTP, muddati o'tgan token, ruxsatsiz status o'zgartirish).

## 8. Vazifalar ro'yxati — `TASKS.md` (majburiy)

Loyihani 100% tugatishgacha qolgan barcha ishlar [`TASKS.md`](TASKS.md)da — bu yagona jonli ro'yxat.

- Ishni boshlashdan oldin `TASKS.md`dan vazifani toping va uning bog'liqliklarini tekshiring. Ro'yxatda yo'q ish chiqsa — avval yangi ID bilan qo'shing.
- **Har bir vazifa tugagach, o'sha PR ichida `TASKS.md`ni yangilang**: `- [ ]` → `- [x]`, sarlavha oxiriga `— ✅ Bajarildi (YYYY-MM-DD, PR #N)`, va "Umumiy holat" jadvalidagi sonni oshiring. `TASKS.md` yangilanmagan PR tugallanmagan hisoblanadi.
- "Bajarildi" faqat vazifaning **Tayyor mezoni** to'liq bajarilganda qo'yiladi. Qisman ish uchun belgi qo'ymang — vazifa ostiga `> 🔄 Jarayonda: ...` izohi yozing.
- Vazifalarni o'chirmang va ID'larni qayta raqamlamang; bekor qilingani `~~...~~ — ❌ Bekor qilindi (sana, sabab)` deb belgilanadi.

## 9. Nima qilmaslik kerak

- Spec'da yo'q yangi endpoint yoki DB ustun qo'shmang — avval `docs/TZ.md`ni yangilang, keyin kod yozing.
- `node_modules`, `.env`, `dist`, `.next` kabi fayllarni commit qilmang (`.gitignore`da bor).
- Hech qachon `prisma migrate reset` yoki production DB'ga bevosita ulanishni so'ramasdan bajarmang.

## Admin panel (`apps/web`) — auth arxitekturasi

Bu qism Claude zonasi (xavfsizlik-muhim); sahifa yozuvchilar shu qoidalarga amal qiladi:

- **Token brauzerga chiqmaydi.** Kirish — **login + parol** (`/api/auth/login` route handler → backend `POST /auth/admin/login`; telefon/OTP bilan kirish yo'q): javobdagi JWT `httpOnly` cookie'ga (`ustatop_admin_token`, `SameSite=Lax`, prod'da `Secure`) yoziladi. Faqat `role: admin` uchun sessiya ochiladi.
- **Backend'ga faqat proksi orqali.** Klient komponentlarda `import { api } from '@/lib/api-client'` → `api<Paginated<T>>('/admin/users', { query: { page: 1 } })`. Bu `/api/backend/*` ga boradi va cookie'dan `Authorization` qo'shadi. `fetch('http://localhost:3000/...')` ni brauzerdan **hech qachon** chaqirmang; `NEXT_PUBLIC_*` bilan backend URL yoki token bermang.
- **Proksi allow-list** (`lib/request-guard.ts`): `admin/*` (barcha metodlar) + `regions|districts|categories` (faqat GET). Yangi yo'l kerak bo'lsa — Claude'ga so'rang, o'zingiz kengaytirmang.
- **Server component'da** ma'lumot kerak bo'lsa: `lib/backend.ts` `backendRequest(path, { token })` + `getToken()` (`lib/session.ts`). Ular `server-only`.
- **Himoya**: `app/(admin)/layout.tsx` har so'rovda `getAdminUser()` (backend `/auth/me` + role) bilan tekshiradi. Yangi sahifalarni `app/(admin)/...` ichiga qo'ying — auth avtomatik. `proxy.ts` (Next 16'da `middleware` nomi `proxy`) faqat cookie mavjudligini ko'radi, u himoya emas.
- **Nav**: yangi bo'lim `lib/nav.ts` dagi `NAV_ITEMS`ga qo'shiladi.
- **Xato/format**: backend javobi `{ success, data, message }`; `api()` `data`ni qaytaradi, xatoda `ApiError` (`message`, `status`, `errors` maydonlar bo'yicha) tashlaydi, 401 da login'ga yo'naltiradi.
- **Dev**: web `http://localhost:3001` (backend 3000), `apps/web/.env.local` (`BACKEND_URL`, namuna `.env.example`). Admin: `apps/backend/.env`dagi `ADMIN_LOGIN` + `ADMIN_PASSWORD` (`prisma db seed` yaratadi; `.env` o'zgarsa seed'ni qayta ishga tushiring).
- **Test**: `pnpm --filter web test` (vitest, `lib/**/*.test.ts`). Sof mantiq (zod sxema, `request-guard.ts`, formatlovchi funksiyalar) shu tarzda test qilinadi; React komponentlari uchun hozircha test kutubxonasi (`@testing-library/react`) ulanmagan — kerak bo'lsa avval Claude'dan so'rang.

## Admin panel — UI stack va namunaviy sahifa

- **Komponentlar**: shadcn/ui, `pnpm dlx shadcn@latest add @shadcn/<nom>` bilan qo'shiladi (`components.json`, `style: base-nova`). **Diqqat**: bu — training data'dagi klassik shadcn (Radix asosida, `Form`/`FormField` bilan) emas — yangi avlod, **Base UI** (`@base-ui/react`) ustida qurilgan: komponentlar `asChild` o'rniga `render={<Button/>}` prop'idan foydalanadi (masalan `components/ui/dialog.tsx`dagi `DialogTrigger`), forma uchun `Form` komponenti yo'q — o'rniga `@shadcn/field` (`Field`, `FieldLabel`, `FieldContent`, `FieldError`, ...) react-hook-form bilan qo'lda (`Controller`) ulanadi. Yangi komponent qo'shishdan oldin generatsiya qilingan faylni o'qing, eski shadcn misollariga ishonmang.
- **Data fetching**: TanStack Query (`@tanstack/react-query`). `app/providers.tsx`da global `QueryClientProvider` + `Toaster` (sonner) bor — root layout'da ulangan, qayta yaratmang. Mutatsiyalarda muvaffaqiyat/xato uchun `toast.success`/`toast.error`, keyin tegishli `queryKey`ni `invalidateQueries` bilan yangilang.
- **Forma**: react-hook-form + zod (`@hookform/resolvers/zod`). Zod sxemasida `.default()` ishlatmang — RHF rezolveri bilan tip nomos keladi (standart qiymatlarni alohida konstantada bering, `lib/schemas/users-filter.ts`dagi kabi).
- **React Compiler yoqilgan** (`eslint-plugin-react-hooks`ning `react-hooks/set-state-in-effect` va `react-hooks/incompatible-library` qoidalari `pnpm lint`da xato beradi): `useEffect` ichida shartsiz/oshkora `setState` chaqirmang (buning o'rniga hodisa handler'da yoki tugma bosilganda chaqiring); `useForm().watch()`ni to'g'ridan-to'g'ri emas, `useWatch({ control, name })` orqali kuzating.
- **Namunaviy sahifa**: `app/(admin)/users/page.tsx` + `components/users/*` — filtr (qidiruv debounce bilan, rol, holat) URL query-parametrlarida saqlanadi, jadval (`Table`, skeleton/xato/bo'sh holatlar), sahifalash, va tasdiqlash dialogi orqali mutatsiya (`block-user-action.tsx`). Yangi ro'yxat sahifasi (masters, orders, ...) yozganda shu naqshni takrorlang.
