#!/usr/bin/env bash
# Restore Postgres and the Garage volumes from a backup set made by backup.sh.
# DESTRUCTIVE: replaces the whole database content and the Garage meta/data volumes. Requires --yes.
# Run backup.sh first if the current state matters (restore does not take a safety backup itself).
# Docs: docs/DEPLOY.md section 6. Plan: docs/plans/issue-44.md.
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC2034 # read by lib.sh log helpers
LOG_PREFIX=restore
# shellcheck source-path=SCRIPTDIR source=lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat <<'EOF'
Usage: restore.sh [options] [--list] [--yes] <SET>

  SET   a set name (YYYY-MM-DD_HHMMSS), "latest", or a path to a set directory

Options (flag > env > default):
  --app-dir DIR         USTATOP_APP_DIR           default /opt/ustatop
  --compose-file FILE   USTATOP_COMPOSE_FILE      default $APP_DIR/docker-compose.prod.yml
  --env-file FILE       USTATOP_ENV_FILE          default $APP_DIR/.env.production
  --project NAME        USTATOP_COMPOSE_PROJECT   default ustatop
  --backup-dir DIR      BACKUP_DIR                default /opt/backups
  --list                list available sets (oldest first) with sizes; changes nothing
  --yes                 confirm the destructive restore (without it nothing is changed, exit 2)
  -h, --help

Environment: BACKUP_HELPER_IMAGE (image providing tar/find, default alpine:3.22)
Exit codes: 0 ok | 1 runtime error | 2 bad usage/config/--yes missing
EOF
}

DO_LIST=0
CONFIRMED=0
SET_ARG=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help) usage; exit 0 ;;
    --list) DO_LIST=1; shift ;;
    --yes) CONFIRMED=1; shift ;;
    -*)
      parse_common_flag "$@"
      if [ "$CONSUMED" -eq 0 ]; then
        usage >&2
        fail 2 "unknown option: $1"
      fi
      shift "$CONSUMED"
      ;;
    *)
      [ -z "$SET_ARG" ] || fail 2 "only one SET may be given"
      SET_ARG=$1
      shift
      ;;
  esac
done

finalize_config

sorted_sets() { # complete set names (directories only), oldest first
  local d name
  for d in "$BACKUP_DIR"/*/; do
    [ -d "$d" ] || continue # unmatched glob stays literal
    name=${d%/}
    [ ! -L "$name" ] || continue
    name=${name##*/}
    if [[ $name =~ $SET_NAME_RE ]]; then
      printf '%s\n' "$name"
    fi
  done | sort
}

if [ "$DO_LIST" = 1 ]; then
  count=0
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    count=$((count + 1))
    printf '%s  %s\n' "$name" "$(du -sh "$BACKUP_DIR/$name" 2>/dev/null | cut -f1)"
  done < <(sorted_sets)
  [ "$count" -gt 0 ] || echo "(no backup sets in $BACKUP_DIR)"
  exit 0
fi

[ -n "$SET_ARG" ] || { usage >&2; fail 2 "missing SET (use --list to see available sets)"; }
require_docker

# ---- resolve the set ---------------------------------------------------------------------------------------
set_re="$SET_NAME_RE"
if [ "$SET_ARG" = latest ]; then
  SET_NAME="$(sorted_sets | tail -n 1)"
  [ -n "$SET_NAME" ] || fail 2 "no backup sets in $BACKUP_DIR"
  SET_DIR="$BACKUP_DIR/$SET_NAME"
elif [[ $SET_ARG =~ $set_re ]]; then
  SET_NAME=$SET_ARG
  SET_DIR="$BACKUP_DIR/$SET_NAME"
else
  [ -d "$SET_ARG" ] || fail 2 "not a set name, 'latest', or directory: $SET_ARG"
  SET_DIR="$(cd "$SET_ARG" && pwd)"
  SET_NAME="$(basename "$SET_DIR")"
fi
[ -d "$SET_DIR" ] || fail 2 "backup set not found: $SET_DIR"

# ---- 1) integrity: all files present, checksums match ------------------------------------------------------
for f in db.dump garage.tar.gz SHA256SUMS; do
  [ -s "$SET_DIR/$f" ] || fail 1 "backup set is incomplete: $f missing or empty in $SET_DIR"
done
for f in db.dump garage.tar.gz; do
  grep -Eq "^[0-9a-f]{64}  \*?$(printf '%s' "$f" | sed 's/\./\\./g')\$" "$SET_DIR/SHA256SUMS" \
    || fail 1 "SHA256SUMS does not cover $f"
