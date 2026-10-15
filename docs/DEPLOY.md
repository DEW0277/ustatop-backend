# UstaTop — production deploy (Contabo VPS)

Bitta VPS, Docker Compose. Tashqariga faqat Nginx (80/443) ochiq; Postgres, Redis, MinIO faqat ichki tarmoqda.

```
Internet → nginx (TLS)
             ├── /api/v1/*  → backend (NestJS, 3000)
             ├── /uploads/* → minio (bucket, faqat o'qish)
             └── /*         → web (Next.js admin panel, 3001; /api/auth/*, /api/backend/* ham shu yerda)
```

Fayllar: `docker-compose.prod.yml`, `apps/backend/Dockerfile`, `apps/web/Dockerfile`, `deploy/nginx/templates/default.conf.template`, `.env.production.example`.

> Quyidagi barcha `docker compose` buyruqlari qisqalik uchun `dc` deb yozilgan:
> `alias dc='docker compose -f docker-compose.prod.yml --env-file .env.production'`

## 0. Deploy'dan oldin hal qilinishi kerak

- **SMS hali mock.** `SMS_MODE=mock` da OTP doim `123456` — istalgan mijoz/usta raqami nomidan kirish mumkin (admin panelga emas: u faqat login + parol bilan ochiladi). Backend production'da mock bilan **ishga tushmaydi**; yopiq sinov uchun `ALLOW_MOCK_SMS_IN_PRODUCTION=true` qo'yiladi. Ommaga ochishdan oldin haqiqiy SMS provider (Eskiz.uz) ulanishi shart.
- **Mobil ilova manzili**: ilova `https://<domen>/api/v1` ga murojaat qilishi kerak.
- Push: Firebase kalitlari bo'lmasa `PUSH_PROVIDER=log` qoladi (bildirishnomalar yuborilmaydi).
- **MinIO image'i (2026-10-16 holati)**: `quay.io/minio/minio` va `minio/minio` image'larini endi ommaviy registry'lardan yuklab bo'lmaydi — yangi VPS'da `dc build`/`dc up` MinIO'ni ko'tara olmaydi. Deploy'dan oldin S3-mos server bo'yicha qaror kerak (`TASKS.md` E-09).

## 1. VPS'ni tayyorlash (bir marta)

1. Ubuntu 22.04/24.04, kamida 2 vCPU / 4 GB RAM (image build shu serverda bajariladi).
2. DNS: domen uchun `A` yozuvi VPS IP'siga.
3. Docker Engine + Compose plugin: <https://docs.docker.com/engine/install/ubuntu/>
4. Firewall:
   ```bash
   sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
   ```
5. Kod:
   ```bash
   sudo mkdir -p /opt/ustatop && sudo chown $USER /opt/ustatop
   git clone git@github.com:DEW0277/ustatop-backend.git /opt/ustatop && cd /opt/ustatop
   ```

## 2. Sozlash

```bash
cp .env.production.example .env.production && chmod 600 .env.production
nano .env.production
```

Majburiy: `DOMAIN`, `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `JWT_SECRET` (`openssl rand -hex 32`), `ADMIN_LOGIN`, `ADMIN_PASSWORD` (kamida 12 belgi, `openssl rand -base64 18`), `ADMIN_PHONE`, va SMS bo'yicha qaror (0-band).

## 3. Birinchi ishga tushirish

```bash
# 1) Image'larni yig'ish
dc build

# 2) TLS sertifikat (nginx sertifikatsiz ishga tushmaydi, shuning uchun birinchi marta standalone rejimda;
#    80-port bo'sh bo'lishi kerak)
dc run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone \
  -d "$(grep '^DOMAIN=' .env.production | cut -d= -f2)" --agree-tos -m admin@example.uz --no-eff-email

# 3) Hammasini ko'tarish (migratsiyalar `migrate` servisi orqali avtomatik qo'llanadi)
dc up -d

