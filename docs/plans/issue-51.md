# Plan: Usta turi (MASTER / FUEL_STATION / PARTS_SHOP) va filtrlash
Source: https://github.com/DEW0277/ustatop-backend/issues/51 — "feat: master type (MASTER / FUEL_STATION / PARTS_SHOP) with filtering"
Base: main @ 4b5dd1b (branch `agent/issue-51`)

## Goal
Mavjud `MasterProfile`ga `type` maydoni qo'shiladi (`enum MasterType { MASTER FUEL_STATION PARTS_SHOP }`,
default `MASTER`, additiv migratsiya). Ommaviy `GET /masters` ixtiyoriy `type` query'ni qabul qiladi, berilmasa
**faqat `MASTER`** qaytaradi (eski mobil ilova versiyalari shoxobcha/do'konlarni ustalar orasida ko'rmaydi).
Bitta usta sahifasi, sevimlilar, buyurtma va sharhlar barcha turlar uchun o'zgarishsiz ishlaydi. Usta javoblariga
`type` qo'shiladi. Admin: `POST /admin/masters` ixtiyoriy `type` oladi, `GET /admin/masters` `type` bo'yicha
filtrlaydi, admin javoblarida `type` bor; admin panelda "Turi" filtri, ustuni va "Usta qo'shish" formasida "Turi"
select'i. Avval `docs/TZ.md` va `TASKS.md`, keyin kod.

## Dizayn qarorlari (coder shu bo'yicha yozadi — qayta muhokama qilinmaydi)

**D1. Schema.** `apps/backend/prisma/schema.prisma`:
```prisma
enum MasterType {
  MASTER
  FUEL_STATION
  PARTS_SHOP
}
// model MasterProfile ichida, isAvailable'dan keyin:
  type                 MasterType @default(MASTER)
// mavjud @@index([regionId, districtId, rating]) yoniga:
  @@index([type, rating])
```
Indeks sababi: ilovaning standart so'rovi (viloyat filtrisiz, `type = MASTER`, `ORDER BY rating DESC`) mavjud
`(regionId, districtId, rating)` indeksidan foydalana olmaydi. Boshqa model/maydon o'zgarmaydi.

