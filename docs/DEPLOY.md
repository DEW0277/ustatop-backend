# UstaTop — production deploy (Contabo VPS)

Bitta VPS, Docker Compose. Tashqariga faqat Nginx (80/443) ochiq; Postgres, Redis, Garage (fayl ombori) faqat ichki tarmoqda.

```
Internet → nginx (TLS)
             ├── /api/v1/*  → backend (NestJS, 3000)
             ├── /uploads/* → garage (website endpoint, faqat o'qish)
             └── /*         → web (Next.js admin panel, 3001; /api/auth/*, /api/backend/* ham shu yerda)
```

Fayllar: `docker-compose.prod.yml`, `apps/backend/Dockerfile`, `apps/web/Dockerfile`, `deploy/nginx/templates/default.conf.template`, `.env.production.example`.

> Quyidagi barcha `docker compose` buyruqlari qisqalik uchun `dc` deb yozilgan:
> `alias dc='docker compose -f docker-compose.prod.yml --env-file .env.production'`

## 0. Deploy'dan oldin hal qilinishi kerak

- **SMS hali mock.** `SMS_MODE=mock` da OTP doim `123456` — shuning uchun production'da backend mock bilan **ishga tushmaydi**, agar quyidagilar bo'lmasa (yopiq sinov):
  - `SMS_MODE=mock` va `ALLOW_MOCK_SMS_IN_PRODUCTION=true`;
  - `MOCK_SMS_ALLOWED_PHONES` — OTP beriladigan raqamlar ro'yxati: vergul bilan ajratilgan, `+998901234567,+998901234568` (probelli `+998 90 123 45 67`, `998901234567` va 9 xonali variantlar ham qabul qilinadi). Ro'yxatda **yo'q** raqamga `send-otp` va `verify-otp` `403` qaytaradi ("Yopiq sinov: bu raqam bilan kirish hali ochilmagan"); mobil ilova bu xabarni Alert'da ko'rsatadi. Ro'yxat **bo'sh** yoki noto'g'ri raqamli bo'lsa backend ishga tushmaydi (8-band). Ro'yxat bo'lmasa `123456` bilan istalgan egasiz akkauntni egallash mumkin bo'lardi.
  - `SMS_MODE` faqat `mock` bo'lishi mumkin (haqiqiy provider ulanmaguncha — `TASKS.md` B-01): `eskiz` kabi boshqa qiymatda production'da backend ishga tushmaydi. Admin panelga bu ta'sir qilmaydi (u faqat login + parol bilan ochiladi).
  - Ro'yxatni o'zgartirish: `.env.production` → `dc up -d backend` (**qayta ishga tushirish shart** — env faqat start'da o'qiladi).
  - Ommaga ochishdan oldin haqiqiy SMS provider (Eskiz.uz) ulanishi shart.
