#!/usr/bin/env bash
# agent pipeline — bitta issue uchun Planner → Coder → Verifier sikli (headless).
# GitHub Actions'da ham, Mac'da ham bir xil ishlaydi.
#
#   scripts/agent/pipeline.sh <issue-number>
#
# Rollar:
#   plan   → Claude Fable 5.1  (architect)   — docs/plans/issue-N.md
#   code   → Gemini (agy-run)  oddiy vazifalar | Claude Sonnet 5.5 high (implementer) murakkab/xavfsizlik
#   verify → Claude Opus 5.5   (verifier)    — har safar YANGI sessiya, faqat reja + diff + testlar
#   fix    → Claude Sonnet 5.5 (implementer) — verifier topgan muammolar
#
# To'xtash shartlari: AGENT_TIME_LIMIT_MIN (30), AGENT_MAX_FIX_ROUNDS (2), AGENT_MAX_COST_USD (8).
# Xatoda: issue → agent:blocked, sababi izohda, egasi teg qilinadi, branch push qilinadi, exit 3.
set -uo pipefail

ISSUE="${1:?Foydalanish: pipeline.sh <issue-number>}"
[[ "$ISSUE" =~ ^[0-9]+$ ]] || { echo "Issue raqami noto'g'ri: $ISSUE" >&2; exit 64; }

PLANNER_MODEL="${PLANNER_MODEL:-claude-fable-5-1}"
COMPLEX_MODEL="${COMPLEX_CODER_MODEL:-claude-sonnet-5-5}"
VERIFIER_MODEL="${VERIFIER_MODEL:-claude-opus-5-5}"
TIME_LIMIT_MIN="${AGENT_TIME_LIMIT_MIN:-30}"
MAX_FIX="${AGENT_MAX_FIX_ROUNDS:-2}"
MAX_COST="${AGENT_MAX_COST_USD:-8}"
AGY_TIMEOUT="${AGY_TIMEOUT:-1200}"
BRANCH="agent/issue-$ISSUE"
RUN_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/agent-run-issue-$ISSUE"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$RUN_DIR"
: >"$RUN_DIR/metrics.jsonl"
rm -f "$RUN_DIR/blocked"
START_TS="$(date +%s)"
TOTAL_COST=0
STAGE="init"

command -v gh >/dev/null || { echo "gh kerak" >&2; exit 1; }
command -v claude >/dev/null || { echo "claude (Claude Code CLI) kerak" >&2; exit 1; }
command -v node >/dev/null || { echo "node kerak" >&2; exit 1; }
REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
OWNER="${AGENT_OWNER:-${REPO%%/*}}"
BASE="${AGENT_BASE_BRANCH:-$(gh repo view "$REPO" --json defaultBranchRef -q .defaultBranchRef.name)}"

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
elapsed_min() { echo $(( ($(date +%s) - START_TS) / 60 )); }

# ── Kuzatuv: har bir bosqich bitta JSON qatori ───────────────────────────────
metric() { # stage agent model duration_s cost_usd turns result
  local line
  line=$(node -e 'const [s,a,m,d,c,t,r,i]=process.argv.slice(1);process.stdout.write(JSON.stringify({ts:new Date().toISOString(),issue:i,stage:s,agent:a,model:m,duration_s:Number(d)||0,cost_usd:c===""?null:Number(c),turns:t===""?null:Number(t),result:r}))' \
    "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$ISSUE")
  echo "$line" >>"$RUN_DIR/metrics.jsonl"
  if [ -z "${CI:-}" ]; then mkdir -p "${AGENT_LOG_DIR:-$HOME/.agent-logs}" && echo "$line" >>"${AGENT_LOG_DIR:-$HOME/.agent-logs}/agent-runs.jsonl"; fi
}

metrics_table() {
  node -e '
    const rows=require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(JSON.parse);
    let out="| Bosqich | Agent | Model | Vaqt | Xarajat | Natija |\n|---|---|---|---|---|---|\n";
    let cost=0,dur=0;
    for(const r of rows){cost+=r.cost_usd||0;dur+=r.duration_s||0;
      out+=`| ${r.stage} | ${r.agent} | \`${r.model}\` | ${Math.round(r.duration_s/60*10)/10} min | ${r.cost_usd==null?"—":"$"+r.cost_usd.toFixed(2)} | ${r.result} |\n`;}
    out+=`| **Jami** | | | **${Math.round(dur/60*10)/10} min** | **$${cost.toFixed(2)}** | |\n`;
    process.stdout.write(out);' "$RUN_DIR/metrics.jsonl"
}