**D2. Migratsiya Prisma'ning o'zi bilan generatsiya qilinadi (qo'lda yozilmaydi).** `prisma migrate dev`
agent (non-interactive) muhitida ishlamaydi, shuning uchun manba — `prisma migrate diff`, dalil esa — production
ishlatadigan `prisma migrate deploy` (`migrate` servisi). Vaqtinchalik Postgres schema `issue51_gen` ishlatiladi
(dev va `test` schema'lariga tegilmaydi). Aniq buyruqlar — T2. Kutilgan `migration.sql` mazmuni (faqat shular):
`CREATE TYPE "MasterType" AS ENUM ('MASTER', 'FUEL_STATION', 'PARTS_SHOP');`,
`ALTER TABLE "master_profiles" ADD COLUMN "type" "MasterType" NOT NULL DEFAULT 'MASTER';`,
`CREATE INDEX "master_profiles_type_rating_idx" ON "master_profiles"("type", "rating");`.
`DROP`, `ALTER COLUMN`, `RENAME` yoki schema nomi (`issue51_gen`) bo'lmasligi kerak. Papka nomi:
`apps/backend/prisma/migrations/<UTC YYYYMMDDHHMMSS>_master_type/migration.sql`.

**D3. Validatsiya.** Ikkala DTO'da `MasterType` `@prisma/client`dan import qilinadi: `@IsOptional() @IsEnum(MasterType)`
+ `@ApiPropertyOptional({ enum: MasterType })`. Noto'g'ri qiymat → `400` (global `ValidationPipe`, mavjud format).
Ustaning o'zi turini o'zgartira olmaydi: `UpsertMasterProfileDto`ga `type` **qo'shilmaydi** (`forbidNonWhitelisted`
tufayli `PUT /masters/me/profile`da `type` yuborilsa `400`). Admin tomonidan mavjud profil turini tahrirlash
endpointi bu issue'da yo'q (Out of scope).

**D4. Javob shakllari.** `toMasterResponse` (`master.mapper.ts`) `type: master.type` qaytaradi (`isAvailable`dan
keyin) — shu tufayli `GET /masters`, `GET /masters/:id`, sevimlilar, `GET/PUT /masters/me/profile` hammasida `type`
bor. Admin: `pendingMasterSelect`ga `type: true`, `toAdminMaster` `type` qaytaradi — pending, list, detail va create
javoblarining hammasida `type` bor.

**D5. Endpoint qarorlari** (kod qidiruvi: `masterProfile.findMany/count` faqat `masters.service.ts` va
`admin.service.ts`da; `toMasterResponse` — masters, master-profile, favorites. Top/tavsiya/home moduli **yo'q**;
`categories` ustalarni sanamaydi va qaytarmaydi).

| Endpoint | Qaror |
|---|---|
| `GET /masters` | `type` ixtiyoriy; berilmasa `where.type = MASTER`; berilsa — faqat shu tur. `type` boshqa filtrlar (region, district, category, query) bilan AND. |
| `GET /masters/:id` | Barcha turlar (filtrsiz); javobda `type`. |
| Sevimlilar ro'yxati (`favorites.service.ts`) | Barcha turlar — foydalanuvchi o'zi tanlagan; javobda `type`. Toggle o'zgarmaydi. |
| `GET/PUT /masters/me/profile`, services, portfolio, availability | O'zgarmaydi, barcha turlar; javobda `type`; `type`ni usta o'zgartira olmaydi (D3). |
| `GET /masters/:id/reviews`, `POST` sharh | O'zgarmaydi, barcha turlar. |
| `/orders/*` | O'zgarmaydi, barcha turlar. |
| `GET /categories`, regions, districts | O'zgarmaydi (usta ro'yxati yo'q). |
| `GET /admin/masters` | `type` ixtiyoriy; berilmasa **barcha turlar** (admin hammasini ko'radi); javobda `type`. |
| `GET /admin/masters/pending`, `GET /admin/masters/:id` | Filtr qo'shilmaydi; javobda `type`. |
| `POST /admin/masters` | `type` ixtiyoriy, default `MASTER`; saqlanadi va javobda qaytadi. |
| `GET /admin/stats/dashboard` | O'zgarmaydi (usta sonlari barcha turlarni sanaydi). |

**D6. Admin web.** Yagona manba `apps/web/lib/master-type.ts`:
`MASTER_TYPES = ['MASTER', 'FUEL_STATION', 'PARTS_SHOP'] as const`, `type MasterType`,
`MASTER_TYPE_LABELS = { MASTER: 'Usta', FUEL_STATION: "Yoqilg'i shoxobchasi", PARTS_SHOP: "Zapchast do'koni" }`.
Filtr: `type: 'ALL' | MasterType`, default `'ALL'` (URL param `type`, `'ALL'` → API'ga yuborilmaydi). Forma:
`type: z.enum(MASTER_TYPES)`, default `'MASTER'`, `masterFormToApiBody` `type`ni doim yuboradi. Ustun sarlavhasi
"Turi", qiymat — label. Web kodi Next-ga xos API ishlatmaydi (faqat mavjud `Select`/`Table` komponentlari), lekin
`apps/web/AGENTS.md` qoidasi amal qiladi: yangi Next API kerak bo'lsa avval `node_modules/next/dist/docs/` o'qiladi.

## Acceptance criteria
- [ ] AC-1: `docs/TZ.md` §4.0/§4.1 va yangi §4.4 "Usta turi" kichik bo'limida enum, maydon, default, indeks, D5
  jadvalidagi har bir qaror va `type` query/body qoidalari yozilgan; `TASKS.md`da B-09, C-07, C-08, D-14 bor va
  "Umumiy holat" jadvali ularga mos (T1).
- [ ] AC-2: `schema.prisma` D1 bilan bir xil; yangi migratsiya papkasi bitta `migration.sql` bilan, mazmuni D2
  ro'yxatiga teng (`DROP`/`ALTER COLUMN`/`RENAME`/`issue51` yo'q).
- [ ] AC-3: Toza schema'da `prisma migrate deploy` barcha migratsiyalarni xatosiz qo'llaydi va keyin
  `prisma migrate diff --from-url <o'sha schema> --to-schema-datamodel prisma/schema.prisma --exit-code` exit `0`
  qaytaradi (schema va migratsiyalar orasida farq yo'q).
- [ ] AC-4: `GET /api/v1/masters` (`type`siz) faqat `type: "MASTER"` elementlarni qaytaradi — e2e'da shu tumanda
  yaratilgan FUEL_STATION va PARTS_SHOP id'lari javobda yo'q.
- [ ] AC-5: `GET /api/v1/masters?type=FUEL_STATION` faqat shoxobchalarni qaytaradi (e2e: shu tumandagi MASTER va
  PARTS_SHOP yo'q, FUEL_STATION bor); `type=PARTS_SHOP` ham xuddi shunday (unit).
- [ ] AC-6: `GET /api/v1/masters?type=SHOP` va `GET /api/v1/admin/masters?type=bogus` → `400`, `success: false`.
- [ ] AC-7: `GET /api/v1/masters/:id` FUEL_STATION uchun `200` va `data.type === "FUEL_STATION"`; sevimlilar
  ro'yxatida shoxobcha `type` bilan ko'rinadi; `GET /masters` elementlarida `type` kaliti bor.
- [ ] AC-8: `POST /api/v1/admin/masters` `type: "PARTS_SHOP"` bilan → `201`, `data.type === "PARTS_SHOP"` va bazada
  `master_profiles.type = PARTS_SHOP`; `type`siz → `MASTER`; `type: "X"` → `400`.
- [ ] AC-9: `GET /api/v1/admin/masters?type=FUEL_STATION` faqat shoxobchalarni, `type`siz — barcha turlarni
  qaytaradi; `total` filtrga mos; pending/detail javoblarida `type` bor.
- [ ] AC-10: `PUT /api/v1/masters/me/profile` body'da `type` → `400` (usta turini o'zgartira olmaydi).
- [ ] AC-11: Admin panel: "Barcha ustalar" jadvalida "Turi" ustuni label bilan; filtrda "Turi" select'i (Barchasi /
  Usta / Yoqilg'i shoxobchasi / Zapchast do'koni) URL'da `type` sifatida saqlanadi va API'ga `type` bo'lib
  ketadi (`ALL` yuborilmaydi); "Usta qo'shish" dialogida "Turi" select'i default "Usta".
- [ ] AC-12: Web zod va backend DTO sinxron: `masterFormSchema` faqat `MASTER|FUEL_STATION|PARTS_SHOP` qabul qiladi,
  `masterFormToApiBody` `type`ni yuboradi; `mastersFiltersFromSearchParams` noto'g'ri `type`da standartga qaytadi
  (web unit testlar).
- [ ] AC-13: `bash scripts/agent/test.sh` exit 0; `pnpm --filter web lint && pnpm --filter web test` exit 0;
  backend e2e (Verification commands bo'yicha) exit 0.
- [ ] AC-14: PR ichida `TASKS.md` B-09 va C-07 `[x]` + `— ✅ Bajarildi (YYYY-MM-DD, PR #N)`, jadval yangilangan;
  PR tavsifida "⚠️ Mobile app contract impact" bo'limi (`type` maydoni; `GET /masters` standart filtri).

## Tasks

### T1 — TZ.md va TASKS.md (kontrakt birinchi)
- route: sonnet
- why route: schema va API kontraktini belgilaydi — keyingi backend vazifalari aynan shunga tayanadi; noaniqlik mobil kontraktni buzadi.
- files: `docs/TZ.md`, `TASKS.md`
- tests first: yo'q (hujjat). Tekshiruv: `grep -n "MasterType\|FUEL_STATION" docs/TZ.md` §4.0, §4.1, §4.4 da natija beradi.
- details:
  - TZ §4: yangi `### 4.4. Usta turi (2026-11-06, issue #51)` — D1 (enum, maydon, default, indeks, additiv migratsiya
    `<ts>_master_type`), D3 (usta o'zgartira olmaydi), D5 jadvali. §4.0 "Master javobi" ro'yxatiga `type`
    (`MASTER|FUEL_STATION|PARTS_SHOP`); §4.0 qator 142 ("`GET /masters` bloklangan ustalarni ko'rsatmaydi") ga
    `type` qoidasi (berilmasa faqat MASTER, noto'g'ri → 400). §4.1: qator 188 pending item'ga `type`; 189
    `GET /admin/masters?isVerified&regionId&type&query&page&limit` (berilmasa barcha turlar); 190 body'ga `type?`
    (default `MASTER`). §4 dagi modellar ro'yxatiga "`MasterProfile.type` — §4.4" havolasi.
  - TASKS.md (hammasi `- [ ]`, mavjud uslubda, "Tayyor mezoni" bilan):
    - B bo'limi, B-08 dan keyin: `**B-09 · Usta turi (MASTER / FUEL_STATION / PARTS_SHOP)** — Claude ⚠️` — issue #51,
      TZ §4.4; Tayyor mezoni: migratsiya + TZ mos, `GET /masters` standart faqat MASTER, admin create/filter, unit + e2e.
    - C bo'limi, C-06 dan keyin: `**C-07 · Admin panelda usta turi** — Gemini` — "Turi" filtri, ustuni, forma select'i;
      Tayyor mezoni: AC-11/AC-12, web lint + test yashil. Bog'liqlik: B-09.
    - `**C-08 · Taplink katalogini import qilish (~369 yozuv)** — 👤` — deploy'dan keyin Chrome orqali admin panelda
      (yoki `POST /admin/masters`) shoxobcha/do'konlarni kiritish; Bog'liqlik: B-09, C-07, production deploy;
      Tayyor mezoni: yozuvlar productionda to'g'ri `type` bilan, takroriy telefonlar yo'q.
    - D bo'limi, D-13 dan keyin: `**D-14 · Mobil ilovada shoxobcha va zapchast do'konlari bo'limlari** — Claude ⚠️`
      (alohida repo) — `GET /masters?type=FUEL_STATION|PARTS_SHOP`, `Master` tipiga `type`; Bog'liqlik: B-09.
    - "Umumiy holat": B `4 | 9`, C `4 | 8`, D `12 | 14`, Jami `29 | 54` (A, E, F o'zgarmaydi).
- done when: AC-1

### T2 — Prisma schema va migratsiya
- route: sonnet
- why route: data migratsiyasi production DB'ga tegadi; generatsiya va dalil aynan production entry point (`migrate deploy`) orqali bo'lishi kerak.
- files: `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations/<ts>_master_type/migration.sql` (yangi)
- tests first: avval (schema o'zgarishidan oldin) migratsiya yo'qligini ko'rsatish shart emas; dalil — AC-3 buyruqlari
  (pastda) va `prisma generate` keyin `pnpm --filter backend typecheck` o'tadi.
- steps (repo ildizidan; `.env*` fayllar o'qilmaydi — URL `docker-compose.yml`/`test/e2e-db.ts`dagi dev qiymatlardan):
  ```bash
  cd apps/backend
  export GEN_URL='postgresql://ustatop:ustatop_dev_pass@localhost:5455/ustatop_db?schema=issue51_gen'
  # 1) schema.prisma ni D1 bo'yicha tahrirlash
  # 2) eski migratsiyalarni toza schema'ga qo'llash (production entry point)
  DATABASE_URL="$GEN_URL" pnpm exec prisma migrate deploy
  # 3) farqni Prisma o'zi SQL qilib chiqaradi
  TS=$(date -u +%Y%m%d%H%M%S); mkdir -p "prisma/migrations/${TS}_master_type"
  DATABASE_URL="$GEN_URL" pnpm exec prisma migrate diff --from-url "$GEN_URL" \
    --to-schema-datamodel prisma/schema.prisma --script > "prisma/migrations/${TS}_master_type/migration.sql"
  # 4) dalil: yangi migratsiya deploy bo'ladi, keyin farq qolmaydi
  DATABASE_URL="$GEN_URL" pnpm exec prisma migrate deploy
  DATABASE_URL="$GEN_URL" pnpm exec prisma migrate diff --from-url "$GEN_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
  # 5) tozalash
  docker exec "$(docker ps -qf name=postgres -f publish=5455)" psql -U ustatop -d ustatop_db -c 'DROP SCHEMA IF EXISTS issue51_gen CASCADE'
  pnpm exec prisma generate
  ```
  Agar `migration.sql` D2 ro'yxatidan farq qilsa (masalan schema nomi bilan) — qo'lda tuzatmang, to'xtab sababini
  hisobotda yozing.
- done when: AC-2, AC-3

### T3 — Public `GET /masters` filtri va javobdagi `type`
- route: sonnet
- why route: trust boundary'dagi query validatsiyasi va eski ilova versiyalarini himoya qiladigan standart filtr (biznes qoidasi).
- files: `apps/backend/src/modules/masters/dto/list-masters-query.dto.ts`,
  `apps/backend/src/modules/masters/masters.service.ts`, `apps/backend/src/modules/masters/master.mapper.ts`,
  `apps/backend/src/modules/masters/masters.service.spec.ts`; fixture'larda `type` yetishmasa typecheck uchun:
  `master-profile.service.spec.ts`, `favorites/favorites.service.spec.ts`.
- tests first (`masters.service.spec.ts`, avval yiqilishi kerak):
  - `findAll({})` → `findMany` `where.type === 'MASTER'`;
  - `findAll({ type: 'FUEL_STATION' })` → `where.type === 'FUEL_STATION'`; `PARTS_SHOP` ham;
  - `type` boshqa filtrlar bilan birga (`regionId` + `type`) — ikkalasi ham `where`da;
  - `findOne` `where`da `type` yo'q (barcha turlar);
  - javob shaklida `type` (mavjud "mobil Master shakli" testiga `type` qo'shiladi);
  - DTO: `plainToInstance(ListMastersQueryDto, { type: 'SHOP' })` + `validate` → xato; `'FUEL_STATION'` → xatosiz.
- done when: AC-4, AC-5, AC-6 (public qismi), AC-7 (unit darajasi)

### T4 — Admin backend: create `type`, list filtri, javobdagi `type`
- route: sonnet
- why route: admin trust boundary'dagi body/query validatsiyasi va tranzaksiyadagi profil yaratish.
- files: `apps/backend/src/modules/admin/dto/create-master.dto.ts`,
  `apps/backend/src/modules/admin/dto/list-masters-query.dto.ts`, `apps/backend/src/modules/admin/admin.service.ts`
  (`pendingMasterSelect`, `toAdminMaster`, `listMasters`), `apps/backend/src/modules/masters/master-profile.service.ts`
  (`AdminCreateMasterInput` va `createByAdmin` `data.type = dto.type ?? MasterType.MASTER`),
  `apps/backend/src/modules/admin/admin.service.spec.ts`, `apps/backend/src/modules/masters/master-profile.service.spec.ts`
- tests first:
  - `admin.service.spec.ts` `listMasters`: `{ type: 'FUEL_STATION' }` → `where.type === 'FUEL_STATION'` (findMany
    va count ikkalasida); `type`siz → `where`da `type` kaliti yo'q; elementlarda `type`;
  - `master-profile.service.spec.ts` `createByAdmin`: `type: 'PARTS_SHOP'` → `masterProfile.create` data'sida
    `type: 'PARTS_SHOP'`; `type`siz → `'MASTER'`;
  - DTO: `CreateMasterDto` `type: 'X'` → validatsiya xatosi; admin `ListMastersQueryDto` `type: 'bogus'` → xato.
- done when: AC-8, AC-9, AC-6 (admin qismi)

### T5 — Backend e2e
- route: sonnet
- why route: T3/T4 xavfsizlik va kontrakt qoidalarini haqiqiy HTTP + DB orqali isbotlaydi; T3/T4 bilan bir route'da qoladi.
- files: `apps/backend/test/e2e-utils.ts` (`createMasterProfile`ga ixtiyoriy `type` parametri, default MASTER),
  `apps/backend/test/masters.e2e-spec.ts`, `apps/backend/test/admin.e2e-spec.ts`, `apps/backend/test/favorites.e2e-spec.ts`
- tests first (T3/T4 dan oldin yozilsa yiqiladi):
  - masters: bir tumanda MASTER, FUEL_STATION, PARTS_SHOP yaratiladi; natija **shu `districtId` bilan** tekshiriladi
    (e2e fayllar bitta `test` schema'ni baham ko'radi): `type`siz → faqat MASTER id; `type=FUEL_STATION` → faqat
    shoxobcha; `type=SHOP` → 400; `GET /masters/:id` shoxobcha → 200, `type`; `PUT /masters/me/profile` `{type}` → 400.
  - admin: `POST /admin/masters` `type: 'PARTS_SHOP'` → 201 + bazada `PARTS_SHOP`; `type`siz → MASTER; `type: 'X'`
    → 400; `GET /admin/masters?type=FUEL_STATION&query=<unikal ism>` faqat shoxobcha, `type=bogus` → 400.
  - favorites: shoxobchani sevimliga qo'shish → ro'yxatda `type: 'FUEL_STATION'` bilan.
  - Yangi telefon raqamlari mavjud fayl `TAG`lari bilan, tozalash `afterAll`da (mavjud uslub).
- done when: AC-4…AC-10 (e2e dalili)

### T6 — Web: tur konstantalari, zod sxemalar, tiplar (testlar bilan)
- route: gemini
- why route: konstanta, zod forma/filtr sxemasi va oddiy unit testlar — backend kontrakti T1'da tayyor.
- files: `apps/web/lib/master-type.ts` (yangi, D6), `apps/web/lib/types.ts` (`PendingMaster.type: MasterType`),
  `apps/web/lib/schemas/master-form.ts`, `apps/web/lib/schemas/master-form.test.ts`,
  `apps/web/lib/schemas/masters-filter.ts`, `apps/web/lib/schemas/masters-filter.test.ts`
- tests first:
  - `master-form.test.ts`: `DEFAULT_MASTER_FORM.type === 'MASTER'`; `type: 'X'` rad etiladi; `masterFormToApiBody`
    natijasida `type` bor (`'FUEL_STATION'` o'tadi);
  - `masters-filter.test.ts`: `?type=PARTS_SHOP` o'qiladi; `?type=bogus` → `DEFAULT_MASTERS_FILTERS`;
    `type: 'ALL'` → API query'da `type: undefined`; `type: 'FUEL_STATION'` → `type: 'FUEL_STATION'`. Mavjud `toEqual`
    testlari yangi `type` kalitiga moslab yangilanadi.
- done when: AC-12

### T7 — Web UI: filtr, ustun, forma select'i
- route: gemini
- why route: mavjud `Select`/`Table` naqshlarini takrorlaydigan oddiy UI.
- files: `apps/web/components/masters/master-filters.tsx` ("Turi" select, `hasActiveFilters`ga `type`, `onChange`ga
  `type`), `apps/web/components/masters/all-masters-view.tsx` (URL'ga `type` yozish — 48-qator yonida; "Turi" ustuni
  "Usta"dan keyin, `MASTER_TYPE_LABELS[master.type]`), `apps/web/components/masters/create-master-dialog.tsx`
  ("Turi" select, default "Usta")
- tests first: komponent testlari loyihada yo'q — T6 sxema testlari mantiqni qoplaydi; bu vazifa `pnpm --filter web
  lint`, `pnpm --filter web typecheck` va `pnpm --filter web test` yashil bo'lishi bilan tekshiriladi.
- done when: AC-11

### T8 — PR vaqtida TASKS.md belgilash va PR tavsifi (orchestrator)
- route: gemini
- why route: hujjatdagi belgi va matn.
- files: `TASKS.md`
- tests first: yo'q.
- details: PR ochilgandan keyin (raqam ma'lum bo'lganda) shu PR'ga commit: B-09 va C-07 `- [x]` +
  `— ✅ Bajarildi (YYYY-MM-DD, PR #N)`; jadval: B `5 | 9`, C `5 | 8`, Jami `31 | 54`. C-08 va D-14 `[ ]` qoladi.
  PR tavsifida "⚠️ Mobile app contract impact": master javobida yangi `type` maydoni; `GET /masters` endi standart
  holda faqat `MASTER` qaytaradi; yangi bo'limlar uchun `?type=` (D-14).
- done when: AC-14

## Out of scope
- Mobil ilovadagi yangi bo'limlar (alohida repo, `TASKS.md` D-14).
- Taplink katalogini import qilish (deploy'dan keyin, Chrome orqali, `TASKS.md` C-08).
- Mavjud profil turini admin tomonidan o'zgartirish (`PATCH`) endpointi va UI.
- Tur bo'yicha alohida kategoriyalar, admin dashboard statistikasini tur bo'yicha bo'lish, pending ro'yxatiga tur
  filtri, usta detail dialogida turni ko'rsatish.

## Risks / open questions
- Bloklamaydi: admin xato tur bilan yaratib qo'ysa, hozir tuzatish yo'li yo'q (faqat DB). C-08 importidan oldin
  kerak bo'lsa — alohida vazifa.
- Bloklamaydi: `GET /admin/stats/dashboard` usta sonlariga shoxobcha/do'konlarni ham qo'shadi (D5 qarori).
- Lokal docker: dev stack asosiy checkout'dan `texnozor` project nomi bilan ishlaydi. Worktree ichida oddiy
  `docker compose up` yangi project (`issue-51`) ochib portlar bilan to'qnashadi — avval tekshiring
  (`docker ps --format '{{.Names}} {{.Ports}}' | grep -E '5455|6379|3900|9000'`); ishlamayotgan bo'lsa
  `docker compose -p texnozor up -d --wait postgres redis storage-proxy`.
- Migratsiya `migrate diff` chiqishi D2'dan farq qilsa — to'xtash (T2).

### E2e qanday env oladi (`.env*` fayllar o'qilmaydi va nusxalanmaydi)
CI `cp apps/backend/.env.example apps/backend/.env` qiladi — agentlarga bu taqiqlangan. Worktree'da `apps/backend/.env`
yo'q, `ConfigModule.forRoot` fayl bo'lmasa process env bilan ishlaydi, `e2e-setup.ts` `DATABASE_URL`ni o'zi
`TEST_DATABASE_URL`ga (default `...ustatop_db?schema=test`, `test/e2e-db.ts`) o'rnatadi, globalSetup esa o'sha URL
bilan `prisma migrate deploy` qiladi. Kod talab qiladigan qolgan o'zgaruvchilar (`getOrThrow`: `REDIS_URL`,
`JWT_SECRET`; mock OTP: `SMS_MODE=mock`, `OTP_LENGTH=6`; storage: `S3_*`, `STORAGE_PUBLIC_URL`) buyruq qatorida
beriladi — qiymatlar faqat commit qilingan `docker-compose.yml` va `test/*.ts`dan, `JWT_SECRET` — istalgan
lokal-only qiymat (NODE_ENV production emas, production-guard ishlamaydi). Aniq buyruq — pastda.

## Verification commands
```bash
cd /Users/macstore.uz/Desktop/texnozor/.claude/worktrees/issue-51

# 0) Docker servislari (yuqoridagi Risks bandi bo'yicha tekshirib, kerak bo'lsa)
docker compose -p texnozor up -d --wait postgres redis storage-proxy

# 1) Prisma client va migratsiya dalili (AC-2, AC-3) — vaqtinchalik schema, keyin o'chiriladi
pnpm --filter backend exec prisma generate
ls apps/backend/prisma/migrations/*_master_type/migration.sql
grep -nE 'DROP|ALTER COLUMN|RENAME|issue51' apps/backend/prisma/migrations/*_master_type/migration.sql && echo "FAIL" || echo "OK: additive"
V='postgresql://ustatop:ustatop_dev_pass@localhost:5455/ustatop_db?schema=issue51_verify'
(cd apps/backend && DATABASE_URL="$V" pnpm exec prisma migrate deploy \
  && DATABASE_URL="$V" pnpm exec prisma migrate diff --from-url "$V" --to-schema-datamodel prisma/schema.prisma --exit-code)
docker exec "$(docker ps -qf name=postgres -f publish=5455)" psql -U ustatop -d ustatop_db -c 'DROP SCHEMA IF EXISTS issue51_verify CASCADE'

# 2) Root lint + typecheck + unit (AC-13)
bash scripts/agent/test.sh

# 3) Web (AC-11, AC-12, AC-13)
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test

# 4) Backend e2e (AC-4…AC-10) — env faqat buyruq qatorida, .env* o'qilmaydi
(cd apps/backend && env \
  REDIS_URL='redis://localhost:6379' \
  JWT_SECRET='e2e-local-only-secret-issue51-0123456789abcdef' \
  SMS_MODE=mock OTP_LENGTH=6 PUSH_PROVIDER=log \
  S3_ENDPOINT=localhost S3_PORT=3900 S3_USE_SSL=false \
  S3_ACCESS_KEY=GK000000000000000000000001 \
  S3_SECRET_KEY=0000000000000000000000000000000000000000000000000000000000000002 \
  S3_BUCKET=ustatop-uploads STORAGE_PUBLIC_URL='http://localhost:9000/ustatop-uploads' \
  E2E_REQUIRE_STORAGE=1 \
  pnpm test:e2e)

# 5) Hujjat (AC-1, AC-14)
grep -n "MasterType\|FUEL_STATION\|4.4" docs/TZ.md
grep -n "B-09\|C-07\|C-08\|D-14\|Jami" TASKS.md
```

READY: yes
