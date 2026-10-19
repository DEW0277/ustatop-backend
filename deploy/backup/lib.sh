# shellcheck shell=bash
# Shared helpers for backup.sh and restore.sh (sourced, not executed). docs/plans/issue-44.md.
# Portable: bash 3.2 (macOS) and bash 5 (Ubuntu). No mapfile, no associative arrays.
#
# The secrets file is never read by these scripts: it is only handed to `docker compose --env-file`.

LOG_PREFIX="${LOG_PREFIX:-script}"
# shellcheck disable=SC2034 # consumed by backup.sh (retention find)
SET_NAME_GLOB='[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9][0-9][0-9][0-9][0-9]'
# shellcheck disable=SC2034 # consumed by restore.sh (set name validation)
SET_NAME_RE='^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}$'

now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { printf '[%s] %s %s\n' "$LOG_PREFIX" "$(now_utc)" "$*"; }
warn() { printf '[%s] %s WARN: %s\n' "$LOG_PREFIX" "$(now_utc)" "$*" >&2; }
err() { printf '[%s] %s ERROR: %s\n' "$LOG_PREFIX" "$(now_utc)" "$*" >&2; }
fail() { # fail <exit-code> <message>
  local code=$1
  shift
  err "$*"
  exit "$code"
}

# ---- configuration: flag > env > default (docs/plans/issue-44.md D2) ----------------------------------------
APP_DIR="${USTATOP_APP_DIR:-/opt/ustatop}"
COMPOSE_FILE=""
ENV_FILE=""
PROJECT="${USTATOP_COMPOSE_PROJECT:-ustatop}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
HELPER_IMAGE="${BACKUP_HELPER_IMAGE:-alpine:3.22}"
CONSUMED=0

# parse_common_flag "$@": if $1 is a shared config flag, store it and set CONSUMED to the number of words used.
parse_common_flag() {
  CONSUMED=0
  case "${1:-}" in
    --app-dir | --compose-file | --env-file | --project | --backup-dir)
      [ $# -ge 2 ] || fail 2 "$1 needs a value"
      case "$1" in
        --app-dir) APP_DIR=$2 ;;
        --compose-file) COMPOSE_FILE=$2 ;;
        --env-file) ENV_FILE=$2 ;;
        --project) PROJECT=$2 ;;
        --backup-dir) BACKUP_DIR=$2 ;;
      esac
      # shellcheck disable=SC2034 # read by the sourcing scripts' argument loops
      CONSUMED=2
      ;;
  esac
}

COMPOSE=()

# finalize_config: apply env/default fallbacks, validate, build the compose command array.
finalize_config() {
  [ -n "$COMPOSE_FILE" ] || COMPOSE_FILE="${USTATOP_COMPOSE_FILE:-$APP_DIR/docker-compose.prod.yml}"
  [ -n "$ENV_FILE" ] || ENV_FILE="${USTATOP_ENV_FILE:-$APP_DIR/.env.production}"

  local project_re='^[a-z0-9][a-z0-9_-]*$' image_re='^[A-Za-z0-9][A-Za-z0-9._/:@-]*$'
  [[ $PROJECT =~ $project_re ]] || fail 2 "invalid compose project name"
  [[ $HELPER_IMAGE =~ $image_re ]] || fail 2 "invalid BACKUP_HELPER_IMAGE"
  [ -n "$BACKUP_DIR" ] || fail 2 "empty backup dir"
  case "$BACKUP_DIR" in
    / | /bin | /etc | /usr | /var | /home | /root | /boot | /dev | /lib | /sbin | /sys | /proc) fail 2 "refusing unsafe backup dir: $BACKUP_DIR" ;;
  esac
  [ -d "$APP_DIR" ] || fail 2 "app dir not found: $APP_DIR"
  [ -r "$COMPOSE_FILE" ] || fail 2 "compose file not readable: $COMPOSE_FILE"
  [ -r "$ENV_FILE" ] || fail 2 "env file not readable: $ENV_FILE"

  COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" -p "$PROJECT" --project-directory "$APP_DIR")
}

require_docker() {
  command -v docker >/dev/null 2>&1 || fail 1 "docker not found in PATH"
  docker compose version >/dev/null 2>&1 || fail 1 "docker compose plugin not available"
}

dcmp() { "${COMPOSE[@]}" "$@"; }

service_is_running() { dcmp ps --status running --services 2>/dev/null | grep -qx "$1"; }

# find_volume <compose volume key>  -> prints the real docker volume name of this project
find_volume() {
  local out count
  out=$(docker volume ls -q \
    --filter "label=com.docker.compose.project=$PROJECT" \
    --filter "label=com.docker.compose.volume=$1")
  count=$(printf '%s' "$out" | grep -c . || true)
  [ "$count" -eq 1 ] || fail 1 "expected exactly one docker volume '$1' in project '$PROJECT', found $count (is the stack created?)"
  printf '%s' "$out"
}

# ---- checksums (sha256sum on Linux, shasum on macOS) ---------------------------------------------------------
sha256_files() { # sha256_files file...   (relative names, run inside the set dir)
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$@"; else shasum -a 256 "$@"; fi
}
sha256_verify() { # sha256_verify <dir>   (verifies SHA256SUMS in <dir>)
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$1" && sha256sum -c SHA256SUMS >/dev/null)
  else
    (cd "$1" && shasum -a 256 -c SHA256SUMS >/dev/null)
  fi
}

# ---- lock (mkdir is atomic and portable; flock does not exist on macOS) --------------------------------------
LOCK_HELD=0
acquire_lock() {
  mkdir -p "$BACKUP_DIR"
  if mkdir "$BACKUP_DIR/.lock" 2>/dev/null; then
    LOCK_HELD=1
  else
    fail 1 "another backup/restore is running, or a previous run was killed: remove $BACKUP_DIR/.lock if no such process exists"
  fi
}
release_lock() {
  if [ "$LOCK_HELD" = 1 ]; then
    rmdir "$BACKUP_DIR/.lock" 2>/dev/null || true
    LOCK_HELD=0
  fi
}

# normalize_rc: map arbitrary command exit codes to the documented ones (0,1,2,3; signals kept).
normalize_rc() {
  case "$1" in
    0 | 2 | 3 | 130 | 143) printf '%s' "$1" ;;
    *) printf '1' ;;
  esac
}