# ── GitHub holatlari (5 status + blocked) ────────────────────────────────────
set_status() {
  local new="$1" cur l rm=()
  cur="$(gh issue view "$ISSUE" -R "$REPO" --json labels -q '.labels[].name' 2>/dev/null || true)"
  for l in agent-ready agent:planning agent:coding agent:verifying agent:review agent:blocked needs-info; do
    [ "$l" = "$new" ] && continue
    if printf '%s\n' "$cur" | grep -qx "$l"; then rm+=(--remove-label "$l"); fi
  done
  gh issue edit "$ISSUE" -R "$REPO" ${rm[@]+"${rm[@]}"} --add-label "$new" >/dev/null 2>&1 || log "ogohlantirish: label yangilanmadi ($new)"
}

comment() { gh issue comment "$ISSUE" -R "$REPO" --body-file "$1" >/dev/null 2>&1 || log "ogohlantirish: izoh yozilmadi"; }

push_branch() {
  if [ "$(git rev-list --count "origin/$BASE..HEAD" 2>/dev/null || echo 0)" -gt 0 ]; then
    git push -u origin "HEAD:$BRANCH" >/dev/null 2>&1 || log "ogohlantirish: branch push bo'lmadi"
  fi
}

# ── Xatolarni boshqarish ─────────────────────────────────────────────────────
blocked() { # reason [label] [extra_file]
  local reason="$1" label="${2:-agent:blocked}" extra="${3:-}" body="$RUN_DIR/blocked-comment.md"
  log "BLOCKED: $reason"
  metric "$STAGE" "pipeline" "-" 0 "" "" "blocked"
  push_branch
  {
    echo "### ⛔ Agent to'xtadi: \`$STAGE\` bosqichida"
    echo
    echo "**Sabab:** $reason"
    echo
    if [ -n "$extra" ] && [ -f "$extra" ]; then echo "<details><summary>Tafsilotlar</summary>"; echo; cat "$extra"; echo; echo "</details>"; echo; fi
    echo "**Branch:** \`$BRANCH\` · **Vaqt:** $(elapsed_min) min · **Xarajat:** \$$TOTAL_COST"
    [ -n "${GITHUB_RUN_ID:-}" ] && echo "**Log:** ${GITHUB_SERVER_URL:-https://github.com}/$REPO/actions/runs/$GITHUB_RUN_ID"
    echo
    metrics_table
    echo
    echo "@$OWNER — qaror yoki ma'lumot kerak. Tuzatgach \`agent-ready\` label'ini qayta qo'ying."
  } >"$body"
  set_status "$label"
  comment "$body"
  touch "$RUN_DIR/blocked"
  exit 3
}
on_signal() { blocked "Pipeline tashqaridan to'xtatildi (signal yoki timeout)."; }
trap on_signal TERM INT

check_budget() {
  local over
  if [ "$(elapsed_min)" -ge "$TIME_LIMIT_MIN" ]; then blocked "Vaqt limiti tugadi: $(elapsed_min)/$TIME_LIMIT_MIN min."; fi
  over=$(node -e 'process.stdout.write(Number(process.argv[1])>=Number(process.argv[2])?"1":"0")' "$TOTAL_COST" "$MAX_COST")
  [ "$over" = "1" ] && blocked "Xarajat limiti tugadi: \$$TOTAL_COST / \$$MAX_COST."
  return 0
}

remaining_s() { local r=$(( TIME_LIMIT_MIN * 60 - ($(date +%s) - START_TS) )); [ "$r" -lt 60 ] && r=60; echo "$r"; }

run_with_timeout() { # seconds cmd...
  local t="$1"; shift
  "$@" & local pid=$!
  ( sleep "$t"; kill -TERM "$pid" 2>/dev/null ) & local w=$!
  wait "$pid"; local rc=$?
  kill "$w" 2>/dev/null; wait "$w" 2>/dev/null
  return "$rc"
}

