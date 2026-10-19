#!/usr/bin/env bash
# Local end-to-end test for deploy/backup/backup.sh and restore.sh (docs/plans/issue-44.md, D10).
#
# Run:  /bin/bash deploy/backup/test-local.sh      (works with macOS bash 3.2 and bash 5)
#
# Safety: everything runs in the hard-coded compose project "ustatop-backuptest", inside a temporary APP_DIR
# (copy of docker-compose.prod.yml + deploy/garage with a throwaway .env.production). The developer's own
# stack (project "texnozor") and the real /opt paths are never touched. A trap tears everything down
# (containers, volumes, network, helper image, temp dir) on exit, Ctrl-C or failure.
set -uo pipefail

# The project name is fixed on purpose: not configurable via env or flags.
readonly PROJECT="ustatop-backuptest"
readonly BUCKET="ustatop-uploads"
readonly CURL_IMG="ustatop-backuptest/curl:0"
readonly SET_RE='^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}$'

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_SH="$REPO/deploy/backup/backup.sh"
RESTORE_SH="$REPO/deploy/backup/restore.sh"

TMP=""
APP_DIR=""
BACKUP_DIR=""
LOGS=""
CASES=0
FAILED=0
CASE=""
CASE_FAIL=""
RC=0
CLEANED=0

# per-invocation knobs for run_script (reset after every call)
T_REMOTE=""
T_HELPER="alpine:3.22"
T_PATH=""
T_ENV1="T_NOP=1"

log() { printf '[test] %s\n' "$*"; }
die() { printf '[test] ERROR: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- helpers

dc() {
  docker compose -f "$APP_DIR/docker-compose.prod.yml" --env-file "$APP_DIR/.env.production" \
    -p "$PROJECT" --project-directory "$APP_DIR" "$@"
}

sha256_of_stdin() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1; else shasum -a 256 | cut -d' ' -f1; fi
}

sha_check_dir() { # sha_check_dir DIR  (verifies SHA256SUMS inside DIR)
  if command -v sha256sum >/dev/null 2>&1; then (cd "$1" && sha256sum -c SHA256SUMS >/dev/null 2>&1)
  else (cd "$1" && shasum -a 256 -c SHA256SUMS >/dev/null 2>&1); fi
}

# Run backup.sh / restore.sh with the test's isolated flags. stdout+stderr -> $LOGS/<case>.log (appended) and screen.
# Result code in $RC. Knobs T_* are consumed and reset.
run_script() { # run_script <case> <backup|restore> [args...]
  local cname=$1 which=$2 script logfile
  shift 2
  if [ "$which" = backup ]; then script=$BACKUP_SH; else script=$RESTORE_SH; fi
  logfile="$LOGS/$cname.log"
  if [ "$which" = backup ]; then sleep 1; fi # set names have 1s resolution
  env BACKUP_RCLONE_REMOTE="$T_REMOTE" BACKUP_HELPER_IMAGE="$T_HELPER" PATH="${T_PATH:-$PATH}" "$T_ENV1" \
    "$BASH" "$script" --app-dir "$APP_DIR" --project "$PROJECT" --backup-dir "$BACKUP_DIR" "$@" \
    >>"$logfile" 2>&1
  RC=$?
  tail -n 4 "$logfile" | sed 's/^/    | /'
  T_REMOTE=""; T_HELPER="alpine:3.22"; T_PATH=""; T_ENV1="T_NOP=1"
}

psql_q() { # psql_q <sql>  -> single value on stdout
  dc exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tAq -c "$1"' sh "$1"
}

fingerprint() {
  psql_q "SELECT count(*) || ':' || md5(string_agg(id || '=' || note, ',' ORDER BY id)) FROM backup_probe"
}

