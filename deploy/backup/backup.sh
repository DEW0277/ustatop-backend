#!/usr/bin/env bash
# Daily backup of Postgres (pg_dump -Fc) and the Garage volumes (meta + data) into one dated "backup set".
# Layout:  $BACKUP_DIR/<YYYY-MM-DD_HHMMSS>/{db.dump,garage.tar.gz,SHA256SUMS,MANIFEST}   (UTC, mode 700/600)
# Docs: docs/DEPLOY.md section 6. Plan: docs/plans/issue-44.md.
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_PREFIX=backup
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage: backup.sh [options]

Options (flag > env > default):
  --app-dir DIR         USTATOP_APP_DIR           default /opt/ustatop
  --compose-file FILE   USTATOP_COMPOSE_FILE      default $APP_DIR/docker-compose.prod.yml
  --env-file FILE       USTATOP_ENV_FILE          default $APP_DIR/.env.production
  --project NAME        USTATOP_COMPOSE_PROJECT   default ustatop
  --backup-dir DIR      BACKUP_DIR                default /opt/backups
  --retention-days N    BACKUP_RETENTION_DAYS     default 14 (integer >= 1)
  -h, --help

Environment only:
  BACKUP_RCLONE_REMOTE  named rclone remote, e.g. offsite:ustatop-backups (empty = no offsite copy)
  BACKUP_HELPER_IMAGE   image providing tar (default alpine:3.22)

Exit codes: 0 ok | 1 runtime error | 2 bad usage/config | 3 local backup ok but offsite copy failed
EOF
}

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
REMOTE="${BACKUP_RCLONE_REMOTE:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help) usage; exit 0 ;;
    --retention-days)
      [ $# -ge 2 ] || fail 2 "--retention-days needs a value"
      RETENTION_DAYS=$2
      shift 2
      ;;
    *)
      parse_common_flag "$@"
      if [ "$CONSUMED" -eq 0 ]; then
        usage >&2
        fail 2 "unknown argument: $1"
      fi
      shift "$CONSUMED"
      ;;
  esac
done

# ---- validate everything before touching anything ---------------------------------------------------------
retention_re='^[0-9]+$'
[[ $RETENTION_DAYS =~ $retention_re ]] && [ "$RETENTION_DAYS" -ge 1 ] || fail 2 "retention days must be an integer >= 1"

if [ -n "$REMOTE" ]; then
  # Only a *named* remote from rclone.conf is allowed: inline remotes (":s3,secret_access_key=...:bucket")
  # would put credentials into the command line and the logs.
  remote_re='^[A-Za-z0-9_-]+:[^,=]*$'
  [[ $REMOTE =~ $remote_re ]] || fail 2 "BACKUP_RCLONE_REMOTE must be a named remote (name:path); configure a named remote in rclone.conf"
fi

finalize_config
require_docker

# ---- state for the cleanup trap ---------------------------------------------------------------------------
PARTIAL_DIR=""
STOPPED_GARAGE=0

