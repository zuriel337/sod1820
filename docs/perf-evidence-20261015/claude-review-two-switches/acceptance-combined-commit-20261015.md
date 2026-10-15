# Acceptance review of the "combined commit" — decision: REQUIRES FIXES (no combined commit exists)
READ_ONLY on product code. Fetched `origin` 2026-10-15; no row in work_log after `3748b63c` (01:24Z) announces a combined commit.

| Ref | SHA | Contains |
|---|---|---|
| scroll branch `claude/scroll-navigation-2029-fix-oz90c0` | `705bc709` | PR1100 head `01ac7706` + F2 (`1701cf3a`) + harness + evidence. **No switches, no /control fix.** |
| switches branch `claude/sod-perf-continuation-838w4h` | `62fdfdca` | PR1105 + merge `0de29e31` + R2/R3 (`4b8855f3`) + /control fix (`ab6ed6ab`) + measurements. **No PR1100 head, no `scrollRestore2029.js`.** |
| `origin/main` | `503b52ef` | none of the above; PR1100 head `01ac7706` only on `gpt/perf-execution-20261014` |

`git merge-base --is-ancestor`: scroll ⊄ switches, PR1100 ⊄ switches. `git merge-tree` of the two heads: **content conflicts in `src/App2029.jsx`, `src/components/experience2029/HomeComposition2029.jsx`, `src/pages/World2029Page.jsx`.** No preview deployment/URL exists for any of these SHAs (the switches journal says hosted preview NOT established).

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 0 | Commit + preview match | **FAIL** | No combined commit, no preview to match. |
| 1 | PR1100 + switches + /control kept; no old code / double scroll | **NOT TESTED** | Needs the combined tree. Separately: switches branch keeps switches and /control fix (PASS, diff vs `4b8855f3` = `ControlPlane2029Page.jsx` one line + test + docs); scroll branch keeps PR1100 + one restorer (my F2 review). |
| 2 | /control opens for admin; permissions; DB switch OFF; World switch OFF/ON | **PARTIAL.** Fix = `surface="admin"` → `"world"` (admin gate `if(!isAdmin) return <Navigate to="/"/>` unchanged, line 189); guard test + memory tests **8/8 pass in my run on `62fdfdca`**. Admin-open in a browser **NOT TESTED** (no admin session; their journal says the same). Possible side effect not examined: the shell now treats /control as the World surface. DB switch OFF: yes (`fx_number_lookup_page=false`, per install record). World OFF↔ON round trip: replay + live in their README (OFF/ON identical content, `returnTo`), UI toggle on the live control plane NOT TESTED. |
| 3 | World→number/post, back/forward, anchors, user cancels restore, no late pull | **NOT TESTED on a combined tree.** On the scroll branch alone (my F2 review; their 7-run table, 0 invalid): position back 7/7, forward 7/7, new entry top 7/7, anchors 7/7; cancel-by-user is covered by unit tests, not by a real-input run I repeated. World→number/post *deepening* was never combined with scroll. |
| 4 | Invalid / missing-fixture samples excluded; run counts match | **PASS (spot check)** | Switch measurement: each replay raw file records `runs=4` per pass × 2 passes = **8 per cell**, as the README states; live cells 3 runs, labeled n=3 and "not production". Scroll table: 7 per arm, 0 invalid. I did not re-derive every table cell. |
| 5 | Speed, scroll accuracy, CLS reported apart; remaining jumps without unproven cause | **PASS** | Scroll row: position 0/7→7/7; time ranges overlap → "no speed claim"; CLS back→Home 2.29→1.85 (>0.1 in 7/7 both), forward→World 0→1/7, "pre-existing / late insertions", component attribution marked open. Switch row: CLS identical across modes (0.052 / 0.227–0.278). |
| 6 | Gates refer to the combined commit | **FAIL / N-A** | Gates were run on `705bc709` and on `4b8855f3`/`62fdfdca` separately, none on a merged SHA. |

## Decision: נדרשים תיקונים — not ready for ZURIEL's preview review
Blockers (only those affecting acceptance):
1. **No combined commit / no preview.** Responsible: scroll session (owns `App2029.jsx` F2) together with the switches session (owns `World2029Page.jsx`, `HomeComposition2029.jsx` deltas) — produce one branch = PR1100 `01ac7706` + switches/R2/R3/control fix + F2, resolve the 3 conflicts (keep `fx_analytics` guards, keep `frozenOr` usage, one restorer), run the gates and the 7-run real-input + four-mode measurements **on that SHA**, publish a protected preview of exactly that SHA, and journal the SHA. Preview URL/deployment access: owner/GPT.
2. **Admin `/control` open unverified** (real admin session; also confirm the `world` surface choice has no nav side effect). Responsible: ZURIEL/an authorized admin session, on the preview.
3. **Member acceptance** (`MEMBER_ACCESS_TOKEN`, real non-admin) before `fx_number_lookup_page` is ever enabled; the flag stays OFF (no site benefit with 500-row windows, per their finding). Responsible: ZURIEL authorizes a member session.
No merge, deploy, flag, DB or product-code change by this review.
