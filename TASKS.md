# TASKS.md — UstaTop: 100% tugatishgacha qolgan ishlar

> Loyihaning **yagona jonli vazifalar ro'yxati**. Arxitektura va qarorlar — [`docs/TZ.md`](docs/TZ.md), agent qoidalari — [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md).
> Holat sanasi: **2026-10-13** (`main` = `1be4f74`, PR #30 gacha merge qilingan, CI yashil).

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
| A. Tezkor tuzatishlar va tartib | 1 | 4 |
| B. Backend | 1 | 7 |
| C. Admin panel | 2 | 6 |
| D. Mobil ilova integratsiyasi | 0 | 13 |
| E. Deploy va operatsiya | 0 | 8 |
| F. Reliz | 0 | 6 |
| **Jami** | **4** | **44** |

Allaqachon tugagan ishlar (backend modullari, admin panel sahifalari, xavfsizlik, CI, production Docker konfiguratsiyasi, FCM kodi) bu yerda takrorlanmaydi — ular `docs/TZ.md` §0 da.

**Kritik yo'l** (eng qisqa yo'l bilan ishga tushirish): A-01 → D-01…D-12 → E-01…E-03 (yopiq sinov) → B-01 (real SMS) → E-06 → F-03…F-06.

---

## A. Tezkor tuzatishlar va tartib