# ── Claude chaqiruvi (har biri yangi, toza kontekstli sessiya) ────────────────
# claude_run <stage> <agent> <model> <effort> <allowedTools> <schema_file|""> <prompt_file> <max_turns>
claude_run() {
  local stage="$1" agent="$2" model="$3" effort="$4" tools="$5" schema="$6" prompt="$7" turns="$8"
  local out="$RUN_DIR/$stage.json" t0 rc parsed
  local args=(-p "$(cat "$prompt")" --model "$model" --output-format json --max-turns "$turns"
              --permission-mode dontAsk --allowedTools "$tools"
              --settings "$RUN_DIR/agent-settings.json" --add-dir "$RUN_DIR")
  [ -f ".claude/agents/$agent.md" ] && args+=(--agent "$agent")
  [ -n "$schema" ] && args+=(--json-schema "$(cat "$schema")")
  log "→ $stage ($agent · $model · effort=$effort)"
  t0=$(date +%s)
  CLAUDE_CODE_EFFORT_LEVEL="$effort" run_with_timeout "$(remaining_s)" claude "${args[@]}" >"$out" 2>"$RUN_DIR/$stage.stderr"
  rc=$?
  parsed=$(node -e '
    const fs=require("fs");let j={};try{j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))}catch{}
    let so=j.structured_output;
    if(!so&&typeof j.result==="string"){const m=j.result.match(/\{[\s\S]*\}\s*$/);if(m)try{so=JSON.parse(m[0])}catch{}}
    fs.writeFileSync(process.argv[2],JSON.stringify(so||{},null,2));
    fs.writeFileSync(process.argv[3],typeof j.result==="string"?j.result:"");
    process.stdout.write([j.total_cost_usd??"",j.num_turns??"",j.is_error?"1":"0"].join(" "));
  ' "$out" "$RUN_DIR/$stage.out.json" "$RUN_DIR/$stage.result.md")
  local cost turns iserr
  read -r cost turns iserr <<<"$parsed"
  [ -n "$cost" ] && TOTAL_COST=$(node -e 'process.stdout.write(String(Math.round((Number(process.argv[1])+Number(process.argv[2]))*100)/100))' "$TOTAL_COST" "$cost")
  local result="ok"; { [ "$rc" -ne 0 ] || [ "$iserr" = "1" ]; } && result="error"; [ "$rc" -eq 143 ] && result="timeout"
  metric "$stage" "$agent" "$model" $(( $(date +%s) - t0 )) "$cost" "$turns" "$result"
  [ "$result" = "ok" ]
}

