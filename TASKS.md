# TASKS.md — UstaTop: 100% tugatishgacha qolgan ishlar

> Loyihaning **yagona jonli vazifalar ro'yxati**. Arxitektura va qarorlar — [`docs/TZ.md`](docs/TZ.md), agent qoidalari — [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md).
> Holat sanasi: **2026-10-22** (`main` = `fb7fb20`; production: `https://7acts.uz`).

## Qanday ishlatiladi (barcha agentlar uchun majburiy)

1. Ishni boshlashdan oldin shu fayldan vazifani tanlang va uning **Bog'liqlik** bandini tekshiring.
2. Vazifa tugagach — **o'sha PR ichida** shu faylni yangilang:
   - `- [ ]` → `- [x]`
   - sarlavha oxiriga: `— ✅ Bajarildi (YYYY-MM-DD, PR #N)`
   - pastdagi "Umumiy holat" jadvalidagi sonni yangilang.
3. "Bajarildi" faqat **Tayyor mezoni** to'liq bajarilganda qo'yiladi (kod merge qilingan, CI yashil, mezon tekshirilgan). Qisman bajarilgan bo'lsa belgi qo'yilmaydi — o'rniga vazifa ostiga `> 🔄 Jarayonda: ...` izohi yoziladi.
4. Ish davomida yangi vazifa chiqsa — tegishli bo'limga yangi ID bilan qo'shing (mavjud ID'larni qayta raqamlamang).
5. Vazifani o'chirmang: bekor qilinsa `~~sarlavha~~ — ❌ Bekor qilindi (sana, sabab)`.

Belgilar: 👤 — foydalanuvchi qarori/harakati kerak · ⚠️ — mobil ilova kontraktiga ta'sir qiladi · 🔒 — CLAUDE.md bo'yicha avval tasdiq so'raladi.

## Umumiy holat

| Bo'lim | Bajarildi | Jami |
|---|---|---|
| A. Tezkor tuzatishlar va tartib | 3 | 4 |
| B. Backend | 4 | 8 |
| C. Admin panel | 4 | 6 |
| D. Mobil ilova integratsiyasi | 12 | 13 |
| E. Deploy va operatsiya | 6 | 13 |
| F. Reliz | 0 | 6 |
| **Jami** | **29** | **50** |

Allaqachon tugagan ishlar (backend modullari, admin panel sahifalari, xavfsizlik, CI, production Docker konfiguratsiyasi, FCM kodi) bu yerda takrorlanmaydi — ular `docs/TZ.md` §0 da.

**Kritik yo'l** (eng qisqa yo'l bilan ishga tushirish): A-01 → D-01…D-12 → E-01…E-03 (yopiq sinov) → B-01 (real SMS) → E-06 → F-03…F-06.

---

## A. Tezkor tuzatishlar va tartib