s3_put() { # s3_put <key> <body>  -> prints HTTP status
  docker run --rm --network "${PROJECT}_internal" -e AK="$S3_ACCESS_KEY" -e SK="$S3_SECRET_KEY" \
    -e KEY="$1" -e BODY="$2" -e BUCKET="$BUCKET" "$CURL_IMG" sh -c '
      printf "%s" "$BODY" > /tmp/o
      curl -sS -o /dev/null -w "%{http_code}" --aws-sigv4 "aws:amz:us-east-1:s3" --user "$AK:$SK" \
        -H "x-amz-content-sha256: UNSIGNED-PAYLOAD" -T /tmp/o "http://garage:3900/$BUCKET/$KEY"'
}

s3_pub_code() { # public (website) read path, same as nginx uses -> HTTP status
  docker run --rm --network "${PROJECT}_internal" -e KEY="$1" -e BUCKET="$BUCKET" "$CURL_IMG" sh -c '
    curl -sS -o /dev/null -w "%{http_code}" -H "Host: $BUCKET.web.garage.internal" "http://garage:3902/$KEY"'
}

s3_pub_sha() { # sha256 of the object body via the public path
  docker run --rm --network "${PROJECT}_internal" -e KEY="$1" -e BUCKET="$BUCKET" "$CURL_IMG" sh -c '
    curl -sS -H "Host: $BUCKET.web.garage.internal" "http://garage:3902/$KEY" | sha256sum | cut -d" " -f1'
}

# a genuine runtime failure: non-zero, but not "script missing / not executable" (126/127)
rc_fail() { [ "$RC" -ne 0 ] && [ "$RC" -ne 126 ] && [ "$RC" -ne 127 ]; }

service_running() { dc ps --status running --services 2>/dev/null | grep -qx "$1"; }

list_sets() { ls -1 "$BACKUP_DIR" 2>/dev/null | grep -E "$SET_RE" || true; }

new_sets() { # new_sets <before-list>  -> sets that appeared since
  printf '%s\n' "$1" | sort >"$TMP/sets.before"
  list_sets | sort >"$TMP/sets.after"
  comm -13 "$TMP/sets.before" "$TMP/sets.after" | grep -E "$SET_RE" || true
}

count_lines() { if [ -z "$1" ]; then echo 0; else printf '%s\n' "$1" | wc -l | tr -d ' '; fi; }

begin_case() { CASE=$1; CASE_FAIL=""; log "--- case: $CASE"; }
assert() { # assert <reason> <command...>
  local reason=$1
  shift
  if ! "$@"; then CASE_FAIL="${CASE_FAIL}${CASE_FAIL:+; }${reason}"; fi
}
end_case() {
  CASES=$((CASES + 1))
  if [ -z "$CASE_FAIL" ]; then
    echo "PASS: $CASE"
  else
    echo "FAIL: $CASE: $CASE_FAIL"
    FAILED=$((FAILED + 1))
  fi
}

# ---------------------------------------------------------------- cleanup (trap)

cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  [ "$CLEANED" = 1 ] && exit "$rc"
  CLEANED=1
  log "cleanup: removing project $PROJECT"
  if [ -n "$APP_DIR" ] && [ -f "$APP_DIR/.env.production" ]; then
    dc down -v --remove-orphans >/dev/null 2>&1
  fi
  docker image rm -f "$CURL_IMG" >/dev/null 2>&1
  [ -n "$TMP" ] && rm -rf "$TMP"
  local c v
  c=$(docker ps -a --filter "label=com.docker.compose.project=$PROJECT" -q 2>/dev/null | wc -l | tr -d ' ')
  v=$(docker volume ls --filter "label=com.docker.compose.project=$PROJECT" -q 2>/dev/null | wc -l | tr -d ' ')
  if [ "$c" != 0 ] || [ "$v" != 0 ]; then
    echo "FAIL: isolation_cleanup: leftovers: containers=$c volumes=$v"
    [ "$rc" = 0 ] && rc=1
  elif [ "$CASES" -gt 0 ]; then
    echo "PASS: isolation_cleanup"
  fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# ---------------------------------------------------------------- setup

command -v docker >/dev/null 2>&1 || die "docker not found"
docker info >/dev/null 2>&1 || die "docker daemon is not reachable"
command -v openssl >/dev/null 2>&1 || die "openssl not found"