json_get() { node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const v=process.argv[2].split(".").reduce((o,k)=>o==null?o:o[k],j);process.stdout.write(v==null?"":typeof v==="object"?JSON.stringify(v):String(v))' "$1" "$2"; }

commit_all() { git add -A && git diff --cached --quiet || git commit -q -m "$1"; }

# ── Agentlar uchun umumiy taqiqlar (har bosqichga beriladi) ───────────────────
cat >"$RUN_DIR/agent-settings.json" <<'JSON'
{
  "permissions": {
    "deny": [
      "Read(**/.env)", "Read(**/.env.*)", "Read(**/*.pem)",
      "Bash(git push *)", "Bash(git push)", "Bash(git remote *)", "Bash(gh *)",
      "Bash(curl *)", "Bash(wget *)", "Bash(ssh *)", "Bash(scp *)",
      "Bash(rm -rf /*)", "Bash(sudo *)",
      "Edit(.github/**)", "Write(.github/**)"
    ]
  }
}
JSON

# ═════════════════════════════ 0. INTAKE ═════════════════════════════
STAGE="intake"
log "Issue #$ISSUE · repo $REPO · base $BASE · limitlar: ${TIME_LIMIT_MIN}min, ${MAX_FIX} fix, \$$MAX_COST"
gh issue view "$ISSUE" -R "$REPO" --json number,title,body,labels,comments,url \
  -q '"# #\(.number) \(.title)\n\(.url)\n\n\(.body)\n\n## Comments\n" + ([.comments[] | "- **\(.author.login)**: \(.body)"] | join("\n"))' \
  >"$RUN_DIR/issue.md" || blocked "Issue o'qilmadi."
TITLE="$(gh issue view "$ISSUE" -R "$REPO" --json title -q .title)"
set_status "agent:planning"

# ── Izolyatsiya: alohida branch (+ lokal rejimda alohida worktree) ───────────
git fetch -q origin "$BASE" || blocked "origin/$BASE fetch bo'lmadi."
if [ -z "${CI:-}" ] && [ "${AGENT_WORKTREE:-1}" = "1" ]; then
  WT="$(git rev-parse --show-toplevel)/../.worktrees/$(basename "$(git rev-parse --show-toplevel)")/issue-$ISSUE"
  if [ ! -d "$WT" ]; then
    if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
      git fetch -q origin "$BRANCH" && git worktree add -q "$WT" -B "$BRANCH" "origin/$BRANCH"
    else
      git worktree add -q "$WT" -B "$BRANCH" "origin/$BASE"
    fi || blocked "Worktree yaratilmadi: $WT"
  fi
  cd "$WT" || blocked "Worktree'ga o'tilmadi."
  log "Worktree: $WT"
else
  if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    git fetch -q origin "$BRANCH" && git checkout -q -B "$BRANCH" "origin/$BRANCH"
  else
    git checkout -q -B "$BRANCH" "origin/$BASE"
  fi || blocked "Branch tayyorlanmadi."
fi
BASE_SHA="$(git merge-base HEAD "origin/$BASE")"
PLAN="docs/plans/issue-$ISSUE.md"

# ═════════════════════════════ 1. PLAN (Fable 5.1) ═══════════════════════
STAGE="plan"; check_budget
cat >"$RUN_DIR/plan.schema.json" <<'JSON'
{"type":"object","properties":{
  "ready":{"type":"boolean"},
  "route":{"type":"string","enum":["gemini","sonnet"]},
  "plan_path":{"type":"string"},
  "summary":{"type":"string"},
  "questions":{"type":"array","items":{"type":"string"}}},
 "required":["ready","route","plan_path","summary"]}
JSON
cat >"$RUN_DIR/plan.prompt.md" <<EOF
GitHub issue is in $RUN_DIR/issue.md. Write the implementation plan to $PLAN using your plan format
(read docs/PRD.md, docs/TZ.md, docs/ARCHITECTURE.md and CLAUDE.md first if they exist).
Base: $BASE @ $(git rev-parse --short "$BASE_SHA").
Return structured output:
- ready: false if information is missing and guessing would be risky (put the questions in "questions")
- route: "gemini" ONLY if every task in the plan is routed gemini; otherwise "sonnet"
- plan_path: "$PLAN"
- summary: 3-5 lines for the issue comment, in Uzbek
EOF
claude_run plan architect "$PLANNER_MODEL" high "Read,Grep,Glob,Write,Edit,Bash(git log *),Bash(git ls-files *),Bash(ls *)" \
  "$RUN_DIR/plan.schema.json" "$RUN_DIR/plan.prompt.md" 40 || blocked "Planner (Fable) xato bilan tugadi." agent:blocked "$RUN_DIR/plan.stderr"
[ -f "$PLAN" ] || blocked "Planner reja faylini yozmadi ($PLAN)."
if [ "$(json_get "$RUN_DIR/plan.out.json" ready)" != "true" ]; then
  json_get "$RUN_DIR/plan.out.json" questions | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let q=[];try{q=JSON.parse(s)}catch{};console.log(q.map((x,i)=>`${i+1}. ${x}`).join("\n")||"(savollar ko\u0027rsatilmagan)")})' >"$RUN_DIR/questions.md"
  commit_all "docs(issue-$ISSUE): draft plan (needs info)"
  blocked "Reja uchun ma'lumot yetarli emas — quyidagi savollarga javob kerak." needs-info "$RUN_DIR/questions.md"
fi
ROUTE="$(json_get "$RUN_DIR/plan.out.json" route)"
commit_all "docs(issue-$ISSUE): implementation plan"
{ echo "### 🗺️ Reja tayyor (Claude Fable 5.1)"; echo; json_get "$RUN_DIR/plan.out.json" summary; echo; echo "Reja: \`$PLAN\` · Yo'nalish: **$ROUTE**"; } >"$RUN_DIR/plan-comment.md"
comment "$RUN_DIR/plan-comment.md"

# ═════════════════════════════ 2. CODE ═══════════════════════════════════
STAGE="code"; check_budget
set_status "agent:coding"
CODER_TOOLS="Read,Grep,Glob,Edit,Write,Bash"
code_with_sonnet() { # prompt_file stage_name
  claude_run "$2" implementer "$COMPLEX_MODEL" high "$CODER_TOOLS" "" "$1" 80
}