# 4) Boshlang'ich ma'lumot: viloyat/tuman/kategoriyalar + ADMIN_LOGIN/ADMIN_PASSWORD bo'yicha birinchi admin.
#    Admin parolini almashtirish: .env.production'da ADMIN_PASSWORD'ni o'zgartirib shu buyruqni qayta ishga tushiring.
dc run --rm backend node_modules/.bin/tsx prisma/seed.ts
```

Tekshirish:

```bash
dc ps                                            # hammasi "healthy", migrate — "exited (0)"
curl -fsS https://<domen>/api/v1/regions | head -c 200
curl -I https://<domen>/login                     # 200
```

## 4. Yangilash

```bash
cd /opt/ustatop && git pull
dc build && dc up -d          # yangi migratsiyalar avtomatik qo'llanadi
dc ps && dc logs --tail=50 backend
```

Yangilashdan oldin backup oling (6-band). Migratsiya xato bersa `migrate` servisi nol bo'lmagan kod bilan to'xtaydi va backend yangilanmaydi — `dc logs migrate` ni ko'ring.

## 5. Rollback

Har relizni teglab boring, shunda avvalgisiga qaytish qayta build'siz bo'ladi:

```bash
IMAGE_TAG=$(git rev-parse --short HEAD) dc build      # ustatop-backend:<sha>, ustatop-web:<sha>
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$(git rev-parse --short HEAD)/" .env.production && dc up -d
```

Qaytish: `.env.production`da `IMAGE_TAG`ni avvalgi sha'ga o'zgartiring → `dc up -d`.
**Diqqat:** migratsiyalar orqaga qaytarilmaydi. Yangi reliz bazani o'zgartirgan bo'lsa, eski kod yangi schema bilan ishlay olishi kerak (additiv migratsiya) yoki backup'dan tiklanadi.

## 6. Backup va tiklash

Postgres (har kecha, 14 kun saqlanadi) — `crontab -e`:

```cron
0 3 * * * cd /opt/ustatop && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > /opt/backups/db-$(date +\%F).dump && find /opt/backups -name 'db-*.dump' -mtime +14 -delete
```

(`sudo mkdir -p /opt/backups && sudo chown $USER /opt/backups`.) Backup'ni boshqa joyga ham nusxalang (masalan `rclone` bilan) — VPS diski buzilsa, shu serverdagi nusxa yordam bermaydi.

Tiklash:

```bash
dc stop backend web
dc exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < /opt/backups/db-2026-10-12.dump
dc up -d
```

MinIO fayllari (`minio_data` volume):

```bash
docker run --rm -v ustatop_minio_data:/data:ro -v /opt/backups:/backup alpine \
  tar czf /backup/minio-$(date +%F).tar.gz -C /data .
```

## 7. Sertifikat

`certbot` servisi har 12 soatda yangilashni tekshiradi. Nginx yangi sertifikatni o'qishi uchun haftada bir reload — `crontab -e`:

```cron
0 4 * * 1 cd /opt/ustatop && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T nginx nginx -s reload
```

## 8. Loglar va diagnostika

```bash
dc logs -f --tail=100 backend      # yoki web / nginx / migrate
dc ps
dc exec postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Loglar konteyner boshiga 5×10 MB bilan cheklangan.

| Belgi | Sabab |
|---|---|
| backend qayta-qayta o'chadi, logda "Production konfiguratsiyasi xavfsiz emas" | `JWT_SECRET` qisqa, `SMS_MODE=mock` ruxsatsiz yoki `CORS_ORIGINS` bo'sh |
| nginx ishga tushmaydi: `cannot load certificate` | 3-banddagi sertifikat qadami bajarilmagan yoki `DOMAIN` boshqa |
| Admin panelda kirishda 403 "Ruxsat etilmagan so'rov manbai" | Panel boshqa domendan ochilgan — faqat `https://<DOMAIN>` |
| Rasmlar ochilmaydi | `dc logs backend` da bucket policy xabari; `MINIO_BUCKET` nginx va backend'da bir xil bo'lishi kerak |

## 9. Hodisalar: nima qilish kerak

Har qanday hodisada birinchi qadam: `dc ps` (qaysi servis `unhealthy`/`exited`) va `dc logs --tail=200 <servis>`.

| Hodisa | Tekshirish | Harakat |
|---|---|---|
| Sayt/API ochilmaydi | `dc ps`; `curl -I https://<domen>/login`; `curl -fsS https://<domen>/api/v1/regions` | Faqat bitta servis tushgan bo'lsa: `dc up -d <servis>`. Hammasi tushgan bo'lsa — server qayta yuklangandir: `dc up -d`. nginx tushgan bo'lsa — 7-band (sertifikat). |
| backend qayta-qayta o'chadi | `dc logs --tail=100 backend` | "Production konfiguratsiyasi xavfsiz emas" — 8-banddagi jadval. Prisma ulanish xatosi — `dc ps postgres`. Yangilashdan keyin boshlangan bo'lsa — 5-band (rollback). |
| `migrate` xato bilan to'xtagan | `dc logs migrate` | Backend eski versiyada qoladi (yangilanmaydi). Migratsiyani tuzatib qayta deploy qiling; bazaga qo'lda tegishdan oldin backup oling (6-band). |
| Disk to'ldi | `df -h`; `docker system df`; `du -sh /opt/backups` | `docker image prune -a` (ishlatilmayotgan eski image'lar; rollback uchun kerakli teg'larni o'chirmang), eski backup'lar (`find /opt/backups -mtime +14 -delete`). Postgres disk to'lib to'xtagan bo'lsa — joy bo'shatib `dc up -d postgres`. |
| Rasmlar ochilmaydi / yuklanmaydi | `dc logs minio`; `dc logs backend \| grep -i storage` | MinIO tushgan bo'lsa `dc up -d minio`. Bucket policy xabari — 8-band. |
| Bazani tiklash kerak | — | 6-band ("Tiklash"). Tiklashdan oldin joriy holatdan ham backup oling. |
| Admin panelga hech kim kira olmaydi | `dc logs backend \| grep admin/login` | Parolni unutgan — 10-band ("Parolni almashtirish"). "Juda ko'p xato urinish" (429) — 15 daqiqa kuting yoki `dc exec redis redis-cli DEL admin-login:attempts:<login>`. |
| Shubhali faollik (begona admin sessiyasi va h.k.) | `dc logs backend` | Darhol: admin parolini almashtiring (10-band) va `JWT_SECRET`ni almashtiring (11-band) — barcha sessiyalar bekor bo'ladi. |

