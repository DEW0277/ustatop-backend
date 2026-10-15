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
