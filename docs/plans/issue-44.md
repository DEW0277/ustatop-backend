# Plan: E-03 — backup va restore skriptlari (pg_dump + Garage), lokal sinov bilan
Source: GitHub issue #44 — "[task] E-03: backup and restore scripts (pg_dump + Garage), tested locally"
Base: main @ abcd914 (branch `agent/issue-44`)

## Goal
Production uchun ikkita skript: `deploy/backup/backup.sh` (kunlik Postgres `pg_dump -Fc` + Garage `meta`/`data` volume
arxivi; bitta sana bilan nomlangan "backup set" papkasi, checksum, N kundan eski set'larni o'chirish, ixtiyoriy
`rclone` tashqi nusxa) va `deploy/backup/restore.sh` (tanlangan set'dan Postgres va Garage'ni tiklash, faqat `--yes`
bilan). Ikkalasi ham VPS'da prod default'lari bilan (`/opt/ustatop`, `/opt/backups`, project `ustatop`), lokal
sinovda esa flag'lar orqali alohida compose project (`ustatop-backuptest`) bilan ishlaydi. Sinov —
qayta ishga tushiriladigan `deploy/backup/test-local.sh` (backup → ma'lumotni buzish/o'chirish → restore → ma'lumot
qaytgani), foydalanuvchining dev stack'iga (`texnozor` project) tegmaydi. CI'ga `shellcheck` job qo'shiladi,
`docs/DEPLOY.md` §6–7 yangilanadi, `TASKS.md` E-03 ostiga "Jarayonda" izohi yoziladi (E-03 ✅ qilinmaydi).

## Dizayn qarorlari (coder shu bo'yicha yozadi — qayta muhokama qilinmaydi)