TEXNOZOR_BEFORE=$(docker ps -a --filter "label=com.docker.compose.project=texnozor" --format '{{.ID}} {{.Names}} {{.State}}' | sort)

TMP=$(mktemp -d "${TMPDIR:-/tmp}/ustatop-backuptest.XXXXXX") || die "mktemp failed"
APP_DIR="$TMP/ustatop"
BACKUP_DIR="$TMP/backups"
LOGS="$TMP/logs"
mkdir -p "$APP_DIR/deploy" "$LOGS"
cp "$REPO/docker-compose.prod.yml" "$APP_DIR/"
cp -R "$REPO/deploy/garage" "$APP_DIR/deploy/garage"

POSTGRES_USER=ustatop
POSTGRES_DB=ustatop
POSTGRES_PASSWORD=$(openssl rand -hex 32)
S3_ACCESS_KEY="GK$(openssl rand -hex 12)"
S3_SECRET_KEY=$(openssl rand -hex 32)
GARAGE_RPC_SECRET=$(openssl rand -hex 32)
GARAGE_ADMIN_TOKEN=$(openssl rand -hex 32)
SENTINEL_RCLONE="sentinel-$(openssl rand -hex 8)"
(
  umask 077
  cat >"$APP_DIR/.env.production" <<EOF
POSTGRES_USER=$POSTGRES_USER
POSTGRES_DB=$POSTGRES_DB
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DOMAIN=backuptest.invalid
S3_ACCESS_KEY=$S3_ACCESS_KEY
S3_SECRET_KEY=$S3_SECRET_KEY
S3_BUCKET=$BUCKET
GARAGE_RPC_SECRET=$GARAGE_RPC_SECRET
GARAGE_ADMIN_TOKEN=$GARAGE_ADMIN_TOKEN
GARAGE_CAPACITY=1000000000
EOF
)

# R3: bind mounts from the temp dir must be visible to Docker; fail early with a clear message.
docker run --rm -v "$APP_DIR/deploy/garage:/probe:ro" alpine:3.22 test -f /probe/garage.toml \
  || die "Docker cannot bind-mount $APP_DIR (set TMPDIR to a directory under \$HOME and retry)"

log "stale state from an earlier run (project $PROJECT only)"
dc down -v --remove-orphans >/dev/null 2>&1
docker image rm -f "$CURL_IMG" >/dev/null 2>&1

log "building curl helper image"
printf 'FROM alpine:3.22\nRUN apk add --no-cache curl >/dev/null\n' \
  | docker build -q -t "$CURL_IMG" - >/dev/null || die "cannot build curl helper image"

log "starting postgres + garage"
dc up -d --wait postgres garage >"$LOGS/setup.log" 2>&1 || { cat "$LOGS/setup.log"; die "compose up failed"; }
dc run --rm --no-deps garage-init >>"$LOGS/setup.log" 2>&1 || { tail -n 20 "$LOGS/setup.log"; die "garage-init failed"; }

log "seeding postgres and garage"
psql_q "CREATE TABLE backup_probe(id int primary key, note text); INSERT INTO backup_probe SELECT g, md5(g::text) FROM generate_series(1,100) g;" >/dev/null \
  || die "seeding postgres failed"
PROBE_BODY=$(head -c 60000 /dev/urandom | base64 | tr -d '\n' | head -c 80000)
PROBE_SHA=$(printf '%s' "$PROBE_BODY" | sha256_of_stdin)
FP0=$(fingerprint)
CODE=$(s3_put probe.txt "$PROBE_BODY")
[ "$CODE" = 200 ] || die "garage put returned HTTP $CODE (curl --aws-sigv4 not accepted?)"
[ "$(s3_pub_sha probe.txt)" = "$PROBE_SHA" ] || die "garage public read does not return the uploaded object"
log "seed ok (fingerprint $FP0)"

SET1=""

# ---------------------------------------------------------------- backup cases

