# Open obligations and evidence index — 7.11.2026 (DRAFT; nothing here is a gate pass)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** SK2, PG2, G4 and S2 are **not** marked passed. Branch-only. Index: [README](README.md).

## A. Exact SHAs and refs
| Item | SHA / id | Note |
|---|---|---|
| `main` | `cfda877a15fd4034861950b8668d0ef6d966b515` | PR #1260 (ELS dock opens panel in view) |
| Production (all three domains) | `dpl_12JhDbtTkEiENigf3Wzy4sproY7E` = `cfda877a1` | alias updated 6.11 ~14:27 UTC, not by this work; previously `dpl_5BhNvF9H3KhKw2WgJd7pgbkByXuZ` = `394a2ba8` (6.11 11:08 → ~14:27) |
| Designated branch | `claude/sod1820-ci-failures-diagnosis-6z9ej6` | checklist rows `70426588d`, plus these documents |
| Proof branch (PG2 workflow step) | `ci-verify/pg2-workflow-20261107` @ `5bcbebaf609dadaa68be5f179d32de712006c1d2` | not for merge |
| Temporary ref | `ci-verify/394a2ba8-20261107` @ `394a2ba8f90fae8716d95c5bf9182fc16fa7f3a2` | deletion refused with HTTP 403 (twice); no workaround; manual cleanup needed |
| PR #1259 | draft, branch `claude/sod1820-statistics-metrics-28w9ta` @ `39f57e3ef` (last read) | active writer; not touched |

## B. CI evidence by exact SHA (each is evidence, not gate approval)
| SHA | Gate | Run | Result |
|---|---|---|---|
| `394a2ba8` | G4 Public Core | 42232445987 | success |
| `394a2ba8` | 2029 Isolation | 42232450988 | success |
| `394a2ba8` | Release Visual / 2029 Live Contracts / Observability-SEO / ELS Core | 42336935129 / 42336937783 / 42336940079 / 42336942219 | success (4 of 4) |
| `cfda877a` (live now) | Release Visual / 2029 Live Contracts / Observability-SEO / ELS Core | 42232455810 / 42232460382 / 42232465877 / 42232471147 | success (4 of 4) |
| `cfda877a` (live now) | G4 Public Core, 2029 Isolation | — | **not run on this SHA** |
| `5bcbebaf6` (proof branch) | 2029 Live Contracts incl. the new step | 42339878779 | success; Node v24.21.0; new step 71/71 in ~5 s |
Local (build of 394a2ba8, scratch specs): SK1, SK3, SK4, PG1 and synthetic SK2 passed — application layer only (see 01).

## C. Obligations (all open)
| # | Obligation | State | Next |
|---|---|---|---|
| SK1/SK3/SK4/PG1 | Skeleton / Posts Golden journeys | partial local evidence on 394a2ba8 | re-run on cfda877a build; CI-level specs; owner machine for live runtime |
| SK2 | Expiry indication, CTA, exact return incl. hash | requirement recorded in the checklist (branch); gaps G-SK2-1…6 | implementation (needs approval); real-account run; in-place sign-in completion unproven |
| PG2 | P0-A/B/C consumer acceptance | seven orphan tests mapped; CI step proven on Node 24 (proof branch) | owner decision to wire; consumer receipts for the delta (+541 channel_updates, +18 posts since 7.10); P0-C has no direct test among the seven |
| PG2/Zvi | `world-corpus-continuation-2029` | kept in the proof; **not PASS, not obsolete** | owner: was the Zvi message sent / answered; who owns the snapshot ([03](03-pg2-zvi-status-addendum.md)) |
| S2 | Public RPC classification and negative tests; SECURITY DEFINER views; edge regression; required status checks (`protect-main` has none); CSP; rollback and backup evidence | open | [04](04-risk-plans-four-public-write-rpcs.md) |
| RP-1 | `increment_post_share` / `_by_slug` | retirement plan + same-day re-check done, incl. Edge Function scan of 93 functions, no match (A, subagent; [05](05-retirement-plan-increment-post-share.md) §3a–3b) | owner approval of stage 2 (DB change); not requested here |
| RP-2 | `ingest_event` | decision: keep narrow worker measurement; no RPC widening, GUARD or blocking allow-list ([06](06-ingest-event-observe-report.md)) | owner: which dashboards read the near-zero surfaces; sequencing with #1259 |
| RP-3 | `name_research_log` retention | 30 / 180 proposed **only**; impact assessed ([07](07-name-research-log-impact-and-retention-30-180.md)) | owner: backup position from the dashboard (authorized source unavailable here); approval of exact rules |
| RP-3b | `fn_log_name_research` / stats retirement | consumer verification (gateway 0 calls since 4.11 11:49; code, DB, Edge scan of 93 functions: no caller) + plan ([08](08-retirement-plan-fn-log-name-research.md)) | owner approval of stage 2; guard test idea |
| RP-4 | `ingest_reading_activity_v1` (PR #1259) | independent review in 04 | PostgREST proof (MUST), A1, daily cap, inventory 296, rollback drill |
| Docs | Roadmap "current position" drift; worker/fixture comments on `lang_links_list` | open | owner |
| Hygiene | 667 orphan tests; two `ci-verify/*` refs | open | owner |
| work_log | neutral AFTER prepared, **not written** | waiting for a clear authorization path (a previous insert returned an unanswered server question) | owner |

## D. What was changed and what was not
Changed: one documentation commit (checklist rows) and these documents on the designated branch; one proof branch with a 13-line workflow step; one workflow run; two temporary refs (cleanup refused).
Not changed: database, access control, product code, permanent workflows, `main`, deployments, production.