## 10. Adminlarni boshqarish

Admin panelga faqat `login` + parol bilan kiriladi (`users.login`, `users.passwordHash`, rol `ADMIN`). Parol `scrypt` bilan xeshlanadi — bazaga hech qachon ochiq parol yozmang.

**Birinchi admin / asosiy admin paroli** — `.env.production`dagi `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_PHONE` va seed (3-band, 4-qadam). **Parolni almashtirish**: `ADMIN_PASSWORD`ni o'zgartiring va seed'ni qayta ishga tushiring — boshqa ma'lumotlarga tegmaydi.

**Qo'shimcha admin** (panelda hali bunday sahifa yo'q — `TASKS.md` C-06):

```bash
# 1) Parol xeshi (parol buyruqlar tarixiga tushmasligi uchun o'qib olinadi)
read -rs -p "Yangi admin paroli: " ADMIN_PW && echo
HASH=$(dc run --rm -T -e PW="$ADMIN_PW" backend node -e "const c=require('crypto');const s=c.randomBytes(16);process.stdout.write('scrypt\$'+s.toString('hex')+'\$'+c.scryptSync(process.env.PW,s,64).toString('hex'))")
unset ADMIN_PW

# 2) Admin yaratish (telefon — unikal +998XXXXXXXXX; u bilan kirib bo'lmaydi; login — kichik harf, 3–32 belgi)
dc exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' <<SQL
INSERT INTO users (id, phone, name, role, login, "passwordHash", "isPhoneVerified", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '+998XXXXXXXXX', 'Ism Familiya', 'ADMIN', 'yangi-admin', '$HASH', true, now(), now());
SQL
```

Shu `HASH` bilan mavjud qo'shimcha adminning parolini ham almashtirish mumkin: `UPDATE users SET "passwordHash" = '$HASH' WHERE login = 'yangi-admin' AND role = 'ADMIN';`

**Adminni olib tashlash** — rol darhol kuchini yo'qotadi (backend har so'rovda rolni bazadan o'qiydi):

```sql
UPDATE users SET role = 'CLIENT', login = NULL, "passwordHash" = NULL WHERE login = 'yangi-admin';
```

Asosiy adminni (`ADMIN_PHONE`) shu tarzda olib tashlasangiz, keyingi seed uni qayta tiklaydi — avval `.env.production`dan `ADMIN_*`ni o'zgartiring.

## 11. Sirlarni almashtirish

Har almashtirishdan keyin: `chmod 600 .env.production`, eski qiymatni hech qayerda qoldirmang.

| Sir | Qanday | Ta'siri |
|---|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` → `.env.production` → `dc up -d backend` | **Barcha** sessiyalar (mobil foydalanuvchilar ham, adminlar ham) bekor bo'ladi — hamma qayta kiradi. |
| `ADMIN_PASSWORD` | 10-band | Faqat shu adminning keyingi kirishi. Mavjud sessiyasi tugamaguncha amal qiladi — zudlik bo'lsa `JWT_SECRET`ni ham almashtiring. |
| `MINIO_ROOT_PASSWORD` | `.env.production` → `dc up -d minio backend` (MinIO root hisobini har ishga tushishda env'dan oladi) | Qisqa vaqt rasm yuklash ishlamaydi; fayllar saqlanib qoladi. |
| `POSTGRES_PASSWORD` | Env faqat birinchi ishga tushirishda qo'llanadi: avval `dc exec postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -c "ALTER USER \"$POSTGRES_USER\" PASSWORD '"'"'yangi-parol'"'"';"'`, keyin `.env.production` → `dc up -d migrate backend` | Backend qisqa vaqt qayta ulanadi. |
| `SMS_PROVIDER_API_KEY` / Eskiz | `.env.production` → `dc up -d backend` | Almashtirish paytida SMS yuborilmaydi. |
| `FIREBASE_*` | Firebase konsolida yangi service account kaliti → `.env.production` → `dc up -d backend` → eski kalitni konsolda o'chiring | Push qisqa vaqt yuborilmaydi; qurilma tokenlari saqlanib qoladi. |