case_backup_ok() {
  begin_case backup_ok
  local before new d
  before=$(list_sets)
  run_script backup_ok backup
  assert "backup.sh exit 0 (got $RC)" [ "$RC" -eq 0 ]
  new=$(new_sets "$before")
  assert "exactly one new set (got $(count_lines "$new"))" [ "$(count_lines "$new")" -eq 1 ]
  SET1=$new
  d="$BACKUP_DIR/$SET1"
  for f in db.dump garage.tar.gz SHA256SUMS MANIFEST; do
    assert "missing $f" test -s "$d/$f"
  done
  assert "sha256 check" sha_check_dir "$d"
  assert "pg_restore --list reads db.dump" dc exec -T postgres pg_restore --list <"$d/db.dump" >/dev/null
  local bad
  bad=$(tar tzf "$d/garage.tar.gz" 2>/dev/null | grep -vE '^(meta|data)(/|$)' || true)
  assert "tar has only meta/ and data/ entries" [ -z "$bad" ]
  assert "tar lists meta/" sh -c "tar tzf '$d/garage.tar.gz' | grep -q '^meta/'"
  assert "dir mode 700" [ "$(ls -ld "$d" | cut -c1-10)" = "drwx------" ]
  for f in db.dump garage.tar.gz SHA256SUMS MANIFEST; do
    assert "$f mode 600" [ "$(ls -l "$d/$f" | cut -c1-10)" = "-rw-------" ]
  done
  assert "no .partial leftovers" [ -z "$(ls -A "$BACKUP_DIR" | grep partial || true)" ]
  assert "garage running again" service_running garage
  end_case
}

case_backup_retention() {
  begin_case backup_retention
  mkdir -p "$BACKUP_DIR/2020-01-01_000000" "$BACKUP_DIR/.x.partial" "$BACKUP_DIR/keep-me"
  echo x >"$BACKUP_DIR/2020-01-01_000000/db.dump"
  echo x >"$BACKUP_DIR/db-2020-01-01.dump"
  touch -t 202001010000 "$BACKUP_DIR/2020-01-01_000000/db.dump" "$BACKUP_DIR/db-2020-01-01.dump"
  touch -t 202001010000 "$BACKUP_DIR/2020-01-01_000000" "$BACKUP_DIR/.x.partial" "$BACKUP_DIR/keep-me"
  local before new
  before=$(list_sets)

  run_script backup_retention backup --retention-days 0
  assert "--retention-days 0 -> exit 2 (got $RC)" [ "$RC" -eq 2 ]
  run_script backup_retention backup --retention-days abc
  assert "--retention-days abc -> exit 2 (got $RC)" [ "$RC" -eq 2 ]
  assert "nothing deleted on invalid retention" test -d "$BACKUP_DIR/2020-01-01_000000" -a -d "$BACKUP_DIR/.x.partial"
  assert "no set created on invalid retention" [ -z "$(new_sets "$before")" ]

  run_script backup_retention backup --retention-days 14
  assert "backup exit 0 (got $RC)" [ "$RC" -eq 0 ]
  new=$(new_sets "$before")
  assert "old fake set removed" test ! -e "$BACKUP_DIR/2020-01-01_000000"
  assert "old .partial removed" test ! -e "$BACKUP_DIR/.x.partial"
  assert "keep-me/ untouched" test -d "$BACKUP_DIR/keep-me"
  assert "db-2020-01-01.dump untouched" test -f "$BACKUP_DIR/db-2020-01-01.dump"
  assert "new set kept" [ "$(count_lines "$new")" -eq 1 ]
  assert "first set kept" test -d "$BACKUP_DIR/$SET1"
  end_case
}