cleanup() {
  local rc=$?
  trap - EXIT
  if [ "$STOPPED_GARAGE" = 1 ]; then
    warn "restarting garage"
    dcmp start garage >/dev/null 2>&1 || warn "could not restart garage: run 'docker compose -p $PROJECT start garage' manually"
    STOPPED_GARAGE=0
  fi
  if [ -n "$PARTIAL_DIR" ] && [ -d "$PARTIAL_DIR" ]; then
    rm -rf -- "$PARTIAL_DIR"
  fi
  release_lock
  rc=$(normalize_rc "$rc")
  if [ "$rc" -ne 0 ]; then err "backup finished with exit code $rc"; fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

acquire_lock

SET_NAME="$(date -u +%Y-%m-%d_%H%M%S)"
SET_DIR="$BACKUP_DIR/$SET_NAME"
PARTIAL_CANDIDATE="$BACKUP_DIR/.$SET_NAME.partial"
[ ! -e "$SET_DIR" ] || fail 1 "backup set already exists: $SET_DIR (wait one second and retry)"
[ ! -e "$PARTIAL_CANDIDATE" ] || fail 1 "partial directory already exists: $PARTIAL_CANDIDATE"

META_VOL="$(find_volume garage_meta)"
DATA_VOL="$(find_volume garage_data)"

PARTIAL_DIR="$PARTIAL_CANDIDATE"
mkdir "$PARTIAL_DIR"
log "start: set $SET_NAME (project $PROJECT)"

# 1) Postgres. If it is not running this fails here and Garage is not touched.
log "pg_dump"
dcmp exec -T postgres sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' >"$PARTIAL_DIR/db.dump"
[ -s "$PARTIAL_DIR/db.dump" ] || fail 1 "pg_dump produced an empty file"
dcmp exec -T postgres pg_restore --list <"$PARTIAL_DIR/db.dump" >/dev/null || fail 1 "db.dump failed verification (pg_restore --list)"

# 2) Garage: stop for a consistent copy of meta + data, restart right away (also guaranteed by the trap).
if service_is_running garage; then
  log "stopping garage for a consistent copy"
  STOPPED_GARAGE=1
  dcmp stop garage >/dev/null
fi
log "archiving garage volumes"
docker run --rm -v "$META_VOL":/meta:ro -v "$DATA_VOL":/data:ro "$HELPER_IMAGE" \
  tar czf - -C / meta data >"$PARTIAL_DIR/garage.tar.gz"
if [ "$STOPPED_GARAGE" = 1 ]; then
  dcmp start garage >/dev/null
  STOPPED_GARAGE=0
  log "garage started again"
fi
tar tzf "$PARTIAL_DIR/garage.tar.gz" >/dev/null || fail 1 "garage.tar.gz failed verification"

# 3) Manifest + checksums, then publish atomically.
{
  printf 'created_utc=%s\n' "$(now_utc)"
  printf 'project=%s\n' "$PROJECT"
  printf 'app_git_sha=%s\n' "$(git -C "$APP_DIR" rev-parse HEAD 2>/dev/null || echo unknown)"
} >"$PARTIAL_DIR/MANIFEST"
(cd "$PARTIAL_DIR" && sha256_files db.dump garage.tar.gz MANIFEST >SHA256SUMS)
sha256_verify "$PARTIAL_DIR" || fail 1 "checksum self-check failed"
mv "$PARTIAL_DIR" "$SET_DIR"
PARTIAL_DIR=""
log "backup set ready: $SET_DIR"

# 4) Retention: only complete set directories with the exact name pattern, and stale .partial leftovers.
log "retention: keeping $RETENTION_DAYS days"
while IFS= read -r old; do
  [ -n "$old" ] || continue
  log "retention: removing $(basename "$old")"
  rm -rf -- "$old"
done < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name "$SET_NAME_GLOB" -mtime +"$RETENTION_DAYS")
while IFS= read -r old; do
  [ -n "$old" ] || continue
  log "retention: removing stale $(basename "$old")"
  rm -rf -- "$old"
done < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '.*.partial' -mtime +1)

# 5) Offsite copy (copy, never sync: remote copies are not deleted by this script).
OFFSITE_FAILED=0
if [ -z "$REMOTE" ]; then
  warn "BACKUP_RCLONE_REMOTE not set — offsite copy skipped"
elif ! command -v rclone >/dev/null 2>&1; then
  err "rclone not found in PATH; offsite copy to remote '${REMOTE%%:*}' not done (local set kept)"
  OFFSITE_FAILED=1
else
  case "$REMOTE" in
    *: | */) target="$REMOTE$SET_NAME" ;;
    *) target="$REMOTE/$SET_NAME" ;;
  esac
  log "offsite copy to remote '${REMOTE%%:*}'"
  if rclone copy "$SET_DIR" "$target"; then
    log "offsite copy done"
  else
    err "rclone copy to remote '${REMOTE%%:*}' failed (local set kept)"
    OFFSITE_FAILED=1
  fi
fi

if [ "$OFFSITE_FAILED" -ne 0 ]; then
  exit 3
fi
log "done"