- [x] **A-01 · Root `package.json` bo'sh (0 bayt)** — Claude — ✅ Bajarildi (2026-10-12, `git checkout -- package.json`, PR'siz — fayl commit qilinmagan edi)
  - Ishchi papkada commit qilinmagan o'zgarish faylni bo'shatib qo'ygan; `pnpm install` / `pnpm dev` / `pnpm lint` ishlamaydi.
  - Tayyor mezoni: `git checkout -- package.json` (yoki ataylab qilingan bo'lsa to'g'ri tarkib), `pnpm lint && pnpm test` o'tadi.
- [ ] **A-02 · `docs/TZ.md`ni haqiqiy holat bilan sinxronlash** — Claude
  - §0 da "🔄 Jarayonda" turibdi, §7.4 jadvalida 3, 4, 5-bandlar belgilanmagan — aslida hammasi merge qilingan (PR #29, #30, #24).
  - Tayyor mezoni: §0 va §7.4 yangilangan; §7.4 qolgan ishlar uchun shu faylga havola beradi (ikki joyda ikki xil ro'yxat bo'lmasin); §3 daraxtiga `TASKS.md` qo'shilgan.
- [ ] **A-03 · Eskirgan branch'larni tozalash** — Claude 🔒👤
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
- [ ] **B-03 · Akkauntni o'chirish endpointi** — Claude 🔒👤 ⚠️
  - App Store va Google Play akkaunt yaratadigan ilovalardan ilova ichida akkauntni o'chirish imkoniyatini talab qiladi. Hozir bunday endpoint yo'q.
  - Murakkablik: buyurtmasi bor foydalanuvchini FK tufayli o'chirib bo'lmaydi (TZ §4.0) → anonimlashtirish kerak. Avval TZ'ga yoziladi, schema o'zgarsa tasdiq so'raladi.
  - Tayyor mezoni: `DELETE /auth/me` (yoki TZ'da kelishilgan shakl), shaxsiy ma'lumot tozalanadi, token darhol yaroqsiz, buyurtma tarixi saqlanadi; unit + e2e test.
- [ ] **B-04 · E2e qamrovini kengaytirish** — Claude
  - Hozir e2e faqat auth / admin / orders. Masters (upsert, xizmat egaligi, portfolio), reviews (403 qoidasi, reyting qayta hisoblash), favorites va upload e2e'siz.
  - Tayyor mezoni: `masters`, `reviews`, `favorites`, `upload` uchun e2e fayllar; CI `e2e` job'ida MinIO ham ko'tariladi; hammasi yashil.
- [ ] **B-05 · MinIO'da yetim fayllar** — Gemini
  - Portfolio rasmi o'chirilganda yoki avatar almashtirilganda obyekt MinIO'da qoladi (`StorageService`da o'chirish metodi yo'q).
  - Tayyor mezoni: `StorageService.deleteFile`, portfolio o'chirish va avatar almashtirishda chaqiriladi (faqat o'z bucket URL'i uchun, xato asosiy amalni buzmaydi); unit test.
- [ ] **B-06 · `packages/shared-types`ni to'ldirish** — Gemini (MVP'dan keyin, ixtiyoriy)
  - Hozir bo'sh; admin panel tiplari `apps/web/lib/types.ts`da qo'lda yozilgan.
  - Tayyor mezoni: admin javob tiplari bitta paketdan backend va web'ga import qilinadi.
- [x] **B-07 · Usta profilini faqat admin yaratadi** — Claude ⚠️ — ✅ Bajarildi (2026-10-13, PR #31)
  - `PUT /masters/me/profile` endi faqat mavjud profilni tahrirlaydi; profili yo'q foydalanuvchi 403 oladi (TZ §4.0). Ilova tomoni — D-10.
  - Tayyor mezoni: unit + e2e testlar, TZ yangilangan.

## C. Admin panel (`apps/web`)

- [ ] **C-01 · To'liq qo'lda QA (production build)** — Claude
  - Barcha 8 bo'lim (`NAV_ITEMS`) production build'da, haqiqiy seed ma'lumot bilan: login/logout, filtrlar, sahifalash, har bir mutatsiya, 401/403/409 holatlari, mobil kenglik.
  - Tayyor mezoni: topilgan har bir xato alohida vazifa/PR bo'lib tuzatilgan yoki shu faylga qo'shilgan.
- [ ] **C-02 · Usta/foydalanuvchi batafsil ko'rinishi** — Gemini 👤 (ixtiyoriy)
  - Hozir faqat jadvallar; ustaning xizmatlari, portfolio rasmlari va buyurtmalarini ko'rib tasdiqlash imkoni yo'q — moderator rasmlarni ko'rmasdan tasdiqlaydi.
  - Tayyor mezoni: TZ §4.1 ga endpoint qo'shilgan, usta kartasi (dialog yoki sahifa) portfolio va xizmatlar bilan.
- [ ] **C-03 · Maxfiylik siyosati va foydalanish shartlari sahifalari** — Gemini 👤
  - Do'konlar ommaviy URL talab qiladi (F-02). Matnni foydalanuvchi beradi.
  - Tayyor mezoni: `/privacy` va `/terms` auth'siz ochiladi (`proxy.ts` ularni login'ga yo'naltirmaydi).
- [x] **C-04 · Admin panelda usta qo'shish** — Claude — ✅ Bajarildi (2026-10-12, PR #31)
  - `POST /admin/masters` (TZ §4.1): telefon bo'yicha akkaunt yaratadi yoki mavjud mijozga profil biriktiradi; Ustalar sahifasida "Usta qo'shish" dialogi.
  - Tayyor mezoni: endpoint + forma, unit va e2e testlar, lint/typecheck yashil, brauzerda jonli tekshirilgan.
- [x] **C-05 · Admin panelga login + parol bilan kirish** — Claude — ✅ Bajarildi (2026-10-13, PR #31)
  - `POST /auth/admin/login` (TZ §4.1), `users.login`/`passwordHash` (additiv migratsiya), scrypt, 5 xato urinishdan keyin 15 daqiqa blok; ADMIN uchun OTP kirishi yopildi; seed `ADMIN_LOGIN` + `ADMIN_PASSWORD`.
  - Tayyor mezoni: login sahifasi login/parol, unit + e2e testlar, brauzerda jonli tekshirilgan, hujjatlar va `.env*.example` yangilangan.
- [ ] **C-06 · Admin parolini paneldan almashtirish va adminlarni boshqarish** — Claude 👤 (ixtiyoriy)
  - Hozir parol faqat `ADMIN_PASSWORD` + `prisma db seed` orqali almashtiriladi va bitta admin bor.
  - Tayyor mezoni: TZ'ga endpoint qo'shilgan; "Parolni almashtirish" (eski parol tekshiriladi) va kerak bo'lsa yangi admin qo'shish.

## D. Mobil ilova integratsiyasi (`/Users/macstore.uz/Desktop/mobile-app`, alohida repo) 🔒

> Ilovaning o'z `TASKS.md`i "RELEASE_READY" deydi, lekin amalda **hech bir ekran API qatlamidan foydalanmaydi**: 11 ta ekran/komponent `@/mock`dan to'g'ridan-to'g'ri import qiladi, `loginWithOtp` istalgan 4 xonali kodni qabul qiladi, `src/services/api/*` esa xatoda jimgina mock'ga qaytadi. Bu bo'lim — loyihaning eng katta qolgan qismi.
> Alohida repo — tegishdan oldin foydalanuvchidan aniq ruxsat olinadi (TZ §7.4).

- [ ] **D-01 · Ilovani git'ga olish** — 👤 + Claude
  - `mobile-app/` hozir git repo emas — tarix ham, zaxira ham yo'q.
  - Tayyor mezoni: `git init`, `.gitignore`, GitHub'da private repo, birinchi commit.
- [ ] **D-02 · API manzili va konfiguratsiya** — Claude
  - `API_BASE_URL` kodda qotirilgan (`https://api.ustatop.uz/v1`), backend prefiksi esa `/api/v1`.
  - Tayyor mezoni: manzil `EXPO_PUBLIC_API_URL` / `eas.json` profillari orqali (dev: lokal backend, preview: staging, production: `https://<domen>/api/v1`).
- [ ] **D-03 · Mock fallback'ni olib tashlash** — Claude
  - Tayyor mezoni: `mockAdapter` faqat aniq dev bayrog'i bilan ishlaydi; production build'da tarmoq xatosi foydalanuvchiga xato holati sifatida ko'rsatiladi, soxta ma'lumot emas.
- [ ] **D-04 · Haqiqiy autentifikatsiya** — Claude
  - Tayyor mezoni: `send-otp`/`verify-otp` haqiqiy API orqali; OTP **6 katak** (TZ §4.0); token xavfsiz saqlanadi (`expo-secure-store`); 401 da sessiya tozalanib login'ga o'tadi; 429 (120 soniya / urinishlar limiti) va bloklangan foydalanuvchi xabarlari ko'rsatiladi; `updateProfile` faqat `name`/`avatarUrl` yuboradi.
- [ ] **D-05 · Ma'lumotnomalar API'dan** — Gemini
  - Tayyor mezoni: viloyat, tuman, kategoriyalar `GET /regions|districts|categories`dan (keshlash bilan); `RegionListScreen`, `DistrictListScreen`, `HomeScreen`da `@/mock` importi yo'q.
- [ ] **D-06 · Ustalar ro'yxati, qidiruv va usta sahifasi** — Claude
  - Tayyor mezoni: `MasterListScreen`, `SearchScreen`, `HomeScreen` (tavsiya etilganlar), `MasterDetailScreen` `GET /masters` / `GET /masters/:id`dan; sahifalash (cheksiz scroll) — 20 tadan ortiq usta ko'rinadi; filtr va `sortBy` server tomonda; yuklanish/bo'sh/xato holatlari.
- [ ] **D-07 · Sevimlilar** — Gemini
  - Tayyor mezoni: `favoritesApi.ts` (`GET /favorites`, `/favorites/ids`, `POST`/`DELETE /favorites/:masterId`), store server bilan sinxron, login'siz holatda login'ga yo'naltiradi.
- [ ] **D-08 · Buyurtmalar (mijoz va usta)** — Claude
  - Tayyor mezoni: `BookingScreen` → `POST /orders`; `OrdersScreen` → `GET /orders/my`; `MasterIncomingOrdersScreen` → `GET /orders/my?as=master`; status o'zgartirish `PUT /orders/:id/status`; `useOrdersStore` lokal persist emas, server holati; 409/404/400 xabarlari ko'rsatiladi.
- [ ] **D-09 · Sharhlar** — Gemini
  - Tayyor mezoni: `GET`/`POST /masters/:id/reviews`; sharh formasi faqat tugallangan buyurtmadan keyin ochiladi yoki 403 xabari ko'rsatiladi (TZ §4.0); qayta yuborilgan sharh yangilanishi UI'da aks etadi.
- [ ] **D-10 · Usta kabineti** — Claude
  - "Usta bo'lish" formasi **olib tashlanadi** (B-07: profilni faqat admin yaratadi) — o'rniga "administratorga murojaat qiling" ma'lumoti; usta rejimi faqat profili bor foydalanuvchiga ko'rinadi.
  - Tayyor mezoni: `GET /masters/me/profile` (404 = usta emas) va `PUT` (faqat tahrirlash), xizmatlar CRUD, `PATCH /masters/me/availability`; `useMasterProfileStore` lokal mock emas.
- [ ] **D-11 · Rasm yuklash** — Claude
  - Portfolio hozir tayyor "preset" rasmlardan tanlaydi; `expo-image-picker` o'rnatilmagan.
  - Tayyor mezoni: galereya/kameradan tanlash → `POST /upload/single` → avatar (`PUT /auth/profile`) va portfolio (`POST`/`DELETE /masters/me/portfolio`); hajm/format xatolari ko'rsatiladi.
- [ ] **D-12 · Push bildirishnomalar** — Claude 👤
  - Bog'liqlik: B-02 (Firebase loyihasi).
  - Tayyor mezoni: ruxsat so'rash, FCM token olish, login'dan keyin `PUT /auth/fcm-token`, logout'da `DELETE`; bildirishnoma bosilganda tegishli buyurtma ochiladi.
- [ ] **D-13 · Akkauntni o'chirish va huquqiy havolalar** — Gemini
  - Bog'liqlik: B-03, C-03.
  - Tayyor mezoni: Profil ekranida "Akkauntni o'chirish" (tasdiqlash bilan) va maxfiylik siyosati / shartlar havolalari.

## E. Deploy va operatsiya (Contabo VPS) 🔒

- [ ] **E-01 · VPS va domen** — 👤
  - Tayyor mezoni: Ubuntu 22.04/24.04 VPS (kamida 2 vCPU / 4 GB), domen `A` yozuvi, Claude uchun SSH kirish yoki foydalanuvchi buyruqlarni o'zi bajaradi.
- [ ] **E-02 · Birinchi deploy (yopiq sinov)** — Claude + 👤
  - Bog'liqlik: E-01. `docs/DEPLOY.md` §1–3 bo'yicha, `ALLOW_MOCK_SMS_IN_PRODUCTION=true` bilan — **manzil ommaga e'lon qilinmaydi** (mock OTP bilan istalgan mijoz/usta raqami nomidan kirish mumkin; admin panel alohida — login + parol).
  - Tayyor mezoni: `dc ps` hammasi healthy, `https://<domen>/api/v1/regions` va `/login` ishlaydi, seed qo'llangan, admin panelga kirilgan.
- [ ] **E-03 · Backup va sertifikat cron'lari** — Claude
  - Tayyor mezoni: kunlik `pg_dump` + MinIO arxivi cron'da, **boshqa joyga** nusxa (rclone / obyekt saqlash), haftalik nginx reload; backup'dan tiklash bir marta amalda sinab ko'rilgan.
- [ ] **E-04 · CD — avtomatik deploy** — Claude 👤
  - TZ §6: "`main`ga merge → SSH orqali deploy" hali rejada. Image'lar hozir VPS'ning o'zida yig'iladi.
  - Tayyor mezoni: GitHub Actions workflow (qo'lda tasdiq / `workflow_dispatch` bilan), SSH kaliti repo secret'ida, sha bo'yicha `IMAGE_TAG` (rollback uchun), DEPLOY.md yangilangan.
- [ ] **E-05 · Monitoring va xato kuzatuvi** — Claude 🔒👤
  - Hozir faqat `docker logs`. Yangi tashqi xizmat (masalan Sentry, UptimeRobot) — tasdiq kerak.
  - Tayyor mezoni: tashqi uptime tekshiruvi (API + panel) ogohlantirish bilan; backend va web'da 5xx xatolar kuzatuvi; disk to'lishi ogohlantirishi.
- [ ] **E-06 · Production'ni haqiqiy rejimga o'tkazish** — Claude + 👤
  - Bog'liqlik: B-01, B-02.
  - Tayyor mezoni: `SMS_MODE=eskiz`, `ALLOW_MOCK_SMS_IN_PRODUCTION=false`, `PUSH_PROVIDER=fcm`, `SWAGGER_ENABLED=false`; sinov davridagi soxta foydalanuvchi/buyurtmalar tozalangan; `123456` bilan kirib bo'lmasligi tekshirilgan.
- [ ] **E-07 · Yuklama va xavfsizlik tekshiruvi (production'da)** — Claude
  - Tayyor mezoni: rate limit Nginx ortida haqiqiy IP bo'yicha ishlashi tekshirilgan (`TRUST_PROXY`), TLS/sarlavhalar tekshiruvi, `pnpm audit` 0, Postgres/Redis/MinIO portlari tashqaridan yopiq, `/uploads` faqat o'qish.
- [ ] **E-08 · Operatsion qo'llanma** — Claude
  - Tayyor mezoni: `docs/DEPLOY.md`ga qo'shilgan: hodisa yuz berganda nima qilish (xizmat tushdi, disk to'ldi, DB tiklash), admin qo'shish/olib tashlash, sirlarni almashtirish (JWT secret, MinIO, Eskiz).

## F. Reliz

- [ ] **F-01 · Dasturchi akkauntlari** — 👤
  - Tayyor mezoni: Google Play Console va (iOS kerak bo'lsa) Apple Developer akkauntlari, Expo/EAS akkaunti.
- [ ] **F-02 · Do'kon materiallari** — 👤 + Gemini
  - Tayyor mezoni: ilova ikonkasi, skrinshotlar, tavsif (uz/ru), maxfiylik siyosati URL (C-03), ma'lumotlar xavfsizligi anketasi (telefon raqami, rasmlar, push token).
- [ ] **F-03 · Staging'da to'liq oqim sinovi** — Claude + 👤
  - Bog'liqlik: D-02…D-12, E-02.
  - Tayyor mezoni: haqiqiy qurilmada (Android, kerak bo'lsa iOS) ssenariy: admin ustani qo'shadi → usta o'z raqami bilan kiradi, xizmat/portfolio qo'shadi → mijoz ro'yxatdan o'tadi va buyurtma beradi → usta qabul qiladi/yakunlaydi → mijoz sharh qoldiradi → admin sharhni o'chiradi; har qadamda push keladi.
- [ ] **F-04 · Production build** — Claude
  - Tayyor mezoni: EAS `production` profili (AAB / IPA) production API manziliga qaragan, versiya va `uz.ustatop.app` identifikatori to'g'ri, ichki sinov trekiga yuklangan.
- [ ] **F-05 · Yopiq beta** — 👤
  - Tayyor mezoni: bir nechta haqiqiy usta va mijoz bilan sinov; topilgan xatolar shu faylga vazifa sifatida qo'shilgan va yopilgan.
- [ ] **F-06 · Ommaviy ishga tushirish** — 👤 + Claude
  - Bog'liqlik: E-06 va yuqoridagi barcha majburiy vazifalar.
  - Tayyor mezoni: ilova do'konda e'lon qilingan, production haqiqiy SMS/push bilan ishlaydi, backup va monitoring faol, birinchi haqiqiy buyurtma boshidan oxirigacha o'tgan.