case_backup_fail_pg() {
  begin_case backup_fail_pg
  mkdir -p "$BACKUP_DIR/2020-01-02_000000"
  echo x >"$BACKUP_DIR/2020-01-02_000000/db.dump"
  touch -t 202001020000 "$BACKUP_DIR/2020-01-02_000000/db.dump" "$BACKUP_DIR/2020-01-02_000000"
  dc stop postgres >/dev/null 2>&1
  local before
  before=$(list_sets)
  run_script backup_fail_pg backup --retention-days 14
  assert "backup fails (got exit $RC)" rc_fail
  assert "no new complete set" [ -z "$(new_sets "$before")" ]
  assert "retention did not run (old fake set kept)" test -d "$BACKUP_DIR/2020-01-02_000000"
  assert "no .partial leftovers" [ -z "$(ls -A "$BACKUP_DIR" | grep partial || true)" ]
  assert "garage still running" service_running garage
  dc up -d --wait postgres >/dev/null 2>&1
  assert "postgres back up" service_running postgres
  rm -rf "$BACKUP_DIR/2020-01-02_000000"
  end_case
}

case_backup_fail_garage_restart() {
  begin_case backup_fail_garage_restart
  local before
  before=$(list_sets)
  T_HELPER="ustatop-backuptest/does-not-exist:0"
  run_script backup_fail_garage_restart backup
  assert "backup fails (got exit $RC)" rc_fail
  assert "no new complete set" [ -z "$(new_sets "$before")" ]
  assert "garage running after failure (trap)" service_running garage
  end_case
}

case_offsite_skip() {
  begin_case offsite_skip
  run_script offsite_skip backup
  assert "exit 0 (got $RC)" [ "$RC" -eq 0 ]
  assert "log warns about BACKUP_RCLONE_REMOTE" grep -q 'BACKUP_RCLONE_REMOTE' "$LOGS/offsite_skip.log"
  end_case
}

make_rclone_stub() {
  mkdir -p "$TMP/stubbin"
  cat >"$TMP/stubbin/rclone" <<'EOF'
#!/bin/sh
printf '%s\n' "$@" > "$STUB_DIR/rclone.args"
rc=0
[ -f "$STUB_DIR/rclone.rc" ] && rc=$(cat "$STUB_DIR/rclone.rc")
exit "$rc"
EOF
  chmod +x "$TMP/stubbin/rclone"
}

case_offsite_stub() {
  begin_case offsite_stub
  make_rclone_stub
  local before new args
  export STUB_DIR="$TMP"
  rm -f "$TMP/rclone.args" "$TMP/rclone.rc"

  # (a) success
  before=$(list_sets)
  T_REMOTE="offsite:ustatop-backups"
  T_PATH="$TMP/stubbin:$PATH"
  T_ENV1="RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY=$SENTINEL_RCLONE"
  run_script offsite_stub backup
  assert "(a) exit 0 (got $RC)" [ "$RC" -eq 0 ]
  new=$(new_sets "$before")
  args=$(cat "$TMP/rclone.args" 2>/dev/null || true)
  assert "(a) rclone called as: copy <set dir> offsite:ustatop-backups/<set>" \
    [ "$args" = "$(printf 'copy\n%s\noffsite:ustatop-backups/%s' "$BACKUP_DIR/$new" "$new")" ]

  # (b) stub fails -> exit 3, local set kept
  echo 1 >"$TMP/rclone.rc"
  before=$(list_sets)
  T_REMOTE="offsite:ustatop-backups"
  T_PATH="$TMP/stubbin:$PATH"
  T_ENV1="RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY=$SENTINEL_RCLONE"
  run_script offsite_stub backup
  assert "(b) exit 3 (got $RC)" [ "$RC" -eq 3 ]
  new=$(new_sets "$before")
  assert "(b) local set kept" test -s "$BACKUP_DIR/$new/db.dump"
  rm -f "$TMP/rclone.rc"

  # (c) remote configured, rclone not in PATH -> exit 3 (only checkable when rclone is not installed)
  if command -v rclone >/dev/null 2>&1; then
    log "(c) skipped: a real rclone is installed on this machine"
  else
    before=$(list_sets)
    T_REMOTE="offsite:ustatop-backups"
    run_script offsite_stub backup
    assert "(c) exit 3 (got $RC)" [ "$RC" -eq 3 ]
    new=$(new_sets "$before")
    assert "(c) local set kept" test -s "$BACKUP_DIR/$new/db.dump"
  fi

  # (d) inline remote with credentials -> exit 2, nothing created
  before=$(list_sets)
  T_REMOTE=":s3,secret_access_key=$SENTINEL_RCLONE:bucket"
  T_PATH="$TMP/stubbin:$PATH"
  run_script offsite_stub backup
  assert "(d) inline remote -> exit 2 (got $RC)" [ "$RC" -eq 2 ]
  assert "(d) no new set" [ -z "$(new_sets "$before")" ]
  # (e) other malformed remotes are rejected before anything happens, and the remote path is never logged
  local bad
  for bad in "plainname" "a,b:c" "offsite:path=x" ":s3:bucket" "-x:y"; do
    before=$(list_sets)
    T_REMOTE=$bad
    T_PATH="$TMP/stubbin:$PATH"
    run_script offsite_stub backup
    assert "(e) remote '$bad' -> exit 2 (got $RC)" [ "$RC" -eq 2 ]
    assert "(e) remote '$bad': no new set" [ -z "$(new_sets "$before")" ]
  done
  assert "(e) remote path not echoed to the log" sh -c "! grep -q 'ustatop-backups' '$LOGS/offsite_stub.log'"
  assert "(e) rclone sentinel never reaches rclone argv" sh -c "! grep -qF -- '$SENTINEL_RCLONE' '$TMP/rclone.args'"
  unset STUB_DIR
  end_case
}