done
sha256_verify "$SET_DIR" || fail 1 "checksum verification FAILED for $SET_DIR: refusing to restore"
log "checksums ok for set $SET_NAME"

# ---- 2) archive safety: only meta/ and data/, no absolute paths, no '..', no links -------------------------
tar tzf "$SET_DIR/garage.tar.gz" >/dev/null 2>&1 || fail 1 "garage.tar.gz is not a readable archive"
entries=0
while IFS= read -r entry; do
  entries=$((entries + 1))
  case "$entry" in
    /* | ../* | */../* | */.. | ..) fail 1 "unsafe path in garage.tar.gz: refusing to restore" ;;
    meta | meta/* | data | data/*) ;;
    *) fail 1 "unexpected entry in garage.tar.gz (only meta/ and data/ allowed): refusing to restore" ;;
  esac
done < <(tar tzf "$SET_DIR/garage.tar.gz")
[ "$entries" -gt 0 ] || fail 1 "garage.tar.gz is empty"
while IFS= read -r line; do
  case "$line" in
    l* | h*) fail 1 "garage.tar.gz contains links: refusing to restore" ;;
  esac
done < <(tar tvzf "$SET_DIR/garage.tar.gz")
log "archive listing ok ($entries entries)"

# ---- 3) confirmation ---------------------------------------------------------------------------------------
if [ "$CONFIRMED" != 1 ]; then
  err "--yes not given. This would REPLACE all data in project '$PROJECT' (Postgres database and Garage meta/data volumes) with set $SET_NAME."
  err "Nothing was changed. Run backup.sh first if the current state matters, then repeat with --yes."
  exit 2
fi

# ---- state for the cleanup trap ----------------------------------------------------------------------------
STOPPED_GARAGE=0
APP_STOPPED=""

cleanup() {
  local rc=$?
  trap - EXIT
  if [ "$STOPPED_GARAGE" = 1 ]; then
    warn "restarting garage"
    dcmp start garage >/dev/null 2>&1 || warn "could not restart garage: run 'docker compose -p $PROJECT start garage' manually"
    STOPPED_GARAGE=0
  fi
  release_lock
  rc=$(normalize_rc "$rc")
  if [ "$rc" -ne 0 ]; then
    err "restore FAILED (exit $rc). The database and/or Garage may be partially restored."
    if [ -n "$APP_STOPPED" ]; then
      err "NOT restarted on purpose:$APP_STOPPED. Fix the problem (or re-run restore), then: docker compose -p $PROJECT start$APP_STOPPED"
    fi
  fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

acquire_lock

# ---- 4) stop only the app services that are running (remember them) ---------------------------------------
for svc in backend web; do
  if service_is_running "$svc"; then
    APP_STOPPED="$APP_STOPPED $svc"
  fi
done
if [ -n "$APP_STOPPED" ]; then
  log "stopping:$APP_STOPPED"
  # shellcheck disable=SC2086 # intentional word splitting of a short service-name list
  dcmp stop $APP_STOPPED >/dev/null
fi

# ---- 5) Postgres -------------------------------------------------------------------------------------------
log "starting postgres"
dcmp up -d --wait postgres >/dev/null
dcmp exec -T postgres pg_restore --list <"$SET_DIR/db.dump" >/dev/null || fail 1 "db.dump failed verification (pg_restore --list)"
log "restoring database"
# shellcheck disable=SC2016 # $POSTGRES_* must expand inside the container, not on the host
dcmp exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner --single-transaction --exit-on-error -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <"$SET_DIR/db.dump"
log "database restored"

# ---- 6) Garage ---------------------------------------------------------------------------------------------
dcmp up -d --no-deps garage >/dev/null # makes sure the volumes exist (fresh server)
STOPPED_GARAGE=1
dcmp stop garage >/dev/null
META_VOL="$(find_volume garage_meta)"
DATA_VOL="$(find_volume garage_data)"
log "restoring garage volumes"
docker run --rm -i -v "$META_VOL":/meta -v "$DATA_VOL":/data "$HELPER_IMAGE" \
  sh -c 'set -e; find /meta /data -mindepth 1 -delete; tar xzf - -C /' <"$SET_DIR/garage.tar.gz"
dcmp start garage >/dev/null
STOPPED_GARAGE=0
log "garage started; running garage-init"
dcmp run --rm --no-deps garage-init >/dev/null

# ---- 7) bring back what we stopped ------------------------------------------------------------------------
if [ -n "$APP_STOPPED" ]; then
  log "starting:$APP_STOPPED"
  # shellcheck disable=SC2086
  dcmp start $APP_STOPPED >/dev/null
  APP_STOPPED=""
fi

log "restore OK (set $SET_NAME)"