- **Mobil ilova manzili**: ilova `https://<domen>/api/v1` ga murojaat qilishi kerak.
- Push: Firebase kalitlari bo'lmasa `PUSH_PROVIDER=log` qoladi (bildirishnomalar yuborilmaydi).
- **Fayl ombori — Garage** (2026-10-16 dan, MinIO o'rniga — uning ommaviy image'lari endi yo'q). `garage-init` har `up`da layout, S3 kalit, bucket va public o'qishni idempotent sozlaydi (`deploy/garage/init.sh`).

## 1. VPS'ni tayyorlash (bir marta)

1. Ubuntu 22.04/24.04, **4–8 GB RAM**, kamida 2 vCPU (image build shu serverda bajariladi). Quyidagi xotira limitlari (5-qadam) shu hajmga hisoblangan.
2. DNS: domen uchun `A` yozuvi VPS IP'siga.
3. Docker Engine + Compose plugin: <https://docs.docker.com/engine/install/ubuntu/>. **Oddiy (root) Docker** ishlating, rootless emas: postgres uchun `oom_score_adj: -500` (5-qadam) rootless rejimda ishlamaydi. `sudo usermod -aG docker $USER` va qayta kiring.
4. **Host'ni qattiqlashtirish** — quyidagi "Host hardening" bo'limi (SSH, ufw, avtomatik yangilanish, fail2ban, swap). Docker o'rnatilgandan keyin, lekin kodni olishdan oldin bajaring.
5. **Konteyner xotira limitlari** `docker-compose.prod.yml`da berilgan (4–8 GB VPS uchun; jami ≈ 3.3 GB, qolgani host'dagi image build va OS uchun, swap bilan):

   | Servis | `mem_limit` |
   |---|---|
   | backend va migrate (`x-backend`) | 768m |
   | web | 512m |
   | postgres | 1g (+ `oom_score_adj: -500`) |
   | redis | 256m |
   | garage | 512m |

   nginx, certbot, garage-init — limitsiz (kichik). Nima uchun: bitta konteynerdagi xotira oqishi butun serverni (SSH'ni ham) yiqitmasin; limitdan oshgan konteyner o'zi qayta ishga tushadi. Host xotirasi to'liq tugasa, OOM-killer postgres'ni **oxirgi** navbatda tanlaydi (`oom_score_adj: -500`) — ma'lumotlar bazasi eng qimmat. Limit ostida `dc ps` yoki `docker stats --no-stream` bilan real sarfni kuzating; backend tez-tez "OOMKilled" bilan qayta ishga tushsa (`docker inspect --format '{{.State.OOMKilled}}' <konteyner>`) limitni oshiring.
6. **Kodni olish** — deploy key bilan (quyida) yoki HTTPS bilan:
   ```bash
   sudo mkdir -p /opt/ustatop && sudo chown $USER /opt/ustatop
   git clone git@github.com:DEW0277/ustatop-backend.git /opt/ustatop && cd /opt/ustatop
   ```

### Deploy key (VPS -> GitHub, faqat o'qish)

Repo private, shuning uchun VPS'ga o'z kaliti kerak. Shaxsiy SSH kalitingizni serverga **qo'ymang** — repo bo'yicha read-only deploy key yetarli.

```bash
# VPS'da: parolsiz ed25519 kalit (server o'zi git pull qiladi)
ssh-keygen -t ed25519 -C "ustatop-vps-deploy" -f ~/.ssh/ustatop_deploy -N ""
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/ustatop_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
cat ~/.ssh/ustatop_deploy.pub
```

Ochiq kalitni GitHub'ga qo'shing (yozish huquqisiz — `--allow-write` bermang):

- brauzerda: repo -> Settings -> **Deploy keys** -> Add deploy key (**"Allow write access" belgilanmasin**); yoki
- `gh` o'rnatilgan mashinadan (VPS'da emas): `gh repo deploy-key add ustatop_deploy.pub --repo DEW0277/ustatop-backend --title "contabo-vps"` (standart — faqat o'qish).

```bash
# GitHub host kaliti birinchi ulanishda so'raladi: ko'rsatilgan fingerprint'ni
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints bilan solishtirib "yes" deng
ssh -T git@github.com
# "Hi DEW0277/ustatop-backend! You've successfully authenticated, but GitHub does not provide shell access." chiqishi kerak
```

**HTTPS muqobili:** GitHub'da faqat shu repo uchun fine-grained token (Repository permissions -> Contents: **Read-only**, muddati cheklangan) yarating, so'ng `git config --global credential.helper store && git clone https://github.com/DEW0277/ustatop-backend.git /opt/ustatop` — parol so'ralganda token'ni kiriting (`~/.git-credentials`da saqlanadi, `chmod 600`). Token tugasa `git pull` xato beradi — yangisini yaratib `~/.git-credentials`ni yangilang.

### Host hardening (Ubuntu 24.04)

**SSH parol bilan kirishni yopish.** Avval kalit bilan kirish ishlayotganiga ishonch hosil qiling. Joriy sessiyani **yopmang**.

```bash
# Drop-in fayl nomi 00- bilan boshlansin: sshd birinchi uchragan qiymatni oladi, cloud-init'ning
# 50-cloud-init.conf'i (PasswordAuthentication yes) esa keyin o'qiladi.
sudo tee /etc/ssh/sshd_config.d/00-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
PermitRootLogin prohibit-password
EOF
sudo sshd -t && sudo systemctl reload ssh      # sshd -t xato bersa reload QILMANG
sudo sshd -T | grep -iE '^(passwordauthentication|permitrootlogin)'
```

> **Ogohlantirish:** reload'dan keyin **ikkinchi terminal/ikkinchi SSH sessiyada** kalit bilan yangidan kirib ko'ring. Kira olmasangiz, birinchi (ochiq) sessiyada `/etc/ssh/sshd_config.d/00-hardening.conf`ni o'chirib `sudo systemctl reload ssh` qiling. Aks holda serverga kirish yo'qoladi (faqat provayder konsoli qoladi).

**Firewall (ufw):**

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
sudo ufw status verbose
```

Diqqat: Docker `ports:` bilan **publish qilingan** portlarni `iptables` orqali to'g'ridan-to'g'ri ochadi va **ufw'ni chetlab o'tadi**. Shuning uchun `docker-compose.prod.yml`da faqat nginx (80/443) `ports:` ishlatadi; postgres, redis, garage, backend, web'ga hech qachon `ports:` qo'shmang — ufw ularni yopib qo'ymaydi.

**Avtomatik xavfsizlik yangilanishlari:**

```bash
sudo apt-get update && sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades      # "Yes"
systemctl status unattended-upgrades --no-pager | head -5
```

**fail2ban (SSH brute-force):**

```bash
sudo apt-get install -y fail2ban
sudo tee /etc/fail2ban/jail.d/sshd.local >/dev/null <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
bantime = 1h
EOF
sudo systemctl enable --now fail2ban && sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
```

**Swap fayl** (image build va xotira cho'qqilari uchun; Contabo'da odatda swap yo'q):

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h && swapon --show
```

## 2. Sozlash

```bash
cp .env.production.example .env.production && chmod 600 .env.production
nano .env.production
```

Majburiy: `DOMAIN`, `POSTGRES_PASSWORD`, `S3_ACCESS_KEY` (`echo GK$(openssl rand -hex 12)`), `S3_SECRET_KEY`, `GARAGE_RPC_SECRET`, `GARAGE_ADMIN_TOKEN` (har biri `openssl rand -hex 32`), `JWT_SECRET` (`openssl rand -hex 32`), `ADMIN_LOGIN`, `ADMIN_PASSWORD` (kamida 12 belgi, `openssl rand -base64 18`), `ADMIN_PHONE`, va SMS bo'yicha qaror (0-band): yopiq sinov uchun `SMS_MODE=mock`, `ALLOW_MOCK_SMS_IN_PRODUCTION=true` va **`MOCK_SMS_ALLOWED_PHONES=+998901234567,+998901234568`** (sinovchilar raqamlari; ro'yxatda yo'q raqam `403` oladi, ro'yxat bo'sh bo'lsa backend ishga tushmaydi; o'zgartirgach `dc up -d backend`). `SMS_MODE`ga `mock`dan boshqa qiymat bermang — haqiqiy provider hali ulanmagan (`TASKS.md` B-01).

## 3. Birinchi ishga tushirish

```bash
# 1) Image'larni yig'ish
dc build

# 2) TLS sertifikat (nginx sertifikatsiz ishga tushmaydi, shuning uchun birinchi marta standalone rejimda;
#    80-port bo'sh bo'lishi kerak)
#    DOMAIN qiymati qo'shtirnoqli ("..." yoki '...') yoki CRLF bilan yozilgan bo'lsa ham to'g'ri olinadi.
DOMAIN=$(sed -n 's/^DOMAIN=//p' .env.production | head -n 1 | tr -d "\"'\r")
EMAIL=you@example.com   # o'zingizning haqiqiy pochtangiz (sertifikat muddati haqidagi ogohlantirishlar shu yerga keladi)
dc run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone \
  -d "$DOMAIN" --agree-tos -m "$EMAIL" --no-eff-email

# 3) Hammasini ko'tarish (migratsiyalar `migrate` servisi orqali avtomatik qo'llanadi)
dc up -d

# 4) Boshlang'ich ma'lumot: viloyat/tuman/kategoriyalar (FAQAT bo'sh bazada yaratiladi, mavjudlariga tegmaydi)
#    + ADMIN_LOGIN/ADMIN_PASSWORD bo'yicha birinchi admin. Logda "Reference data: regions+districts created, categories created"
#    chiqishi kerak (qayta ishga tushirilsa "skipped"). Admin parolini almashtirish: 10-band.
dc run --rm backend node_modules/.bin/tsx prisma/seed.ts
```

Tekshirish:

```bash
dc ps                                            # hammasi "healthy", migrate — "exited (0)"
curl -fsS https://<domen>/api/v1/regions | head -c 200
curl -I https://<domen>/login                     # 200
curl -sI https://<domen>/login | grep -iE '^(x-frame-options|content-security-policy|x-content-type-options|referrer-policy)'   # 4 ta sarlavha
curl -sI https://<domen>/uploads/ | grep -iE '^(x-content-type-options|strict-transport-security)'   # fayl bo'lmasa 404, lekin sarlavhalar bor

# Sertifikat yangilanishi ishlashini oldindan tekshirish (haqiqiy sertifikatga tegmaydi):
dc run --rm --entrypoint certbot certbot renew --webroot -w /var/www/certbot --dry-run
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

Ikkita skript (`deploy/backup/`): `backup.sh` va `restore.sh`. Ikkalasi ham VPS'da default'lar bilan ishlaydi
(`/opt/ustatop`, `/opt/backups`, project `ustatop`); boshqacha bo'lsa flag yoki env beriladi (`--help`).
Sirlarni skript o'qimaydi — `.env.production` faqat `docker compose --env-file` sifatida uzatiladi.

### Backup

Bir marta: `sudo mkdir -p /opt/backups && sudo chown $USER /opt/backups`. Keyin kunlik cron (`crontab -e`):

```cron
# BACKUP_RCLONE_REMOTE=offsite:ustatop-backups
0 3 * * * /opt/ustatop/deploy/backup/backup.sh >> /opt/backups/backup.log 2>&1
```

(Tashqi nusxa kerak bo'lsa birinchi qatorni izohdan chiqaring — pastdagi "Tashqi nusxa" bandi.)

Qo'lda: `/opt/ustatop/deploy/backup/backup.sh`. Skript:

1. `pg_dump -Fc` oladi va `pg_restore --list` bilan tekshiradi (postgres ishlamasa shu yerda to'xtaydi, Garage'ga tegilmaydi);
2. Garage'ni bir necha soniyaga to'xtatib `garage_meta` + `garage_data` ni arxivlaydi va darhol qayta ishga tushiradi
   (shu vaqtda rasm yuklash/ochish ishlamaydi — shuning uchun kechasi; xato bo'lsa ham Garage qayta yoqiladi);
3. hammasini `/opt/backups/<YYYY-MM-DD_HHMMSS>/` (UTC) papkasiga yozadi, avval `.<nom>.partial` ichida — yarim backup
   to'liq set bo'lib ko'rinmaydi;
4. `--retention-days N` (yoki `BACKUP_RETENTION_DAYS`, default 14) dan eski set papkalarini o'chiradi;
5. `BACKUP_RCLONE_REMOTE` berilgan bo'lsa nusxani tashqariga yuboradi.

**Set formati:** `db.dump` (pg custom format), `garage.tar.gz` (faqat `meta/` va `data/`), `SHA256SUMS`, `MANIFEST`
(`created_utc`, `project`, `app_git_sha`; sir yo'q). Papka `700`, fayllar `600` (dump'da telefon raqamlari/parol xeshlari,
Garage metadata'sida S3 maxfiy kaliti bor). Retention faqat nomi `YYYY-MM-DD_HHMMSS` naqshiga mos papkalarga tegadi:
**eski bitta fayldagi `db-*.dump` nusxalari retention'ga kirmaydi** — ularni qo'lda o'chiring.

**Exit kodlar:** `0` — tayyor · `1` — ish vaqtidagi xato · `2` — noto'g'ri flag/konfiguratsiya (hech narsa qilinmagan) ·
`3` — lokal backup tayyor, lekin tashqi nusxa muvaffaqiyatsiz. Log qatorlari `[backup] <UTC vaqt> ...` ko'rinishida.
`.lock` papkasi bo'lsa va boshqa backup/restore ishlamayotgan bo'lsa (skript `kill -9` qilingan) — `rmdir /opt/backups/.lock`.

### Tashqi nusxa (rclone)

VPS diski buzilsa, shu serverdagi nusxa yordam bermaydi — set'ni boshqa joyga ham yuboring. `rclone` o'rnating va
**nomli remote** sozlang (`rclone config`; sirlar `~/.config/rclone/rclone.conf`da, `chmod 600`, yoki
`RCLONE_CONFIG_<NOM>_*` env'da). Skriptga faqat nom beriladi: `BACKUP_RCLONE_REMOTE=offsite:ustatop-backups`.
`:s3,secret_access_key=...:bucket` kabi inline remote (ichida `,` yoki `=`) rad etiladi (exit 2) — maxfiy kalit
buyruq satriga va logga tushmasligi uchun. Nusxa `rclone copy` bilan (`sync` emas) — tashqaridagi eski nusxalar
o'chirilmaydi, ularning retention'i saqlash xizmatining o'zida sozlanadi.

Arxivda S3 maxfiy kaliti va shaxsiy ma'lumot bor, shuning uchun nusxani **shifrlang**: `crypt` remote yarating
(`rclone config` → `crypt`, asosiy remote ustida) va `BACKUP_RCLONE_REMOTE=offsite-crypt:ustatop-backups` ishlating.
Crypt parolini serverdan tashqarida ham saqlang — usiz nusxani ochib bo'lmaydi. `BACKUP_RCLONE_REMOTE` bo'sh bo'lsa
skript ogohlantirish chiqaradi va faqat lokal nusxa qoladi. Remote berilgan, lekin `rclone` o'rnatilmagan bo'lsa — exit 3.

### Tiklash

Tiklash bazadagi barcha ma'lumotni va Garage'dagi barcha fayllarni **almashtiradi**. Tartib:

```bash
/opt/ustatop/deploy/backup/backup.sh              # 1) joriy holatdan ham backup oling (restore o'zi olmaydi)
/opt/ustatop/deploy/backup/restore.sh --list      # 2) mavjud set'lar (eskidan yangiga) va hajmi
/opt/ustatop/deploy/backup/restore.sh --yes 2026-10-12_030001    # 3) set nomi, `latest` yoki papka yo'li
```

`--yes`siz skript faqat nima qilinishini yozadi va exit 2 bilan chiqadi (hech narsa o'zgarmaydi). `--yes` bilan:
checksum (`SHA256SUMS`) va arxiv yozuvlari (faqat `meta/`, `data/`; `..`, `/` bilan boshlanuvchi yo'l va link rad
etiladi) tekshiriladi; ishlab turgan `backend`/`web` to'xtatiladi; Postgres `pg_restore --clean --if-exists
--single-transaction` bilan tiklanadi; Garage to'xtatilib volume'lar tozalanadi va arxiv ochiladi, Garage ko'tarilib
`garage-init` ishlaydi; to'xtatilgan `backend`/`web` qayta ishga tushadi. Xato bo'lsa Garage qayta yoqiladi, lekin
`backend`/`web` **qayta ishga tushirilmaydi** (yarim tiklangan bazada ishlamasin) — xato xabari qanday davom ettirishni aytadi.
Server butunlay yo'qolgan bo'lsa: 1–3-bandlar bo'yicha yangi VPS tayyorlang, `dc up -d postgres garage`, backup papkasini
`/opt/backups`ga qaytaring (tashqi nusxadan: `rclone copy offsite-crypt:ustatop-backups/<set> /opt/backups/<set>`) va
yuqoridagi `restore.sh --yes` ni ishga tushiring, so'ng `dc up -d`.

Tekshirish:

```bash
dc ps                                              # hammasi healthy
curl -fsS https://<domen>/api/v1/regions           # API javob beradi
curl -fsSI https://<domen>/uploads/<mavjud-fayl>   # rasm ochiladi
```

Lokal sinov (Docker kerak, dev stack'ka tegmaydi — alohida `ustatop-backuptest` project): `/bin/bash deploy/backup/test-local.sh`.

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
| backend qayta-qayta o'chadi, logda "Production konfiguratsiyasi xavfsiz emas" | `JWT_SECRET` qisqa; `SMS_MODE=mock` `ALLOW_MOCK_SMS_IN_PRODUCTION=true`siz; `MOCK_SMS_ALLOWED_PHONES` bo'sh yoki noto'g'ri raqamli (xabarda qaysi element ekani ko'rsatiladi); `SMS_MODE=<mock'dan boshqa>` ("hali qo'llab-quvvatlanmaydi"); `CORS_ORIGINS` bo'sh |
| Mobil ilovada kirishda `403` "Yopiq sinov: bu raqam bilan kirish hali ochilmagan" | Raqam `MOCK_SMS_ALLOWED_PHONES` ro'yxatida yo'q: ro'yxatga qo'shing va `dc up -d backend` |
| nginx ishga tushmaydi: `cannot load certificate` | 3-banddagi sertifikat qadami bajarilmagan yoki `DOMAIN` boshqa |
| Admin panelda kirishda 403 "Ruxsat etilmagan so'rov manbai" | Panel boshqa domendan ochilgan — faqat `https://<DOMAIN>` |
| Rasmlar ochilmaydi | `dc logs garage-init` ("Garage tayyor" bo'lishi kerak); `S3_BUCKET` nginx, backend va garage-init'da bir xil bo'lishi kerak |

## 9. Hodisalar: nima qilish kerak

Har qanday hodisada birinchi qadam: `dc ps` (qaysi servis `unhealthy`/`exited`) va `dc logs --tail=200 <servis>`.

| Hodisa | Tekshirish | Harakat |
|---|---|---|
| Sayt/API ochilmaydi | `dc ps`; `curl -I https://<domen>/login`; `curl -fsS https://<domen>/api/v1/regions` | Faqat bitta servis tushgan bo'lsa: `dc up -d <servis>`. Hammasi tushgan bo'lsa — server qayta yuklangandir: `dc up -d`. nginx tushgan bo'lsa — 7-band (sertifikat). |
| backend qayta-qayta o'chadi | `dc logs --tail=100 backend` | "Production konfiguratsiyasi xavfsiz emas" — 8-banddagi jadval. Prisma ulanish xatosi — `dc ps postgres`. Yangilashdan keyin boshlangan bo'lsa — 5-band (rollback). |
| `migrate` xato bilan to'xtagan | `dc logs migrate` | Backend eski versiyada qoladi (yangilanmaydi). Migratsiyani tuzatib qayta deploy qiling; bazaga qo'lda tegishdan oldin backup oling (6-band). |
| Disk to'ldi | `df -h`; `docker system df`; `du -sh /opt/backups` | `docker image prune -a` (ishlatilmayotgan eski image'lar; rollback uchun kerakli teg'larni o'chirmang), eski backup set'lar (`ls /opt/backups`; keraksizini `rm -rf`, yoki `BACKUP_RETENTION_DAYS`ni kamaytiring — 6-band). Postgres disk to'lib to'xtagan bo'lsa — joy bo'shatib `dc up -d postgres`. |
| Rasmlar ochilmaydi / yuklanmaydi | `dc logs garage`; `dc logs garage-init`; `dc logs backend \| grep -i "S3\|storage"` | Garage tushgan bo'lsa `dc up -d garage garage-init`. Disk to'lgan bo'lsa — yuqoridagi qator. |
| Bazani tiklash kerak | `/opt/ustatop/deploy/backup/restore.sh --list` | Avval `backup.sh` (joriy holat), keyin `restore.sh --yes <set>` — 6-band ("Tiklash"). |
| Admin panelga hech kim kira olmaydi | `dc logs backend \| grep admin/login` | Parolni unutgan — 10-band ("Parolni almashtirish"). "Juda ko'p xato urinish" (429) — 15 daqiqa kuting yoki `dc exec redis redis-cli DEL admin-login:attempts:<login>`. |
| Shubhali faollik (begona admin sessiyasi va h.k.) | `dc logs backend` | Admin sessiyasi ko'pi bilan 12 soat amal qiladi va yangilanmaydi. Darhol: admin parolini almashtiring (10-band) va zudlik bo'lsa `JWT_SECRET`ni almashtiring (11-band) — barcha sessiyalar bekor bo'ladi. |

## 10. Adminlarni boshqarish

Admin panelga faqat `login` + parol bilan kiriladi (`users.login`, `users.passwordHash`, rol `ADMIN`). Parol `scrypt` bilan xeshlanadi — bazaga hech qachon ochiq parol yozmang.

**Birinchi admin / asosiy admin paroli** — `.env.production`dagi `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_PHONE` va seed (3-band, 4-qadam). **Parolni almashtirish**: odatda admin panelning o'zida — **Sozlamalar** sahifasi (joriy parol kerak). Parol unutilgan bo'lsa: `ADMIN_PASSWORD`ni o'zgartiring va seed'ni qayta ishga tushiring. Seed mavjud viloyat/tuman/kategoriyalarni **o'zgartirmaydi** (ular faqat bo'sh bazada yaratiladi; admin panelda tahrirlaganingiz saqlanadi), lekin asosiy adminning parol, login, rol va blok holatini har safar `.env.production`dagi qiymatga qaytaradi — paneldan parol almashtirgach `ADMIN_PASSWORD`ni ham yangilang yoki seed'ni qayta ishlatmang.

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
| `ADMIN_PASSWORD` | 10-band | Faqat shu adminning keyingi kirishi. Mavjud sessiyasi ko'pi bilan 12 soat amal qiladi (admin tokeni yangilanmaydi) — zudlik bo'lsa `JWT_SECRET`ni ham almashtiring. |
| `S3_SECRET_KEY` (Garage kaliti) | Yangi juftlik: `S3_ACCESS_KEY=GK$(openssl rand -hex 12)`, `S3_SECRET_KEY=$(openssl rand -hex 32)` → `.env.production` → `dc up -d garage-init backend` (init yangi kalitni import qilib bucket'ga ruxsat beradi). Eski kalitni o'chirish: `dc exec garage /garage key delete --yes <eski GK...>` | Fayllar saqlanib qoladi; qisqa vaqt yuklash ishlamaydi. |
| `POSTGRES_PASSWORD` | Env faqat birinchi ishga tushirishda qo'llanadi: avval `dc exec postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -c "ALTER USER \"$POSTGRES_USER\" PASSWORD '"'"'yangi-parol'"'"';"'`, keyin `.env.production` → `dc up -d migrate backend` | Backend qisqa vaqt qayta ulanadi. |
| `SMS_PROVIDER_API_KEY` / Eskiz | `.env.production` → `dc up -d backend` | Almashtirish paytida SMS yuborilmaydi. |
| `FIREBASE_*` | Firebase konsolida yangi service account kaliti → `.env.production` → `dc up -d backend` → eski kalitni konsolda o'chiring | Push qisqa vaqt yuborilmaydi; qurilma tokenlari saqlanib qoladi. |