if [ "$ROUTE" = "gemini" ] && command -v agy >/dev/null 2>&1; then
  AGY="$SCRIPT_DIR/agy-run"; [ -x "$AGY" ] || AGY="agy-run"
  before="$(git rev-parse HEAD)"
  t0=$(date +%s)
  AGENT_ISSUE="$ISSUE" AGENT_LOG_DIR="$RUN_DIR/agy-log" "$AGY" -C "$PWD" -t "$(( AGY_TIMEOUT < $(remaining_s) ? AGY_TIMEOUT : $(remaining_s) ))" -o "$RUN_DIR/code-gemini.md" \
    "Implement ALL tasks from $PLAN in order. Read the plan first. For each task write the listed tests first, then the code. Only touch the files the plan lists." >/dev/null
  agy_rc=$?
  commit_all "feat(issue-$ISSUE): implement plan [gemini]"
  bash "$SCRIPT_DIR/test.sh" >"$RUN_DIR/tests-after-gemini.txt" 2>&1; trc=$?
  if [ "$agy_rc" -ne 0 ] || [ "$(git rev-parse HEAD)" = "$before" ] || grep -q '^BLOCKED:' "$RUN_DIR/code-gemini.md" || { [ "$trc" -ne 0 ] && [ "$trc" -ne 5 ]; }; then
    metric code gemini-agy "${AGY_MODEL:-agy-default}" $(( $(date +%s) - t0 )) "" "" "fallback"
    log "Gemini natijasi yaroqsiz (rc=$agy_rc, tests=$trc) → Sonnet'ga o'tkazildi"
    cat >"$RUN_DIR/code.prompt.md" <<EOF
Plan: $PLAN. A previous worker attempted it; its commits may be incomplete or wrong. Test output after that attempt:
$RUN_DIR/tests-after-gemini.txt
Implement or repair ALL tasks so every acceptance criterion holds. TDD. Commit after each task.
EOF
    check_budget
    code_with_sonnet "$RUN_DIR/code.prompt.md" code-fallback || blocked "Coder (Sonnet, fallback) xato bilan tugadi." agent:blocked "$RUN_DIR/code-fallback.stderr"
  else
    metric code gemini-agy "${AGY_MODEL:-agy-default}" $(( $(date +%s) - t0 )) "" "" "ok"
  fi
else
  [ "$ROUTE" = "gemini" ] && log "agy topilmadi → oddiy vazifalar ham Sonnet'da bajariladi"
  cat >"$RUN_DIR/code.prompt.md" <<EOF
Plan: $PLAN. Implement ALL tasks in order with strict TDD. Commit after each task.
Run the plan's verification commands before you finish.
EOF
  code_with_sonnet "$RUN_DIR/code.prompt.md" code || blocked "Coder (Sonnet) xato bilan tugadi." agent:blocked "$RUN_DIR/code.stderr"
fi
commit_all "chore(issue-$ISSUE): leftover changes from coder"
[ "$(git rev-list --count "$BASE_SHA..HEAD")" -gt 1 ] || blocked "Coder hech qanday kod o'zgarishi qilmadi."

# ═════════════════════════════ 3. VERIFY ⇄ FIX ═══════════════════════════
cat >"$RUN_DIR/verify.schema.json" <<'JSON'
{"type":"object","properties":{
  "verdict":{"type":"string","enum":["PASS","FAIL"]},
  "criteria":{"type":"array","items":{"type":"object","properties":{
     "id":{"type":"string"},"status":{"type":"string","enum":["met","not met","cannot verify"]},"evidence":{"type":"string"}},
     "required":["id","status","evidence"]}},
  "tests":{"type":"string"},
  "blocking_issues":{"type":"array","items":{"type":"string"}},
  "non_blocking":{"type":"array","items":{"type":"string"}}},
 "required":["verdict","criteria","tests","blocking_issues"]}
JSON
VERIFY_TOOLS="Read,Grep,Glob,Bash"
round=0
while :; do
  STAGE="verify"; check_budget
  set_status "agent:verifying"
  # Toza kontekst: verifier faqat reja, base sha va issue raqamini oladi — coder hisobotlari BERILMAYDI.
  cat >"$RUN_DIR/verify.prompt.md" <<EOF
