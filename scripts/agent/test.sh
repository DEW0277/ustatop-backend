#!/usr/bin/env bash
# Loyiha testlarini avtomatik aniqlab ishga tushiradi (pipeline, CI va agentlar uchun bitta kirish nuqtasi).
# Aniq buyruq kerak bo'lsa: AGENT_TEST_CMD="pnpm test && pnpm lint" (GitHub: Settings → Variables).
# Exit: 0 = o'tdi, 1 = yiqildi, 5 = test buyrug'i topilmadi.
set -uo pipefail

if [ -n "${AGENT_TEST_CMD:-}" ]; then
  echo "\$ $AGENT_TEST_CMD"; bash -c "$AGENT_TEST_CMD"; exit $?
fi

if [ -f package.json ]; then
  pm=npm
  [ -f pnpm-lock.yaml ] && pm=pnpm
  [ -f yarn.lock ] && pm=yarn
  { [ -f bun.lockb ] || [ -f bun.lock ]; } && pm=bun
  has() { node -e 'const s=(require("./package.json").scripts)||{};process.exit(s[process.argv[1]]?0:1)' "$1"; }
  rc=0; ran=0
  for s in lint typecheck; do
    if has "$s"; then echo "\$ $pm run $s"; ran=1; "$pm" run "$s" || rc=1; fi
  done
  if has test; then echo "\$ $pm test"; ran=1; CI=true "$pm" test || rc=1; fi
  [ "$ran" -eq 1 ] || { echo "NO_TESTS: package.json'da lint/typecheck/test skriptlari yo'q"; exit 5; }
  exit "$rc"
fi

if [ -f pyproject.toml ] || [ -f pytest.ini ] || [ -f setup.cfg ]; then echo "\$ python -m pytest -q"; python -m pytest -q; exit $?; fi
if [ -f go.mod ]; then echo "\$ go test ./..."; go test ./...; exit $?; fi
if [ -f Cargo.toml ]; then echo "\$ cargo test"; cargo test; exit $?; fi
if grep -q '^test:' Makefile 2>/dev/null; then echo "\$ make test"; make test; exit $?; fi

echo "NO_TESTS: test buyrug'i topilmadi (AGENT_TEST_CMD ni o'rnating)"
exit 5