- [x] **A-01 · Root `package.json` bo'sh (0 bayt)** — Claude — ✅ Bajarildi (2026-10-12, `git checkout -- package.json`, PR'siz — fayl commit qilinmagan edi)
  - Ishchi papkada commit qilinmagan o'zgarish faylni bo'shatib qo'ygan; `pnpm install` / `pnpm dev` / `pnpm lint` ishlamaydi.
  - Tayyor mezoni: `git checkout -- package.json` (yoki ataylab qilingan bo'lsa to'g'ri tarkib), `pnpm lint && pnpm test` o'tadi.
- [x] **A-02 · `docs/TZ.md`ni haqiqiy holat bilan sinxronlash** — Claude — ✅ Bajarildi (2026-10-16, PR #32)
  - §0 da "🔄 Jarayonda" turibdi, §7.4 jadvalida 3, 4, 5-bandlar belgilanmagan — aslida hammasi merge qilingan (PR #29, #30, #24).
  - Tayyor mezoni: §0 va §7.4 yangilangan; §7.4 qolgan ishlar uchun shu faylga havola beradi (ikki joyda ikki xil ro'yxat bo'lmasin); §3 daraxtiga `TASKS.md` qo'shilgan.
- [x] **A-03 · Eskirgan branch'larni tozalash** — Claude 🔒👤 — ✅ Bajarildi (2026-10-16, foydalanuvchi tasdig'i bilan, PR'siz)
  - 13 ta merge qilingan branch (lokal + origin) va `../texnozor-gemini` worktree'si o'chirildi. `feat/ci-claude` qoldirildi — PR #26 merge qilinmagan (yopilgan, o'rniga #27).
  - 9 ta merge qilingan branch lokal va `origin`da qolgan (`feat/ci-claude`, `feat/fcm-claude`, `fix/web-polish-gemini`, ...); Gemini worktree'si (`../texnozor-gemini`) eski branch'da.
  - Tayyor mezoni: foydalanuvchi tasdig'idan keyin faqat `main` va faol branch'lar qoladi.
- [ ] **A-04 · `main` himoyasi bo'yicha qaror** — 👤
  - TZ §7.2 "`main` himoyalangan" deydi, lekin GitHub bepul tarifida private repo uchun branch protection ishlamaydi (API: "Upgrade to GitHub Pro"). Hozir himoya faqat kelishuvga asoslangan.
  - Tayyor mezoni: GitHub Pro olinib himoya yoqilgan (PR + yashil CI majburiy) **yoki** TZ'da "faqat kelishuv" deb yozib qo'yilgan.

## B. Backend (`apps/backend`)

- [ ] **B-01 · Real SMS — Eskiz.uz** — Claude 🔒👤
  - Hozir faqat `MockSmsProvider` (OTP doim `123456`); `auth.module.ts` mock'ga qat'iy bog'langan. Ommaviy ishga tushirishning asosiy blokeri.
  - Kerak: Eskiz hisobi, API login/parol, tasdiqlangan SMS shabloni (foydalanuvchidan).
  - Tayyor mezoni: `EskizSmsProvider` + `SMS_MODE` bo'yicha factory (boshqa kod o'zgarmaydi), token olish/yangilash, tasodifiy OTP generatsiyasi, yuborish xatosida tushunarli 5xx, unit testlar, `.env*.example` va TZ §5 yangilangan; haqiqiy raqamga SMS kelgani tekshirilgan.
- [ ] **B-02 · Haqiqiy push (FCM) ni yoqish** — Claude 👤
  - `FcmPushProvider` kodi tayyor, lekin hech qachon haqiqiy Firebase bilan sinalmagan.
  - Kerak: Firebase loyihasi va service account kalitlari (foydalanuvchidan).
  - Bog'liqlik: D-12.
  - Tayyor mezoni: `PUSH_PROVIDER=fcm` bilan haqiqiy qurilmaga buyurtma yaratilganda / status o'zgarganda / usta tasdiqlanganda bildirishnoma keladi; yaroqsiz token bazadan o'chishi tekshirilgan.
- [x] **B-03 · Akkauntni o'chirish endpointi** — Claude 🔒👤 ⚠️ — ✅ Bajarildi (2026-10-16, PR #36)
  - `DELETE /auth/me` — anonimlashtirish (TZ §4.3), `users.deletedAt` (additiv migratsiya), admin panelda "O'chirilgan" belgisi. Ilova tomoni — D-13.
  - App Store va Google Play akkaunt yaratadigan ilovalardan ilova ichida akkauntni o'chirish imkoniyatini talab qiladi. Hozir bunday endpoint yo'q.
  - Murakkablik: buyurtmasi bor foydalanuvchini FK tufayli o'chirib bo'lmaydi (TZ §4.0) → anonimlashtirish kerak. Avval TZ'ga yoziladi, schema o'zgarsa tasdiq so'raladi.
  - Tayyor mezoni: `DELETE /auth/me` (yoki TZ'da kelishilgan shakl), shaxsiy ma'lumot tozalanadi, token darhol yaroqsiz, buyurtma tarixi saqlanadi; unit + e2e test.
- [x] **B-04 · E2e qamrovini kengaytirish** — Claude — ✅ Bajarildi (2026-10-16, PR #33)
  - Qo'shildi: `masters` (filtrlar, bloklangan usta, xizmat/portfolio egaligi, band holati), `reviews` (403/400 qoidalari, reyting qayta hisoblash, yangilash), `favorites`, `upload` (haqiqiy MinIO, magic bytes, 413 — CI'da MinIO yo'qligi sababli hozircha faqat lokal, E-09). Topilgan xato tuzatildi: portfolio `url` protokolsiz oddiy so'zni ham qabul qilardi.
  - Hozir e2e faqat auth / admin / orders. Masters (upsert, xizmat egaligi, portfolio), reviews (403 qoidasi, reyting qayta hisoblash), favorites va upload e2e'siz.
  - Tayyor mezoni: `masters`, `reviews`, `favorites`, `upload` uchun e2e fayllar; CI `e2e` job'ida MinIO ham ko'tariladi; hammasi yashil.
- [x] **B-05 · MinIO'da yetim fayllar** — Gemini — ✅ Bajarildi (2026-10-16, Claude, PR #34)
  - `FileCleanupService.deleteIfUnreferenced` (o'z kalit formati + bazada boshqa havola yo'qligi tekshiriladi). Yo'l-yo'lakay: `avatarUrl` dev'da (`localhost`) 400 olardi — tuzatildi.
  - Portfolio rasmi o'chirilganda yoki avatar almashtirilganda obyekt MinIO'da qoladi (`StorageService`da o'chirish metodi yo'q).
  - Tayyor mezoni: `StorageService.deleteFile`, portfolio o'chirish va avatar almashtirishda chaqiriladi (faqat o'z bucket URL'i uchun, xato asosiy amalni buzmaydi); unit test.
- [ ] **B-06 · `packages/shared-types`ni to'ldirish** — Gemini (MVP'dan keyin, ixtiyoriy)
  - Hozir bo'sh; admin panel tiplari `apps/web/lib/types.ts`da qo'lda yozilgan.
  - Tayyor mezoni: admin javob tiplari bitta paketdan backend va web'ga import qilinadi.
- [x] **B-07 · Usta profilini faqat admin yaratadi** — Claude ⚠️ — ✅ Bajarildi (2026-10-13, PR #31)
  - `PUT /masters/me/profile` endi faqat mavjud profilni tahrirlaydi; profili yo'q foydalanuvchi 403 oladi (TZ §4.0). Ilova tomoni — D-10.
  - Tayyor mezoni: unit + e2e testlar, TZ yangilangan.
- [ ] **B-08 · Do'kon tekshiruvchisi uchun kirish (review akkaunt)** — Claude 🔒👤
  - Bog'liqlik: B-01. Real SMS yoqilgach Google Play / App Store tekshiruvchilari SMS kodni ololmaydi — "App access" bo'limiga ishlaydigan login kerak, aks holda ilova rad etiladi.
  - Taklif: production `.env`da `REVIEW_PHONE` + `REVIEW_OTP` — faqat shu raqamga SMS yuborilmaydi va kod qat'iy; raqam oddiy CLIENT (admin emas), kerak bo'lsa alohida usta akkaunti ham. Xavfsizlik: kod uzun va tasodifiy, faqat tekshiruv davrida yoqiladi, urinishlar limiti amal qiladi.
  - Tayyor mezoni: unit + e2e test, DEPLOY.md'da yoqish/o'chirish tartibi, `mobile-app/docs/PLAY_STORE.md` §5 yangilangan.

## C. Admin panel (`apps/web`)

- [ ] **C-01 · To'liq qo'lda QA (production build)** — Claude
  - Barcha 8 bo'lim (`NAV_ITEMS`) production build'da, haqiqiy seed ma'lumot bilan: login/logout, filtrlar, sahifalash, har bir mutatsiya, 401/403/409 holatlari, mobil kenglik.
  - Tayyor mezoni: topilgan har bir xato alohida vazifa/PR bo'lib tuzatilgan yoki shu faylga qo'shilgan.
- [x] **C-02 · Usta/foydalanuvchi batafsil ko'rinishi** — Gemini 👤 (ixtiyoriy) — ✅ Bajarildi (2026-10-16, Claude, PR #40)
  - `GET /admin/masters/:id` (TZ §4.1) + Ustalar sahifasida "Batafsil" oynasi: portfolio, xizmatlar va narxlar, ish vaqti, reyting, tasdiqlash tugmasi. Foydalanuvchi tafsiloti qilinmadi (jadvaldagi ma'lumot yetarli).
  - Hozir faqat jadvallar; ustaning xizmatlari, portfolio rasmlari va buyurtmalarini ko'rib tasdiqlash imkoni yo'q — moderator rasmlarni ko'rmasdan tasdiqlaydi.
  - Tayyor mezoni: TZ §4.1 ga endpoint qo'shilgan, usta kartasi (dialog yoki sahifa) portfolio va xizmatlar bilan.
- [ ] **C-03 · Maxfiylik siyosati va foydalanish shartlari sahifalari** — Gemini 👤
  > 🔄 Jarayonda (2026-10-16, PR #39): `/privacy` va `/terms` auth'siz ochiladi, platformaning haqiqiy ishlashiga mos **loyiha** matni bilan (`apps/web/lib/legal/*`). Qolgani 👤: matnni tekshirish, `[KVADRAT QAVS]` joylarni (tashkilot, SMS/hosting provayderi, aloqa, yosh chegarasi) to'ldirish, keyin `LEGAL_DRAFT = false`.
  - Do'konlar ommaviy URL talab qiladi (F-02). Matnni foydalanuvchi beradi.
  - 2026-10-17: `/delete-account` qo'shildi (Google Play Data safety "Delete account URL" talabi) — matn TZ §4.3 ga mos, `[EMAIL]` to'ldiriladi.
  - Tayyor mezoni: `/privacy` va `/terms` auth'siz ochiladi (`proxy.ts` ularni login'ga yo'naltirmaydi).
- [x] **C-04 · Admin panelda usta qo'shish** — Claude — ✅ Bajarildi (2026-10-12, PR #31)
  - `POST /admin/masters` (TZ §4.1): telefon bo'yicha akkaunt yaratadi yoki mavjud mijozga profil biriktiradi; Ustalar sahifasida "Usta qo'shish" dialogi.
  - Tayyor mezoni: endpoint + forma, unit va e2e testlar, lint/typecheck yashil, brauzerda jonli tekshirilgan.
- [x] **C-05 · Admin panelga login + parol bilan kirish** — Claude — ✅ Bajarildi (2026-10-13, PR #31)
  - `POST /auth/admin/login` (TZ §4.1), `users.login`/`passwordHash` (additiv migratsiya), scrypt, 5 xato urinishdan keyin 15 daqiqa blok; ADMIN uchun OTP kirishi yopildi; seed `ADMIN_LOGIN` + `ADMIN_PASSWORD`.
  - Tayyor mezoni: login sahifasi login/parol, unit + e2e testlar, brauzerda jonli tekshirilgan, hujjatlar va `.env*.example` yangilangan.
- [x] **C-06 · Admin parolini paneldan almashtirish va adminlarni boshqarish** — Claude 👤 (ixtiyoriy) — ✅ Bajarildi (2026-10-16, PR #41)
  - `PUT /admin/me/password` + "Sozlamalar" sahifasi (joriy parol tekshiriladi, xato urinishlar login bloki bilan umumiy). Qo'shimcha admin qo'shish/olib tashlash — hozircha DEPLOY.md §10 (SQL); panel UI kerak bo'lsa alohida vazifa.
  - Hozir parol faqat `ADMIN_PASSWORD` + `prisma db seed` orqali almashtiriladi va bitta admin bor.
  - Tayyor mezoni: TZ'ga endpoint qo'shilgan; "Parolni almashtirish" (eski parol tekshiriladi) va kerak bo'lsa yangi admin qo'shish.

## D. Mobil ilova integratsiyasi (`/Users/macstore.uz/Desktop/mobile-app`, alohida repo) 🔒

> 2026-10-12 holati (tarix uchun): ilova to'liq mock ma'lumotda edi. 2026-10-16 ga kelib barcha ekranlar backend API'ga ulangan, mock olib tashlangan — qolgan ishlar quyida ochiq turgan bandlar.
> Alohida repo: https://github.com/DEW0277/ustatop-mobile (2026-10-16 dan git'da). O'zgarishlar shu repoda PR orqali, CI yashil bo'lgach merge qilinadi; bu yerda faqat vazifa holati belgilanadi.

- [x] **D-01 · Ilovani git'ga olish** — 👤 + Claude — ✅ Bajarildi (2026-10-16, https://github.com/DEW0277/ustatop-mobile, private)
  - `.gitignore` (sirlar, imzolash fayllari, native build'lar), birinchi commit'dan oldin sir/kalit qidiruvi. CI: `tsc --noEmit` + Android/web `expo export` (ustatop-mobile #2).
  - `mobile-app/` hozir git repo emas — tarix ham, zaxira ham yo'q.
  - Tayyor mezoni: `git init`, `.gitignore`, GitHub'da private repo, birinchi commit.
- [x] **D-02 · API manzili va konfiguratsiya** — Claude — ✅ Bajarildi (2026-10-16, Claude)
  - `API_BASE_URL` kodda qotirilgan (`https://api.ustatop.uz/v1`), backend prefiksi esa `/api/v1`.
  - Tayyor mezoni: manzil `EXPO_PUBLIC_API_URL` / `eas.json` profillari orqali (dev: lokal backend, preview: staging, production: `https://<domen>/api/v1`).
  - Foydalanuvchi so'rovi bo'yicha bitta joy: `mobile-app/src/config.ts` → `SERVER_URL` (`https://<domen>`, `/api/v1` avtomatik qo'shiladi). Bo'sh bo'lsa dev'da Metro hosti `:3000` avtomatik olinadi.
- [x] **D-03 · Mock fallback'ni olib tashlash** — Claude — ✅ Bajarildi (2026-10-16, Claude)
  - Tayyor mezoni: `mockAdapter` faqat aniq dev bayrog'i bilan ishlaydi; production build'da tarmoq xatosi foydalanuvchiga xato holati sifatida ko'rsatiladi, soxta ma'lumot emas.
- [x] **D-04 · Haqiqiy autentifikatsiya** — Claude — ✅ Bajarildi (2026-10-16, ustatop-mobile #1; telefonda hali sinalmagan — F-03)
  - Qolgan qism bajarildi: token `expo-secure-store`da (Keychain/Keystore), eski AsyncStorage sessiyasi avtomatik ko'chiriladi.
  - 2026-10-16 holati: API orqali login, 6 katak, 401 → sessiya tozalanadi, xato xabarlari ko'rsatiladi, `updateProfile` faqat `name`/`avatarUrl` — **qolgan**: token hali AsyncStorage'da (`expo-secure-store` yo'q).
  - Tayyor mezoni: `send-otp`/`verify-otp` haqiqiy API orqali; OTP **6 katak** (TZ §4.0); token xavfsiz saqlanadi (`expo-secure-store`); 401 da sessiya tozalanib login'ga o'tadi; 429 (120 soniya / urinishlar limiti) va bloklangan foydalanuvchi xabarlari ko'rsatiladi; `updateProfile` faqat `name`/`avatarUrl` yuboradi.
- [x] **D-05 · Ma'lumotnomalar API'dan** — Gemini — ✅ Bajarildi (2026-10-16, Claude)
  - Tayyor mezoni: viloyat, tuman, kategoriyalar `GET /regions|districts|categories`dan (keshlash bilan); `RegionListScreen`, `DistrictListScreen`, `HomeScreen`da `@/mock` importi yo'q.
- [x] **D-06 · Ustalar ro'yxati, qidiruv va usta sahifasi** — Claude — ✅ Bajarildi (2026-10-16, ustatop-mobile #1; telefonda hali sinalmagan — F-03)
  - Qolgan qism bajarildi: `usePaginatedQuery` — ustalar ro'yxati va qidiruvda cheksiz scroll (20 tadan).
  - 2026-10-16 holati: barcha ekranlar API'dan, filtr/`sortBy` serverda, yuklanish/xato holatlari bor — **qolgan**: cheksiz scroll (hozir `limit=100`, 100 dan ortiq usta ko'rinmaydi).
  - Tayyor mezoni: `MasterListScreen`, `SearchScreen`, `HomeScreen` (tavsiya etilganlar), `MasterDetailScreen` `GET /masters` / `GET /masters/:id`dan; sahifalash (cheksiz scroll) — 20 tadan ortiq usta ko'rinadi; filtr va `sortBy` server tomonda; yuklanish/bo'sh/xato holatlari.
- [x] **D-07 · Sevimlilar** — Gemini — ✅ Bajarildi (2026-10-16, Claude)
  - Tayyor mezoni: `favoritesApi.ts` (`GET /favorites`, `/favorites/ids`, `POST`/`DELETE /favorites/:masterId`), store server bilan sinxron, login'siz holatda login'ga yo'naltiradi.
- [x] **D-08 · Buyurtmalar (mijoz va usta)** — Claude — ✅ Bajarildi (2026-10-16, Claude)
  - Tayyor mezoni: `BookingScreen` → `POST /orders`; `OrdersScreen` → `GET /orders/my`; `MasterIncomingOrdersScreen` → `GET /orders/my?as=master`; status o'zgartirish `PUT /orders/:id/status`; `useOrdersStore` lokal persist emas, server holati; 409/404/400 xabarlari ko'rsatiladi.
- [x] **D-09 · Sharhlar** — Gemini — ✅ Bajarildi (2026-10-16, Claude)
  - Tayyor mezoni: `GET`/`POST /masters/:id/reviews`; sharh formasi faqat tugallangan buyurtmadan keyin ochiladi yoki 403 xabari ko'rsatiladi (TZ §4.0); qayta yuborilgan sharh yangilanishi UI'da aks etadi.
- [x] **D-10 · Usta kabineti** — Claude — ✅ Bajarildi (2026-10-16, Claude)
  - "Usta bo'lish" formasi **olib tashlanadi** (B-07: profilni faqat admin yaratadi) — o'rniga "administratorga murojaat qiling" ma'lumoti; usta rejimi faqat profili bor foydalanuvchiga ko'rinadi.
  - Tayyor mezoni: `GET /masters/me/profile` (404 = usta emas) va `PUT` (faqat tahrirlash), xizmatlar CRUD, `PATCH /masters/me/availability`; `useMasterProfileStore` lokal mock emas.
- [x] **D-11 · Rasm yuklash** — Claude — ✅ Bajarildi (2026-10-16, ustatop-mobile #1; telefonda hali sinalmagan — F-03)
  - `expo-image-picker` (galereya/kamera, ruxsat matnlari o'zbekcha), 10 MB oldindan tekshiruv, multipart `POST /upload/single`; portfolio, usta avatari va mijoz avatari. Namuna (Unsplash) rasmlar olib tashlandi.
  - Portfolio hozir tayyor "preset" rasmlardan tanlaydi; `expo-image-picker` o'rnatilmagan.
  - Tayyor mezoni: galereya/kameradan tanlash → `POST /upload/single` → avatar (`PUT /auth/profile`) va portfolio (`POST`/`DELETE /masters/me/portfolio`); hajm/format xatolari ko'rsatiladi.
- [ ] **D-12 · Push bildirishnomalar** — Claude 👤
  - Bog'liqlik: B-02 (Firebase loyihasi).
  - Tayyor mezoni: ruxsat so'rash, FCM token olish, login'dan keyin `PUT /auth/fcm-token`, logout'da `DELETE`; bildirishnoma bosilganda tegishli buyurtma ochiladi.
- [x] **D-13 · Akkauntni o'chirish va huquqiy havolalar** — Gemini — ✅ Bajarildi (2026-10-16, Claude, ustatop-mobile #1, #4; telefonda hali sinalmagan — F-03)
  - Profil: "Akkauntni o'chirish" (ikki bosqichli tasdiq) va maxfiylik siyosati / shartlar havolalari (`LEGAL_URLS`, C-03 sahifalari).
  - Bog'liqlik: B-03, C-03.
  - Tayyor mezoni: Profil ekranida "Akkauntni o'chirish" (tasdiqlash bilan) va maxfiylik siyosati / shartlar havolalari.

## E. Deploy va operatsiya (Contabo VPS) 🔒

- [x] **E-01 · VPS va domen** — 👤 — ✅ Bajarildi (2026-10-22, PR #50)
  - Contabo VPS `169.58.205.184` (Ubuntu 24.04.5, 6 vCPU, 11 GB RAM, 193 GB), domen `7acts.uz` (+ `www`) `A` yozuvi shu IP'ga; Claude SSH kalit bilan kiradi. Server chet elda — E-10 bo'yicha xavfni foydalanuvchi qabul qilgan (2026-10-20).
  - Tayyor mezoni: Ubuntu 22.04/24.04 VPS (kamida 2 vCPU / 4 GB), domen `A` yozuvi, Claude uchun SSH kirish yoki foydalanuvchi buyruqlarni o'zi bajaradi.
- [ ] **E-02 · Birinchi deploy (yopiq sinov)** — Claude + 👤
  - Bog'liqlik: E-01. `docs/DEPLOY.md` §1–3 bo'yicha, `ALLOW_MOCK_SMS_IN_PRODUCTION=true` bilan — **manzil ommaga e'lon qilinmaydi** (mock OTP bilan istalgan mijoz/usta raqami nomidan kirish mumkin; admin panel alohida — login + parol).
  - 2026-10-22 (E-12): production'da mock OTP faqat `.env.production`dagi `MOCK_SMS_ALLOWED_PHONES` (vergul bilan ajratilgan `+998…` raqamlar) ro'yxatiga beriladi, ro'yxat bo'sh bo'lsa backend ishga tushmaydi — sinovchilar raqamlarini shu yerga yozing (`docs/DEPLOY.md` §0, §2); `SMS_MODE` faqat `mock`.
  - Tayyor mezoni: `dc ps` hammasi healthy, `https://<domen>/api/v1/regions` va `/login` ishlaydi, seed qo'llangan, admin panelga kirilgan.
  > 🔄 2026-10-22: `https://7acts.uz` ishlayapti (`main` = `fb7fb20`) — host hardening (SSH faqat kalit, ufw 22/80/443, fail2ban, unattended-upgrades, 4 GB swap), Docker 29.9 + Compose v5.6, `dc ps` hammasi healthy, migratsiyalar qo'llangan, seed (14 viloyat, 207 tuman, 8 kategoriya, admin `texnozor_admin0277`), Let's Encrypt (`7acts.uz`, `www`), `/api/v1/regions` va `/login` 200, Swagger 404, ruxsat ro'yxatidan tashqari raqam 403. `MOCK_SMS_ALLOWED_PHONES` hozircha faqat admin telefoni — sinovchilar qo'shilishi kerak. Qolgan 👤: admin panelga birinchi kirish va parolni almashtirish. Mobil ilova `SERVER_URL = 'https://7acts.uz'` (ustatop-mobile PR #26).
- [ ] **E-03 · Backup va sertifikat cron'lari** — Claude
  - Tayyor mezoni: kunlik `pg_dump` + Garage arxivi cron'da, **boshqa joyga** nusxa (rclone / obyekt saqlash), haftalik nginx reload; backup'dan tiklash bir marta amalda sinab ko'rilgan.
  > 🔄 Jarayonda: `deploy/backup/` (`backup.sh`, `restore.sh`, lokal sinov `test-local.sh`) va CI shellcheck — PR #47. 2026-10-22 VPS'da: root crontab'da kunlik backup (03:00, `PATH` bilan, 14 kun) va haftalik nginx reload; birinchi tungi backup o'tdi; tiklash sinovi production'da bajarildi (yangi backup → `restore.sh --yes latest` → foydalanuvchi/viloyat/tuman/kategoriya soni bir xil, sayt ~1 daqiqada qaytdi); `certbot renew --dry-run` muvaffaqiyatli. Qolgan 👤: tashqi saqlash joyini tanlash va `BACKUP_RCLONE_REMOTE` (hozir backup faqat VPS diskida).
- [ ] **E-04 · CD — avtomatik deploy** — Claude 👤
  - TZ §6: "`main`ga merge → SSH orqali deploy" hali rejada. Image'lar hozir VPS'ning o'zida yig'iladi.
  - Tayyor mezoni: GitHub Actions workflow (qo'lda tasdiq / `workflow_dispatch` bilan), SSH kaliti repo secret'ida, sha bo'yicha `IMAGE_TAG` (rollback uchun), DEPLOY.md yangilangan.
- [ ] **E-05 · Monitoring va xato kuzatuvi** — Claude 🔒👤
  - Hozir faqat `docker logs`. Yangi tashqi xizmat (masalan Sentry, UptimeRobot) — tasdiq kerak.
  - Tayyor mezoni: tashqi uptime tekshiruvi (API + panel) ogohlantirish bilan; backend va web'da 5xx xatolar kuzatuvi; disk to'lishi ogohlantirishi.
- [ ] **E-06 · Production'ni haqiqiy rejimga o'tkazish** — Claude + 👤
  - Bog'liqlik: B-01, B-02.
  - Tayyor mezoni: `SMS_MODE=eskiz`, `ALLOW_MOCK_SMS_IN_PRODUCTION=false`, `PUSH_PROVIDER=fcm`, `SWAGGER_ENABLED=false`; sinov davridagi soxta foydalanuvchi/buyurtmalar tozalangan; `123456` bilan kirib bo'lmasligi tekshirilgan.
- [x] **E-07 · Yuklama va xavfsizlik tekshiruvi (production'da)** — Claude — ✅ Bajarildi (2026-10-22, PR #50)
  - Tayyor mezoni: rate limit Nginx ortida haqiqiy IP bo'yicha ishlashi tekshirilgan (`TRUST_PROXY`), TLS/sarlavhalar tekshiruvi, `pnpm audit` 0, Postgres/Redis/Garage portlari tashqaridan yopiq, `/uploads` faqat o'qish.
  - Natija (`https://7acts.uz`): bitta IP'dan 6-chi admin login → 429, shu paytda boshqa IP (VPS'ning o'zi) → 401 (limit haqiqiy IP bo'yicha); TLS Let's Encrypt, HSTS, X-Frame-Options DENY, CSP frame-ancestors, nosniff, Referrer-Policy; `pnpm audit` 0 (CI, PR #49); 5432/6379/3900/3000/3001 tashqaridan yopiq; `/uploads` PUT/POST/DELETE → 403. Yuklama (load) testi bu mezonga kirmagan — kerak bo'lsa F-03 dan oldin alohida.
- [x] **E-08 · Operatsion qo'llanma** — Claude — ✅ Bajarildi (2026-10-16, PR #35)
  - `docs/DEPLOY.md` §9 hodisalar jadvali, §10 adminlarni boshqarish (qo'shimcha admin, parol, olib tashlash — SQL dev bazada sinab ko'rilgan), §11 sirlarni almashtirish. Haqiqiy VPS'da hali sinalmagan.
  - Tayyor mezoni: `docs/DEPLOY.md`ga qo'shilgan: hodisa yuz berganda nima qilish (xizmat tushdi, disk to'ldi, DB tiklash), admin qo'shish/olib tashlash, sirlarni almashtirish (JWT secret, MinIO, Eskiz).
- [x] **E-09 · MinIO image'i registry'larda yo'q — S3 serverini almashtirish** — Claude 🔒👤 — ✅ Bajarildi (2026-10-16, PR #37; foydalanuvchi tanlovi: Garage)
  - Garage v2.4.1 (dev, prod, CI), `deploy/garage/init.sh` (idempotent sozlash), dev `storage-proxy` (public URL formati o'zgarmadi), env `S3_*` (`MINIO_*` fallback bilan). Haqiqiy VPS'da hali sinalmagan (E-02).
  - 2026-10-16 da aniqlandi: `quay.io/minio/minio` va `minio/minio` (Docker Hub) image'larini endi yuklab bo'lmaydi ("denied" / "no such manifest"). Lokal mashinada faqat keshdagi `RELEASE.2025-09-07` bor. Natija: CI'da MinIO ko'tarib bo'lmaydi (upload e2e o'tkazib yuboriladi) va `docker-compose.prod.yml` yangi VPS'da ishga tushmaydi.
  - Kod `@aws-sdk/client-s3` ishlatadi — S3-mos istalgan server mos keladi, faqat compose va `.env` o'zgaradi. Variantlar: boshqa S3-mos server (masalan Garage, SeaweedFS), MinIO'ni manbadan o'zimiz yig'ish, yoki tashqi obyekt saqlash xizmati — tanlov foydalanuvchida (yangi tashqi xizmat).
  - Tayyor mezoni: tanlangan server dev compose, prod compose va CI e2e'da ishlaydi; `upload.e2e-spec.ts` CI'da haqiqatan bajariladi; `/uploads` Nginx orqali o'qiladi; DEPLOY.md yangilangan.
- [ ] **E-10 · Shaxsiy ma'lumotlarni O'zbekistonda saqlash talabi** — 👤 (yuridik, E-01/E-02 dan oldin)
  - "Shaxsga doir ma'lumotlar to'g'risida"gi qonun O'zbekiston fuqarolarining shaxsiy ma'lumotlarini O'zbekiston hududidagi serverlarda saqlashni talab qiladi (Claude'ning bilimi bo'yicha — yurist tasdiqlashi kerak). Rejadagi Contabo VPS chet elda.
  - Tayyor mezoni: yurist xulosasi; kerak bo'lsa server O'zbekistondagi hosting'ga (yoki ma'lumotlar bazasi/fayllar mahalliy serverga) ko'chirilgan; maxfiylik siyosatining 5-bandi shunga mos.
- [x] **E-11 · Bog'liqliklardagi zaifliklar (audit regressiyasi)** — Claude — ✅ Bajarildi (2026-10-19, PR #46)
  - 2026-10-19 da aniqlandi: `pnpm audit --prod` 22 ta zaiflik (2 critical, 10 high) — E-07 talab qiladigan 0 dan orqaga ketgan, CI audit ishlatmagani uchun sezilmagan. Eng og'irlari: `next` 16.3.5 (Image Optimization SSRF, self-hosted kesh zaharlash; `next/og` RCE — ilovada `next/og` ishlatilmaydi), `proxy-addr` (Express `trust proxy` ortida IP spoofing).
  - Qilindi: `next`/`eslint-config-next` 16.3.8; `shadcn` web'da devDependency'ga o'tkazildi (faqat CLI va build vaqtidagi CSS); ichki versiyalar `pnpm-workspace.yaml` `overrides` bilan (har biri izohli); tuzatilgan versiyasi chiqmagan bitta dev-only advisory (`braces`, GHSA-vfj7-8cjw-p6xm) `auditConfig.ignoreGhsas`da sababi bilan; CI'ga `pnpm audit` qadami qo'shildi.
  - Tayyor mezoni: `pnpm audit` va `pnpm audit --prod` 0 (ignore'siz sinovda 1 bilan yiqiladi), CI'da audit qadami yashil, lint/typecheck/test/build/e2e/Docker build o'tadi.
- [x] **E-12 · Deploy oldidan audit tuzatishlari** — Claude — ✅ Bajarildi (2026-10-22, PR #49)
  - 1. Admin panel → backend so'rovlarida haqiqiy mijoz IP'si (`X-Forwarded-For`, nginx `X-Real-IP` dan) — rate limit va admin-login bloki mijozlar bo'yicha alohida.
  - 2. Production'da mock OTP faqat `MOCK_SMS_ALLOWED_PHONES` ro'yxatidagi raqamlarga (boshqasiga 403); `SMS_MODE≠mock` production'da rad etiladi.
  - 3. Seed viloyat/tuman/kategoriyalarni faqat bo'sh bazada yaratadi (admin tahrirlari qayta yozilmaydi, dublikat yo'q).
  - 4. Avatar va portfolio URL'i faqat o'z omborimizniki (`POST /upload/single` natijasi), portfolio ≤ 20 ta.
  - 5. Admin JWT 12 soat; `GET /auth/me` / `PUT /auth/profile` ADMIN uchun yangi token bermaydi (sessiya yangilanmaydi); panel cookie 12 soat.
  - 6. Panel xavfsizlik sarlavhalari (`X-Frame-Options`, `frame-ancestors` CSP, `nosniff`, `Referrer-Policy`) va nginx `/uploads` `nosniff`.
  - 7. `safeNextPath` boshqaruv belgilari/backslash orqali open redirect'ga qarshi.
  - 8. `docs/DEPLOY.md`: deploy key, host hardening (SSH, ufw, fail2ban, swap), `<EMAIL>`/DOMAIN snippet, certbot dry-run; konteyner xotira limitlari.
  - ⚠️ Mobil: avatar/portfolio faqat yuklangan URL (ilova allaqachon shunday), yopiq sinovda ro'yxatda yo'q raqamga 403.
- [ ] **E-13 · Audit'dan qoldirilgan ishlar** — Claude
  - Bog'liqlik: E-02 dan keyin, F-06 dan oldin.
  - Qoldirilgan bandlar:
    - Token revocation (`tokenVersion`, schema o'zgarishi).
    - OTP uchun telefon bo'yicha kunlik limit; `POST /orders` throttle.
    - Yangi Prisma indekslar; `page` uchun `@Max`; admin DTO'larda `MaxLength`/slug formati.
    - Health check'da DB/Redis tekshiruvi.
    - Push logida va Prisma xato logida shaxsiy ma'lumot (PII).
    - Dockerfile: corepack versiyasini pin qilish, kod fayllari root egaligida.
    - `env_file` minimal huquq (har servisga faqat kerakli o'zgaruvchilar).
    - nginx: `default_server`, gzip, `limit_req`, certbot image pin.
    - `error.tsx` / `not-found.tsx`; admin layout redirect'ida `?next=`; `public/` dagi qolgan SVG'lar.
    - Admin-login bloki login nomi bo'yicha (5 xato → 15 daqiqa): login nomini bilgan begona odam adminni 15 daqiqaga bloklashi mumkin.
    - Nonce asosidagi CSP (`script-src`/`default-src`) panel uchun.
    - Backend Dockerfile build'ida `ERR_PNPM_IGNORED_BUILDS` (verifyDepsBeforeRun install'i) — build to'xtamaydi, Prisma client generatsiya qilinadi, lekin logni chalkashtiradi (2026-10-22 VPS build).
  - Tayyor mezoni: har bir band alohida baholanib bajarilgan yoki sababi bilan bekor qilingan.

## F. Reliz

- [ ] **F-01 · Dasturchi akkauntlari** — 👤
  - Tayyor mezoni: Google Play Console va (iOS kerak bo'lsa) Apple Developer akkauntlari, Expo/EAS akkaunti.
- [ ] **F-02 · Do'kon materiallari** — 👤 + Gemini
  - 2026-10-17 (Claude, ustatop-mobile `chore/play-store-release`): ilova ikonkasi/adaptive/splash, Play Console'ga kiritiladigan hamma narsa `mobile-app/store/google-play/` da (uz/ru listing, ikonka 512, feature graphic, reliz izohlari, App content / Data safety / Content rating javoblari), jarayon — `mobile-app/docs/PLAY_STORE.md`. **Qolgan 👤**: skrinshotlar, kontakt email, matnlarni tasdiqlash.
  - Tayyor mezoni: ilova ikonkasi, skrinshotlar, tavsif (uz/ru), maxfiylik siyosati URL (C-03), ma'lumotlar xavfsizligi anketasi (telefon raqami, rasmlar, push token).
- [ ] **F-03 · Staging'da to'liq oqim sinovi** — Claude + 👤
  - Bog'liqlik: D-02…D-12, E-02.
  - Tayyor mezoni: haqiqiy qurilmada (Android, kerak bo'lsa iOS) ssenariy: admin ustani qo'shadi → usta o'z raqami bilan kiradi, xizmat/portfolio qo'shadi → mijoz ro'yxatdan o'tadi va buyurtma beradi → usta qabul qiladi/yakunlaydi → mijoz sharh qoldiradi → admin sharhni o'chiradi; har qadamda push keladi.
- [ ] **F-04 · Production build** — Claude
  - 2026-10-17: build konfiguratsiyasi tayyor (`eas.json` remote versionCode + `eas submit` → internal/draft, `SERVER_URL` tekshiruvi `eas-build-pre-install`da, ruxsatlar tozalangan). Qolgani: E-02 dan keyin `SERVER_URL`, `eas init` (👤), build va yuklash.
  - Tayyor mezoni: EAS `production` profili (AAB / IPA) production API manziliga qaragan, versiya va `uz.ustatop.app` identifikatori to'g'ri, ichki sinov trekiga yuklangan.
- [ ] **F-05 · Yopiq beta** — 👤
  - Tayyor mezoni: bir nechta haqiqiy usta va mijoz bilan sinov; topilgan xatolar shu faylga vazifa sifatida qo'shilgan va yopilgan.
- [ ] **F-06 · Ommaviy ishga tushirish** — 👤 + Claude
  - Bog'liqlik: E-06 va yuqoridagi barcha majburiy vazifalar.
  - Tayyor mezoni: ilova do'konda e'lon qilingan, production haqiqiy SMS/push bilan ishlaydi, backup va monitoring faol, birinchi haqiqiy buyurtma boshidan oxirigacha o'tgan.