# ---------------------------------------------------------------- restore cases

mutate_state() { # damage the data after the backup: delete rows + add a new object
  psql_q "DELETE FROM backup_probe WHERE id <= 50" >/dev/null
  s3_put after-backup.txt "uploaded after the backup" >/dev/null
}

assert_restored() { # data is back to the state captured in SET1
  assert "postgres fingerprint restored" [ "$(fingerprint 2>/dev/null)" = "$FP0" ]
  assert "probe.txt restored (sha256 via public path)" [ "$(s3_pub_sha probe.txt)" = "$PROBE_SHA" ]
  assert "after-backup.txt is gone (404)" [ "$(s3_pub_code after-backup.txt)" = 404 ]
}

case_restore_requires_yes() {
  begin_case restore_requires_yes
  mutate_state
  local fp_mut
  fp_mut=$(fingerprint)
  assert "state is really damaged before the test" [ "$fp_mut" != "$FP0" ]

  run_script restore_requires_yes restore "$SET1"
  assert "restore without --yes -> exit 2 (got $RC)" [ "$RC" -eq 2 ]
  assert "postgres fingerprint unchanged" [ "$(fingerprint)" = "$fp_mut" ]
  assert "after-backup.txt still there" [ "$(s3_pub_code after-backup.txt)" = 200 ]
  assert "garage running" service_running garage
  assert "postgres running" service_running postgres

  run_script restore_requires_yes restore --list
  assert "--list exit 0 (got $RC)" [ "$RC" -eq 0 ]
  assert "--list prints the set name" grep -q "$SET1" "$LOGS/restore_requires_yes.log"
  assert "--list changed nothing" [ "$(fingerprint)" = "$fp_mut" ]
  end_case
}

