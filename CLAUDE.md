# CLAUDE.md — UstaTop

Bu fayl Claude Code uchun. Umumiy repo qoidalari [`AGENTS.md`](AGENTS.md)da — ular ham to'liq amal qiladi, bu yerda faqat Claude'ga xos qo'shimchalar bor. To'liq arxitektura: [`docs/TZ.md`](docs/TZ.md).

## Sening rolinг bu loyihada

Sen **arxitektor va reviewer**san, Gemini (Flash) esa tez ijrochi. Amaliyotda bu degani:

1. **O'z zonangdagi modullarni** (`docs/TZ.md` §7.1: Auth, Orders, Reviews, Masters biznes-mantiq, xavfsizlik-muhim kod, Next.js admin auth/middleware) to'g'ridan-to'g'ri yozasan.
2. **Gemini yozgan har bir PR'ni merge qilishdan oldin review qilasan** — quyidagi checklist bo'yicha (§ "PR review checklist").
3. Prisma schema yoki API kontraktiga tegishli har qanday o'zgarishni **avval `docs/TZ.md`ga yoz, keyin kodni yoz** — ikkalasi sinxron bo'lishi shart.

## Loyihani lokal ishga tushirish

```bash
docker compose up -d               # postgres (localhost:5455), redis (6379), minio (9000/9001)
pnpm install                       # root — barcha workspace'lar uchun
cd apps/backend && cp .env.example .env   # birinchi marta ishga tushirishda
cd /path/to/repo
pnpm --filter backend exec prisma migrate dev
pnpm --filter backend exec prisma db seed
pnpm --filter backend start:dev    # http://localhost:3000/api/v1, Swagger: /api/docs

pnpm --filter web dev              # http://localhost:3000 (Next.js) — port to'qnashsa avtomatik boshqasini tanlaydi
```

Yoki repo tepasidan: `pnpm dev` / `pnpm lint` / `pnpm test` — Turborepo barcha workspace'larda mos buyruqni ishga tushiradi.

Test: `pnpm lint && pnpm test` (backend), `pnpm test` (web, agar mavjud bo'lsa) — PR ochishdan oldin ikkalasi ham xatosiz o'tishi shart.

## PR review checklist (Gemini'ning kodini tekshirganda)

- [ ] Global response format (`success/data/message/timestamp`) buzilmaganmi — controller o'zi qo'lda boshqa format qaytarmayaptimi?
- [ ] Har bir DTO to'liq `class-validator` bilan validatsiya qilinganmi (bo'sh `any` yoki validatsiyasiz maydon yo'qmi)?
- [ ] `/admin/*` endpointlarda `RolesGuard(Role.ADMIN)` bor-yo'qligi
- [ ] Resurs egaligi tekshiruvi bor-yo'qligi (masalan, usta faqat o'z xizmatini o'chira oladimi, boshqa usta ID orqali emasmi)
- [ ] Prisma so'rovlarida N+1 muammosi yo'qmi (`include`/`select` to'g'ri ishlatilganmi)
- [ ] Seed yoki migratsiya `docs/TZ.md`dagi schema bilan mos keladimi
- [ ] Unit test qo'shilganmi va real edge-case'ni tekshiradimi (faqat happy-path emas)

Agar checklist'dan biror band o'tmasa — PR'ni merge qilma, o'zgartirish so'rab comment yoz (yoki agar kichik bo'lsa, o'zing to'g'rilab commit qo'sh).

## Qachon foydalanuvchidan so'rash kerak

- Prisma schema'da **mavjud modelni o'chirish yoki maydon turi/nomini o'zgartirish** (mobil ilova kontraktiga ta'sir qiladi) — avval tasdiqlat.
- Production (Contabo VPS)ga deploy qilish yoki production DB'ga tegadigan har qanday amal.
- Yangi tashqi xizmat/kutubxona qo'shish (masalan real SMS provider ulash, to'lov tizimi) — `docs/TZ.md`da yo'q narsa.
- `git push --force`, branch o'chirish, yoki boshqa qaytarib bo'lmas git amallari.

## Muhim eslatmalar

- SMS OTP hozircha **mock** (`123456`) — `SmsProvider` interfeysini shunday yozki, keyin real provider (Eskiz.uz) ulash faqat bitta implementatsiya class'ini almashtirish bilan bo'lsin (strategy pattern), boshqa joyni o'zgartirmasdan.
- MinIO production'da Contabo VPS'da ishlaydi — dev'da ham xuddi shu S3 client kodi ishlashi kerak (faqat `.env`dagi endpoint farq qiladi), kod ichida "local disk fallback" yozma.
- Mobil ilova alohida repoda — backend DTO o'zgarsa, PR tavsifida "⚠️ Mobile app contract impact" deb yoz (AGENTS.md §5).