Verify branch HEAD against plan $PLAN. Base ref: $BASE_SHA. Issue #$ISSUE.
Do not read anything under $RUN_DIR except this prompt. Do not modify files.
Return the structured verdict.
EOF
  claude_run "verify-$round" verifier "$VERIFIER_MODEL" high "$VERIFY_TOOLS" "$RUN_DIR/verify.schema.json" "$RUN_DIR/verify.prompt.md" 50 \
    || blocked "Verifier (Opus 5.5) xato bilan tugadi." agent:blocked "$RUN_DIR/verify-$round.stderr"
  git checkout -q -- . 2>/dev/null; git clean -fdq -e node_modules 2>/dev/null   # verifier read-only; ehtiyot uchun tozalash
  VERDICT="$(json_get "$RUN_DIR/verify-$round.out.json" verdict)"
  log "Verdict: ${VERDICT:-?} (round $round)"
  [ "$VERDICT" = "PASS" ] && break
  json_get "$RUN_DIR/verify-$round.out.json" blocking_issues \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let a=[];try{a=JSON.parse(s)}catch{};console.log(a.map((x,i)=>`${i+1}. ${x}`).join("\n")||"(verifier sabab ko\u0027rsatmadi)")})' \
    >"$RUN_DIR/blocking-$round.md"
  if [ "$round" -ge "$MAX_FIX" ]; then
    blocked "Verifier $((round + 1)) marta FAIL berdi (fix limiti: $MAX_FIX)." agent:blocked "$RUN_DIR/blocking-$round.md"
  fi
  STAGE="fix"; check_budget
  set_status "agent:coding"
  cat >"$RUN_DIR/fix.prompt.md" <<EOF
Plan: $PLAN. An independent verifier rejected the branch. Fix exactly these blocking issues (TDD, commit each fix):
$(cat "$RUN_DIR/blocking-$round.md")
EOF
  claude_run "fix-$round" implementer "$COMPLEX_MODEL" high "$CODER_TOOLS" "" "$RUN_DIR/fix.prompt.md" 60 \
    || blocked "Fix (Sonnet) xato bilan tugadi." agent:blocked "$RUN_DIR/fix-$round.stderr"
  commit_all "fix(issue-$ISSUE): address verifier findings (round $((round + 1)))"
  round=$((round + 1))
done

# ═════════════════════════════ 4. DELIVER ════════════════════════════════
STAGE="deliver"
git push -u origin "HEAD:$BRANCH" || blocked "Branch push bo'lmadi (token huquqlarini tekshiring)."
VJ="$RUN_DIR/verify-$round.out.json"
{
  echo "Closes #$ISSUE"
  echo
  echo "## Xulosa"
  json_get "$RUN_DIR/plan.out.json" summary
  echo
  echo "Reja: [\`$PLAN\`](../blob/$BRANCH/$PLAN) · Coder yo'nalishi: **$ROUTE**"
  echo
  echo "## Mustaqil tekshiruv (Claude Opus 5.5, toza kontekst) — PASS"
  node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
    for(const c of j.criteria||[]) console.log(`- ${c.status==="met"?"✅":"⚠️"} **${c.id}** — ${c.evidence}`);
    console.log(`\n**Testlar:** ${j.tests||"—"}`);
    if((j.non_blocking||[]).length){console.log("\n<details><summary>Blokirovka qilmaydigan izohlar</summary>\n");for(const n of j.non_blocking)console.log(`- ${n}`);console.log("\n</details>");}' "$VJ"
  echo
  echo "## Kuzatuv"
  metrics_table
  echo
  echo "_agent-pipeline · fix raundlari: ${round}_"
} >"$RUN_DIR/pr-body.md"
EXISTING="$(gh pr list -R "$REPO" --head "$BRANCH" --state open --json number -q '.[0].number' 2>/dev/null || true)"
if [ -n "$EXISTING" ]; then
  gh pr comment "$EXISTING" -R "$REPO" --body-file "$RUN_DIR/pr-body.md" >/dev/null
  PR_URL="$(gh pr view "$EXISTING" -R "$REPO" --json url -q .url)"
else
  PR_URL="$(gh pr create -R "$REPO" --base "$BASE" --head "$BRANCH" --title "$TITLE (#$ISSUE)" --body-file "$RUN_DIR/pr-body.md")" \
    || blocked "PR yaratilmadi."
fi
set_status "agent:review"
printf '### ✅ PR tayyor: %s\nVerifier: PASS · %s min · $%s\n' "$PR_URL" "$(elapsed_min)" "$TOTAL_COST" >"$RUN_DIR/done-comment.md"
comment "$RUN_DIR/done-comment.md"
metric deliver pipeline - "$(( $(date +%s) - START_TS ))" "$TOTAL_COST" "" pass
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && { echo "## Issue #$ISSUE → $PR_URL"; echo; metrics_table; } >>"$GITHUB_STEP_SUMMARY"
log "Tayyor: $PR_URL"