case_restore_rejects_corrupt() {
  begin_case restore_rejects_corrupt
  local fp_mut bad="$TMP/corrupt/$SET1"
  fp_mut=$(fingerprint)

  # (a) one byte appended to db.dump -> checksum mismatch
  mkdir -p "$TMP/corrupt"
  cp -R "$BACKUP_DIR/$SET1" "$bad"
  printf 'x' >>"$bad/db.dump"
  run_script restore_rejects_corrupt restore --yes "$bad"
  assert "(a) corrupt db.dump -> failure (got exit $RC)" rc_fail
  assert "(a) postgres fingerprint unchanged" [ "$(fingerprint)" = "$fp_mut" ]
  assert "(a) garage running (nothing stopped)" service_running garage
  assert "(a) after-backup.txt still there" [ "$(s3_pub_code after-backup.txt)" = 200 ]

  # (b) archive with an absolute path entry (valid checksums!) -> rejected before anything destructive
  rm -rf "$TMP/corrupt"
  mkdir -p "$TMP/corrupt" "$TMP/evil-src"
  cp -R "$BACKUP_DIR/$SET1" "$bad"
  echo evil >"$TMP/evil-src/evil.txt"
  tar czPf "$bad/garage.tar.gz" "$TMP/evil-src/evil.txt" 2>/dev/null
  (cd "$bad" && sha256_files db.dump garage.tar.gz MANIFEST >SHA256SUMS)
  run_script restore_rejects_corrupt restore --yes "$bad"
  assert "(b) unsafe tar entry -> failure (got exit $RC)" rc_fail
  assert "(b) postgres fingerprint unchanged" [ "$(fingerprint)" = "$fp_mut" ]
  assert "(b) garage running" service_running garage
  assert "(b) after-backup.txt still there" [ "$(s3_pub_code after-backup.txt)" = 200 ]
  rm -rf "$TMP/corrupt" "$TMP/evil-src"
  end_case
}

case_restore_in_place() {
  begin_case restore_in_place
  # state is still damaged from restore_requires_yes
  run_script restore_in_place restore --yes "$SET1"
  assert "restore --yes exit 0 (got $RC)" [ "$RC" -eq 0 ]
  assert_restored
  assert "garage running" service_running garage
  assert "postgres running" service_running postgres
  end_case
}

case_restore_fresh_volumes() {
  begin_case restore_fresh_volumes
  dc down -v --remove-orphans >/dev/null 2>&1
  dc up -d --wait postgres >/dev/null 2>&1
  dc up -d garage >/dev/null 2>&1
  assert "fresh postgres is empty" [ -z "$(psql_q "SELECT to_regclass('backup_probe')" 2>/dev/null)" ]
  run_script restore_fresh_volumes restore --yes latest
  assert "restore --yes latest exit 0 (got $RC)" [ "$RC" -eq 0 ]
  assert_restored
  assert "garage running" service_running garage
  end_case
}

case_no_secrets_in_logs() {
  begin_case no_secrets_in_logs
  local name val
  for name in POSTGRES_PASSWORD S3_SECRET_KEY GARAGE_RPC_SECRET GARAGE_ADMIN_TOKEN SENTINEL_RCLONE; do
    eval "val=\$$name"
    assert "$name value found in a log" sh -c "! cat '$LOGS'/*.log | grep -qF -- '$val'"
  done
  end_case
}

case_isolation() {
  begin_case isolation
  local self="$REPO/deploy/backup/test-local.sh" optpath="/op""t/"
  assert "project constant is hard-coded" grep -q '^readonly PROJECT="ustatop-backuptest"$' "$self"
  assert "no call with a non-test project or /opt path" \
    sh -c "! grep -nE -- '(--project|-p)[ =]+(\"?ustatop\"?|texnozor)( |$)|--(app|backup)-dir[ =]+$optpath' '$self'"
  local now
  now=$(docker ps -a --filter "label=com.docker.compose.project=texnozor" --format '{{.ID}} {{.Names}} {{.State}}' | sort)
  assert "texnozor containers unchanged" [ "$now" = "$TEXNOZOR_BEFORE" ]
  end_case
}

# ---------------------------------------------------------------- run

case_backup_ok
case_backup_retention
case_backup_fail_pg
case_backup_fail_garage_restart
case_offsite_skip
case_offsite_stub
case_restore_requires_yes
case_restore_rejects_corrupt
case_restore_in_place
case_restore_fresh_volumes
case_no_secrets_in_logs
case_isolation

echo
if [ "$FAILED" -gt 0 ]; then
  echo "FAILED: $FAILED of $CASES cases"
  exit 1
fi
echo "ALL PASSED ($CASES cases)"