**D1. Backup set formati.** `"$BACKUP_DIR/<YYYY-MM-DD_HHMMSS>/"` (UTC, `date -u +%Y-%m-%d_%H%M%S`), ichida:
`db.dump` (pg custom format), `garage.tar.gz` (top-level faqat `meta/` va `data/`), `SHA256SUMS` (nisbiy nomlar,
`sha256sum -c` bilan tekshiriladi), `MANIFEST` (`created_utc=`, `project=`, `app_git_sha=` yoki `unknown`; sir yo'q).
Avval `"$BACKUP_DIR/.<name>.partial/"` ga yoziladi, hammasi muvaffaqiyatli bo'lgandan keyingina `mv` bilan set nomiga
o'tkaziladi — yarim backup hech qachon "to'liq set" bo'lib ko'rinmaydi. Set nomi band bo'lsa — xato (nolmas exit).
`umask 077`: papkalar `700`, fayllar `600` (dump'da telefonlar/xeshlar, Garage meta'da S3 secret va node key bor).

**D2. Konfiguratsiya (ikkala skript uchun bir xil).** Flag ustun, keyin env, keyin default:

| Flag | Env | Default |
|---|---|---|
| `--app-dir DIR` | `USTATOP_APP_DIR` | `/opt/ustatop` |
| `--compose-file F` | `USTATOP_COMPOSE_FILE` | `$APP_DIR/docker-compose.prod.yml` |
| `--env-file F` | `USTATOP_ENV_FILE` | `$APP_DIR/.env.production` |
| `--project NAME` | `USTATOP_COMPOSE_PROJECT` | `ustatop` |
| `--backup-dir DIR` | `BACKUP_DIR` | `/opt/backups` |
| `--retention-days N` (faqat backup) | `BACKUP_RETENTION_DAYS` | `14` (butun son ≥ 1, aks holda exit 2) |
| — (faqat backup) | `BACKUP_RCLONE_REMOTE` | bo'sh = tashqi nusxa o'chiq |
| — | `BACKUP_HELPER_IMAGE` | `alpine:3.22` (tar uchun yordamchi image) |

Compose buyrug'i doim massiv sifatida: `docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT"
--project-directory "$APP_DIR"`. (Tekshirildi: `-p` prod compose'dagi `name: ustatop`ni bekor qiladi; container'lar
`ustatop-backuptest-postgres-1` bo'ladi.) `COMPOSE_PROJECT_NAME` ishlatilmaydi (chalkashlik bo'lmasin).

**D3. Sirlar.** Skriptlar env faylni **hech qachon** `source`/`.` qilmaydi va o'qimaydi — faqat `--env-file` sifatida
compose'ga beradi (mavjudligi `-r` bilan tekshiriladi). `pg_dump`/`pg_restore` container ichida
`sh -c '... -U "$POSTGRES_USER" ... "$POSTGRES_DB"'` (bitta tirnoq — kengayish container ichida) bilan ishlaydi.
`set -x` yo'q, `docker compose config` faqat `-q` bilan, env qiymatlari hech qayerda `echo` qilinmaydi.

**D4. Volume va tarmoq nomlari** project'dan aniqlanadi, qattiq yozilmaydi:
`docker volume ls -q --filter label=com.docker.compose.project=$PROJECT --filter label=com.docker.compose.volume=garage_meta`
(xuddi shunday `garage_data`). Prod'da bu `ustatop_garage_meta` / `ustatop_garage_data` ga teng. Topilmasa — xato.

**D5. Backup ketma-ketligi.** lock (`mkdir "$BACKUP_DIR/.lock"`; `flock` macOS'da yo'q) → `pg_dump` (postgres
ishlamayotgan bo'lsa shu yerda xato, Garage'ga tegilmaydi) → `pg_restore --list` bilan dump'ni container ichida
tekshirish → Garage ishlayotgan bo'lsa `stop garage` → `docker run --rm -v <meta>:/meta:ro -v <data>:/data:ro
"$BACKUP_HELPER_IMAGE" tar czf - -C / meta data > garage.tar.gz` (stdout orqali, bind-mount'siz) → Garage'ni darhol
`start` (bu `trap` bilan ham kafolatlangan: xato bo'lsa ham, faqat o'zimiz to'xtatgan bo'lsak) → `SHA256SUMS`,
`MANIFEST` → `.partial` → set nomi → retention → tashqi nusxa. Retention faqat yangi set to'liq bo'lgandan keyin,
faqat `-mindepth 1 -maxdepth 1 -type d` va aniq nom naqshi
`[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9][0-9][0-9][0-9][0-9]` bo'yicha `-mtime +N`; 1 kundan eski
`.*.partial` qoldiqlari ham o'chiriladi; boshqa fayl/papkalarga (masalan eski `db-*.dump`) tegmaydi.

**D6. Tashqi nusxa (rclone).** `BACKUP_RCLONE_REMOTE` bo'sh → stderr'ga `WARN: BACKUP_RCLONE_REMOTE not set — offsite
copy skipped` mazmunida ogohlantirish, exit 0. Qiymat faqat **nomli remote** bo'lishi mumkin: naqsh
`^[A-Za-z0-9_-]+:[^,=]*$` (masalan `offsite:ustatop-backups`); inline/connection-string remote (`:s3,secret=...:b`,
`,` yoki `=` bor) — **skript boshida**, hech narsa qilmasdan, qiymatni chiqarmasdan exit 2 ("configure a named remote
in rclone.conf"). Remote sozlangan, lekin `rclone` PATH'da yo'q → exit 3 (lokal set saqlanadi). Nusxa:
`rclone copy "$SET_DIR" "$REMOTE/$SET_NAME"` (`sync` emas — tashqi nusxalarni o'chirmaydi). rclone xatosi → exit 3,
lokal set saqlanadi. Logga faqat remote nomi (`${REMOTE%%:*}`) chiqadi. Sirlar `rclone.conf` (chmod 600) yoki
`RCLONE_CONFIG_*` env'da — skript ularga tegmaydi.

**D7. Exit kodlar.** `0` muvaffaqiyat · `1` ish vaqtidagi xato · `2` noto'g'ri foydalanish / `--yes` yo'q / noto'g'ri
konfiguratsiya · `3` lokal backup tayyor, lekin tashqi nusxa muvaffaqiyatsiz. Log qatorlari: `[backup] <UTC ISO>
<xabar>` / `[restore] ...` (stdout; xato va ogohlantirish stderr).

**D8. Restore.** `restore.sh [config flags] [--list] [--yes] <SET>`; `SET` = set nomi (D1 naqshi), `latest`, yoki set
papkasiga yo'l. `--list` — set nomlari (eskidan yangiga) va hajmi, exit 0, hech narsani o'zgartirmaydi.
Tartib — **barcha tekshiruvlar destruktiv qadamdan oldin**: (1) set mavjud, uchala fayl bor, `sha256sum -c SHA256SUMS`
o'tadi; (2) `tar tzf` ro'yxatida har bir yozuv `meta`, `meta/…`, `data` yoki `data/…`, hech birida `..` yoki `/` bilan
boshlanish yo'q; (3) `--yes` yo'q bo'lsa — nima qilinishini yozadi va exit 2 (holat o'zgarmaydi); (4) lock (backup
bilan bir xil `.lock`); (5) ishlayotgan `backend`/`web`ni aniqlab (`ps --status running --services`) faqat
o'shalarni `stop`; (6) `up -d --wait postgres` → dump'ni `pg_restore --list` bilan tekshirish → `pg_restore --clean
--if-exists --no-owner --single-transaction --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB"` (stdin);
(7) `up -d --no-deps garage` (volume'lar yangi serverda ham yaratilsin) → `stop garage` → yordamchi container'da
`/meta` va `/data` ichini tozalash (`find … -mindepth 1 -delete`) va `tar xzf - -C /` (stdin) → `start garage` →
`run --rm --no-deps garage-init` (idempotent; env'dagi S3 kalit mavjudligini tasdiqlaydi), exit 0 bo'lishi shart;
(8) 5-qadamda to'xtatilganlarni `start`; (9) "restore OK" + set nomi. Xato bo'lsa trap Garage'ni qayta `start`
qiladi va backend/web'ni **qayta ishga tushirmaydi** (yarim tiklangan bazada ishlamasin) — buni xato xabarida aytadi.
Restore o'zi "oldindan backup" olmaydi; DEPLOY.md'da `backup.sh` ni avval ishga tushirish yoziladi.

**D9. Portativlik.** Skriptlar `#!/usr/bin/env bash`, `set -euo pipefail`, barcha kengayishlar tirnoqda, **bash 3.2
(macOS `/bin/bash`) va bash 5 (Ubuntu)** da ishlaydi: `mapfile`, `declare -A`, `${x,,}`, `[[ -v ]]`, `|&`, bo'sh
massivni `set -u` bilan kengaytirish ishlatilmaydi. `sha256sum` bo'lmasa `shasum -a 256`. GNU/BSD'ga xos flag'lar
(`date -d`, `stat -c`, `find -printf`, `sed -i`) ishlatilmaydi.

**D10. Lokal sinov arxitekturasi (`test-local.sh`).** Repo'dagi `docker-compose.prod.yml` va `deploy/garage/`
vaqtinchalik `APP_DIR`ga (`mktemp -d` ichida, `/opt/ustatop` ko'rinishini takrorlaydi) nusxalanadi va o'sha yerda
tasodifiy throwaway `.env.production` (chmod 600, har sir `openssl rand -hex 32`, `S3_ACCESS_KEY=GK$(openssl rand
-hex 12)`) yaratiladi — worktree'da hech qanday `.env*` yaratilmaydi. Faqat `postgres garage garage-init` ko'tariladi
(nginx/backend/web emas — host port ochilmaydi, image build yo'q; tekshirildi: `.env.production` yo'qligi
`postgres`/`garage` uchun to'siq emas). Project nomi qattiq: `ustatop-backuptest`; skript boshida `down -v` (oldingi
qoldiq), `trap … EXIT INT TERM` da `down -v --remove-orphans` + temp papkani o'chirish. Garage'ga yozish:
`--network ${PROJECT}_internal` dagi yordamchi container'da `curl --aws-sigv4 "aws:amz:us-east-1:s3" -H
'x-amz-content-sha256: UNSIGNED-PAYLOAD' -T … http://garage:3900/ustatop-uploads/<key>` (agar Garage buni rad etsa —
`rclone/rclone` image'ini env-config bilan ishlatish; qaysi biri tanlangani PR'da yoziladi). O'qish — public yo'l
orqali: `curl -H 'Host: ustatop-uploads.web.garage.internal' http://garage:3902/<key>` (nginx ishlatadigan yo'l).
Postgres "barmoq izi": `backup_probe(id int primary key, note text)` jadvali, 100 qator;
`SELECT count(*) || ':' || md5(string_agg(id || '=' || note, ',' ORDER BY id)) FROM backup_probe`.
Skriptlar `"$BASH" deploy/backup/<script>.sh …` orqali chaqiriladi (test qaysi bash bilan ishlasa, skriptlar ham
shu bilan). Har bir chaqiruvning stdout+stderr'i `$TMP/logs/<case>.log`ga yoziladi (va ekranga). Har case uchun
`PASS: <case>` / `FAIL: <case>: <sabab>`, oxirida `ALL PASSED (<n> cases)`; birorta FAIL bo'lsa exit 1.
Test o'zi hech qachon sirlarni ekranga chiqarmaydi.

## Acceptance criteria
Barcha `[test]` belgili AC'lar `/bin/bash deploy/backup/test-local.sh` ichida nomlangan case sifatida tekshiriladi
(case nomi qavsda); `[grep]` — diff bo'yicha statik tekshiruv; `post-PR` — faqat PR ochilgandan keyin.

- [ ] AC-1 [test `backup_ok`]: `backup.sh` (flag'lar bilan, `BACKUP_RCLONE_REMOTE` bo'sh) exit 0; `BACKUP_DIR` ichida
  D1 naqshidagi bitta yangi papka paydo bo'ladi, unda `db.dump`, `garage.tar.gz`, `SHA256SUMS`, `MANIFEST`;
  `sha256sum -c SHA256SUMS` o'tadi; `db.dump` container ichida `pg_restore --list` bilan o'qiladi; `tar tzf garage.tar.gz`
  da faqat `meta/…` va `data/…` yozuvlari; papka rejimi `700`, fayllar `600`; `.partial` qoldig'i yo'q; backup'dan
  keyin `garage` yana `running`.
- [ ] AC-2 [test `backup_retention`]: oldindan yaratilgan, `touch -t` bilan 30 kun eskirtirilgan soxta set
  `2020-01-01_000000/`, 2 kun eski `.x.partial/`, eski `keep-me/` papkasi va `db-2020-01-01.dump` fayli bor holda
  `--retention-days 14` bilan backup: soxta set va `.partial` o'chadi, `keep-me/` va `db-2020-01-01.dump` qoladi, yangi
  set qoladi. `--retention-days 0` va `--retention-days abc` → exit 2, hech narsa o'chmaydi.
- [ ] AC-3 [test `backup_fail_pg`]: postgres to'xtatilgan holda backup → exit ≠ 0; yangi to'liq set yaratilmaydi;
  retention ishlamaydi (soxta eski set joyida qoladi); `garage` holati o'zgarmaydi (running). Keyin postgres qayta
  ko'tariladi.
- [ ] AC-4 [test `backup_fail_garage_restart`]: `BACKUP_HELPER_IMAGE=ustatop-backuptest/does-not-exist:0` bilan
  backup → exit ≠ 0, yangi to'liq set yo'q, va skript tugagandan keyin `garage` yana `running` (trap ishladi).
- [ ] AC-5 [test `restore_requires_yes`]: `--yes`siz `restore.sh <set>` → exit 2; Postgres barmoq izi va Garage
  obyektlari o'zgarmaydi, `garage` running. `--list` exit 0 va set nomini chiqaradi.
- [ ] AC-6 [test `restore_rejects_corrupt`]: set nusxasidagi `db.dump` ga bitta bayt qo'shilgan holda
  `restore.sh --yes <path>` → exit ≠ 0, Postgres barmoq izi o'zgarmaydi va `garage` running (hech narsa to'xtatilmagan).
- [ ] AC-7 [test `restore_in_place`]: backup'dan keyin ma'lumot buziladi (`DELETE FROM backup_probe WHERE id <= 50`,
  yangi `after-backup.txt` obyekti yuklanadi) → `restore.sh --yes <set>` exit 0 → barmoq izi backup oldidagiga teng,
  `probe.txt` ning sha256 si asl bilan teng (public yo'l orqali), `after-backup.txt` → 404.
- [ ] AC-8 [test `restore_fresh_volumes`]: `down -v` (barcha volume'lar o'chadi) → `up -d --wait postgres` va
  `up -d garage` (bo'sh) → `restore.sh --yes latest` exit 0 → AC-7 dagi bilan bir xil tekshiruvlar o'tadi
  ("server butunlay yo'qoldi" ssenariysi).
- [ ] AC-9 [test `offsite_skip`]: `BACKUP_RCLONE_REMOTE` bo'sh → exit 0 va log'da `BACKUP_RCLONE_REMOTE` so'zi bor
  ogohlantirish qatori.
- [ ] AC-10 [test `offsite_stub`]: PATH boshiga argumentlarini faylga yozadigan stub `rclone` qo'yilgan,
  `BACKUP_RCLONE_REMOTE=offsite:ustatop-backups`, `RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY=<sentinel>` → exit 0; stub
  aynan `copy <set papkasi> offsite:ustatop-backups/<set nomi>` bilan chaqirilgan. Stub `exit 1` qilsa → backup exit 3
  va lokal set joyida. Remote sozlangan, PATH'da `rclone` yo'q → exit 3. Inline remote
  `:s3,secret_access_key=<sentinel>:b` → exit 2, yangi set yaratilmaydi.
- [ ] AC-11 [test `no_secrets_in_logs`]: test davomidagi barcha `backup.sh`/`restore.sh` log'larida
  (`$TMP/logs/*.log`) `POSTGRES_PASSWORD`, `S3_SECRET_KEY`, `GARAGE_RPC_SECRET`, `GARAGE_ADMIN_TOKEN` qiymatlari va
  AC-10 sentinel'lari `grep -F` bilan topilmaydi.
- [ ] AC-12 [grep]: `deploy/backup/backup.sh` va `restore.sh` da `set -euo pipefail` bor; `set -x` yo'q; env faylni
  `source`/`.` qilish yo'q; `docker compose … config` faqat `-q` bilan (yoki umuman yo'q); restore'da destruktiv
  qadamlar (`stop`, `pg_restore`, `-delete`, `tar x`) `--yes` tekshiruvi va checksum/tar-ro'yxat tekshiruvidan **keyin**
  keladi; restore faqat o'zi to'xtatgan `backend`/`web`ni qayta `start` qiladi (D8 (5),(8)).
- [ ] AC-13 [test `isolation`]: test faqat qattiq yozilgan `ustatop-backuptest` project'ini ishlatadi (nomni env/flag
  orqali o'zgartirib bo'lmaydi; skriptlarga har chaqiruvda `--project ustatop-backuptest` va temp `--app-dir`,
  `--backup-dir` beriladi — `[grep]`: test'da `ustatop`/`texnozor` project nomi yoki `/opt/` yo'li bilan chaqiruv yo'q);
  test tugagach (PASS yoki FAIL) `docker ps -a` va `docker volume ls` da
  `com.docker.compose.project=ustatop-backuptest` label'li hech narsa qolmaydi; `texnozor` project container'larining
  ID va holati test oldidagi bilan bir xil (verification buyruqlarida tekshiriladi).
- [ ] AC-14 [test]: butun `test-local.sh` macOS `/bin/bash` 3.2.57 bilan `ALL PASSED` bilan va exit 0 tugaydi,
  5 daqiqadan kam vaqtda (image'lar keshda bo'lganda).
- [ ] AC-15 [grep]: `docs/DEPLOY.md` §6 da: (a) kunlik cron qatori
  `0 3 * * * /opt/ustatop/deploy/backup/backup.sh >> /opt/backups/backup.log 2>&1` (kerak bo'lsa oldida
  `BACKUP_RCLONE_REMOTE=…` crontab o'zgaruvchisi), (b) eski bitta qatorli `pg_dump … find … -delete` cron va qo'lda
  `docker run … alpine tar czf` buyrug'i olib tashlangan, (c) tiklash tartibi: avval `backup.sh` (joriy holat), keyin
  `restore.sh --list` va `restore.sh --yes <set>`, tekshirish buyruqlari (`dc ps`, `/api/v1/regions`), (d) exit
  kodlar (0/1/2/3), set formati, `rclone` nomli remote sozlash va `crypt` remote tavsiyasi (arxivda S3 kalit va
  shaxsiy ma'lumot bor), (e) eski `db-*.dump` fayllari retention'ga kirmasligi. §7 da haftalik nginx reload cron qatori
  saqlangan. §9 jadvalidagi "Bazani tiklash kerak" va "Disk to'ldi" qatorlari yangi skriptlarga ishora qiladi.
- [ ] AC-16 [grep]: `TASKS.md` da E-03 hamon `- [ ]`, ostida `> 🔄 Jarayonda:` izohi `deploy/backup/`, `test-local.sh`
  va `PR #__PR__` ni eslatadi hamda qolgan ishni (VPS'ga cron o'rnatish, tashqi saqlash joyini tanlash, haqiqiy serverda
  tiklash sinovi) sanaydi; "Umumiy holat" jadvali o'zgarmagan (E: 2/10, Jami 25/46).
- [ ] AC-17 `post-PR`: PR'dagi CI run'da yangi `Shellcheck` job yashil va u `deploy/` ostidagi barcha `*.sh` ni
  (`deploy/garage/init.sh`, `deploy/backup/backup.sh`, `restore.sh`, `test-local.sh`) tekshiradi; boshqa CI job'lari
  yashil; job 2 daqiqadan kam (butun CI ≤ 10 daqiqa byudjeti buzilmaydi).
- [ ] AC-18 `post-PR`: PR tavsifida lokal sinov buyrug'i (`/bin/bash deploy/backup/test-local.sh`) va uning oxirgi
  natija qatorlari (`PASS: …` ro'yxati + `ALL PASSED`), hamda Garage'ga yozish usuli (curl sigv4 yoki rclone image)
  yozilgan.

## Tasks

### T1 — Lokal test harness va backup testlari
- route: sonnet
- why route: destruktiv docker amallari (down -v) boshqa project'ga tegmasligi va sirlar logga chiqmasligi — xato
  foydalanuvchi dev ma'lumotini yo'qotadi.
- files: create `deploy/backup/test-local.sh` (chmod +x)
- tests first: harness (D10: temp APP_DIR, throwaway env, `ustatop-backuptest` project, trap cleanup, `PASS/FAIL`
  helper'lar, barmoq izi va obyekt yozish/o'qish helper'lari, seed) va case'lar `backup_ok`, `backup_retention`,
  `backup_fail_pg`, `backup_fail_garage_restart`, `offsite_skip`, `offsite_stub`, `no_secrets_in_logs`, `isolation`.
  `backup.sh` hali yo'qligi sababli backup case'lari FAIL bo'lishi va trap baribir hammasini tozalashi ko'rsatiladi.
- done when: harness ishlaydi va tozalaydi (AC-13 qismi); backup case'lari mavjud va (T2 gacha) FAIL.

### T2 — `deploy/backup/backup.sh`
- route: sonnet
- why route: ma'lumot yo'qotish xavfi (retention `rm -rf`, Garage stop/start trap), sirlar, ishonch chegarasidagi
  konfiguratsiya validatsiyasi.
- files: create `deploy/backup/backup.sh` (chmod +x); umumiy kod kerak bo'lsa `deploy/backup/lib.sh` (ikkala skript
  `source "$(dirname "$0")/lib.sh"` qiladi; `--help` matni har birida o'zida)
- tests first: T1 dagi `backup_ok`, `backup_retention`, `backup_fail_pg`, `backup_fail_garage_restart`, `offsite_skip`
  FAIL → PASS. D1–D7, D9 bo'yicha; `--help` exit 0.
- done when: AC-1, AC-2, AC-3, AC-4, AC-9, AC-12 (backup qismi).

### T3 — Tashqi nusxa (rclone) va sirlar tekshiruvi
- route: sonnet
- why route: tashqi saqlashga sir/ma'lumot oqishi va inline-credential remote'ni rad etish — xavfsizlik chegarasi.
- files: modify `deploy/backup/backup.sh` (va `lib.sh` agar bor bo'lsa), `deploy/backup/test-local.sh`
- tests first: `offsite_stub` (4 kichik holat: muvaffaqiyat, stub exit 1 → 3, rclone yo'q → 3, inline remote → 2) va
  `no_secrets_in_logs` FAIL → PASS.
- done when: AC-10, AC-11 (backup qismi).

### T4 — Restore testlari
- route: sonnet
- why route: destruktiv tiklash ssenariylari; noto'g'ri test yolg'on "tiklandi" degan ishonch beradi.
- files: modify `deploy/backup/test-local.sh`
- tests first: `restore_requires_yes`, `restore_rejects_corrupt`, `restore_in_place`, `restore_fresh_volumes`
  qo'shiladi va `restore.sh` yo'qligida FAIL bo'ladi.
- done when: case'lar mavjud va FAIL.

### T5 — `deploy/backup/restore.sh`
- route: sonnet
- why route: ishlab turgan bazani `--clean` bilan almashtirish va volume'larni tozalash; arxiv yozuvlarini tekshirish
  (path traversal); tasdiq flag'i.
- files: create `deploy/backup/restore.sh` (chmod +x); `deploy/backup/lib.sh` (agar T2 da yaratilgan bo'lsa)
- tests first: T4 case'lari FAIL → PASS; `no_secrets_in_logs` restore log'larini ham qamraydi.
- done when: AC-5, AC-6, AC-7, AC-8, AC-11, AC-12 (restore qismi), AC-14 (butun test ketma-ket ikki marta yashil).

### T6 — CI: shellcheck job
- route: gemini
- why route: oddiy CI config wiring, mantiq yo'q.
- files: modify `.github/workflows/ci.yml` — yangi job:
  ```yaml
  shellcheck:
    name: Shellcheck (deploy scripts)
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - run: shellcheck --version
      - run: find deploy -type f -name '*.sh' -print0 | xargs -0 shellcheck -x
  ```
  (`-x` — `lib.sh` `source` qilinsa uni kuzatish uchun; skriptlarda kerak bo'lsa `# shellcheck source=lib.sh`.)
- tests first: lokal tekshiruv yo'q (shellcheck o'rnatilmaydi); `ci.yml` YAML sintaksisi
  `ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml")'` (yoki `python3 -c 'import yaml…'`) bilan tekshiriladi.
- done when: AC-17 (post-PR). Agar PR CI'da `deploy/garage/init.sh` yoki yangi skriptlar shellcheck'dan o'tmasa —
  tuzatish fix-round'da **sonnet**ga beriladi (init.sh xatti-harakati o'zgarmasligi kerak; dev compose'da
  `docker compose up -d --wait storage-proxy` bilan qayta sinaladi — faqat izolyatsiyalangan project'da).

### T7 — `docs/DEPLOY.md` va `TASKS.md`
- route: sonnet
- why route: destruktiv tiklash tartibining hujjati skript flag'lari va exit kodlariga aynan mos bo'lishi kerak
  (T2/T5 muallifi yozadi — flag nomlari ajralib ketmasin).
- files: modify `docs/DEPLOY.md` (§6 to'liq qayta yoziladi, §7 cron saqlanadi, §9 ikki qator), `TASKS.md` (E-03 ostiga
  `> 🔄 Jarayonda:` qatori)
- tests first: grep tekshiruvlari (Verification commands'dagi "Docs/TASKS" bloki) o'zgartirishdan oldin FAIL.
- done when: AC-15, AC-16.

## Out of scope
- VPS'ga cron o'rnatish, `/opt/backups` yaratish, haqiqiy serverda tiklash sinovi (E-01/E-02 dan keyin).
- Tashqi saqlash xizmatini tanlash, `rclone.conf` yozish, tashqi nusxalar retention'i (`rclone copy`, `sync` emas).
- Backup monitoring/ogohlantirish (E-05), shifrlash skriptda (tavsiya — rclone `crypt` remote, DEPLOY.md'da).
- `restore.sh` ichida avtomatik "oldindan backup", qisman tiklash (`--only db|garage`), Garage onlayn snapshot.
- Redis backup (sessiya/rate-limit kesh — tiklash shart emas), `letsencrypt` volume backup.
- `scripts/agent/*` shellcheck'i; `test-local.sh` ni CI'da ishga tushirish (alohida qaror — pastda).
- `docs/TZ.md` o'zgarmaydi (schema/API kontraktiga ta'sir yo'q; mobil kontrakt ta'siri yo'q).

## Risks / open questions
- R1: `curl --aws-sigv4` + Garage — `x-amz-content-sha256: UNSIGNED-PAYLOAD` bilan ishlashi kutiladi, lekin lokal
  tasdiqlanmagan. Ishlamasa `rclone/rclone` image (env-config) zaxira varianti (D10); tanlov PR'da yoziladi (AC-18).
- R2: shellcheck lokal yo'q — `init.sh` (`${3:+-d "$3"}` kabi ifodalar) va yangi skriptlar birinchi marta faqat PR
  CI'da tekshiriladi; bitta fix-round kerak bo'lishi mumkin (verify→fix limiti: 2).
- R3: `mktemp -d` macOS'da `/var/folders/...` — Docker Desktop default file sharing'da bor; `garage.toml` bind-mount
  ishlamasa `TMPDIR`ni `$HOME` ostiga yo'naltirish kerak bo'ladi (test boshida aniq xato bilan to'xtashi kerak).
- R4: Backup paytida Garage bir necha soniya to'xtaydi (rasm yuklash/ochish ishlamaydi) — DEPLOY.md'dagi kabi kechasi.
- R5: `mkdir` lock — skript `kill -9` qilinsa `.lock` qoladi; xato xabari uni qanday o'chirishni aytadi.
- R6: Disk joyi tekshirilmaydi (`garage.tar.gz` katta bo'lishi mumkin) — E-05 monitoringiga qoldirildi.
- Q (bloklamaydi): `test-local.sh` ni CI'ga alohida job sifatida qo'shish kerakmi (~2–3 daqiqa, regressiyadan
  himoya)? Hozir qo'shilmaydi.

## Verification commands
Worktree: `/Users/macstore.uz/Desktop/.worktrees/texnozor/issue-44`. Hech qanday haqiqiy `.env*` o'qilmaydi;
`texnozor` dev stack'iga tegilmaydi.

```bash
cd /Users/macstore.uz/Desktop/.worktrees/texnozor/issue-44

# 0) dev stack holatini yozib olish (AC-13)
docker ps -a --filter label=com.docker.compose.project=texnozor --format '{{.ID}} {{.Names}} {{.State}}' | sort > /tmp/texnozor-before.txt

# 1) sintaksis (shellcheck o'rniga lokal minimum; AC-5/AC-17 shellcheck — post-PR)
for f in deploy/backup/*.sh; do /bin/bash -n "$f" || echo "SYNTAX FAIL $f"; done
sh -n deploy/garage/init.sh
test -x deploy/backup/backup.sh && test -x deploy/backup/restore.sh && test -x deploy/backup/test-local.sh
/bin/bash deploy/backup/backup.sh --help >/dev/null; echo "backup --help exit=$?"
/bin/bash deploy/backup/restore.sh --help >/dev/null; echo "restore --help exit=$?"

# 2) to'liq lokal sinov (AC-1..AC-11, AC-13, AC-14) — macOS bash 3.2 bilan
time /bin/bash deploy/backup/test-local.sh; echo "test-local exit=$?"

# 3) tozalanganini va dev stack o'zgarmaganini tekshirish (AC-13)
docker ps -a --filter label=com.docker.compose.project=ustatop-backuptest -q | wc -l      # 0
docker volume ls --filter label=com.docker.compose.project=ustatop-backuptest -q | wc -l  # 0
docker ps -a --filter label=com.docker.compose.project=texnozor --format '{{.ID}} {{.Names}} {{.State}}' | sort | diff /tmp/texnozor-before.txt - && echo "texnozor unchanged"
git status --short   # faqat reja fayllari; .env* yo'q

# 4) statik tekshiruvlar (AC-12)
grep -n 'set -euo pipefail' deploy/backup/backup.sh deploy/backup/restore.sh
! grep -nE 'set -x|set -o xtrace' deploy/backup/*.sh
! grep -nE '(^|[;&|[:space:]])(source|\.)[[:space:]]+[^#]*env' deploy/backup/*.sh
grep -n 'compose.*config' deploy/backup/*.sh   # bo'sh yoki faqat `config -q`

# 5) Docs/TASKS (AC-15, AC-16)
grep -n 'deploy/backup/backup.sh' docs/DEPLOY.md
grep -n 'restore.sh --yes' docs/DEPLOY.md
grep -n 'restore.sh --list' docs/DEPLOY.md
grep -n 'BACKUP_RCLONE_REMOTE' docs/DEPLOY.md
grep -n 'crypt' docs/DEPLOY.md
grep -n 'nginx -s reload' docs/DEPLOY.md
! grep -n "find /opt/backups -name 'db-\*.dump'" docs/DEPLOY.md
! grep -n 'tar czf /backup/garage' docs/DEPLOY.md
grep -n -A3 'E-03 · Backup' TASKS.md | grep -n '🔄 Jarayonda:.*#__PR__'
grep -n -- '- \[ \] \*\*E-03' TASKS.md
grep -n '| E. Deploy va operatsiya | 2 | 10 |' TASKS.md
grep -n '| \*\*Jami\*\* | \*\*25\*\* | \*\*46\*\* |' TASKS.md

# 6) monorepo regressiyasi yo'qligi (skriptlar JS kodga tegmaydi, lekin PR qoidasi)
pnpm lint && pnpm test

# 7) post-PR (AC-17, AC-18): gh pr checks <PR>  → "Shellcheck (deploy scripts)" va qolgan job'lar pass;
#    gh pr view <PR> --json body -q .body | grep -E 'test-local.sh|ALL PASSED'
```
