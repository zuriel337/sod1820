# CI / gate completion — drafts and evidence (7.11.2026)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** These files live on the branch `claude/sod1820-ci-failures-diagnosis-6z9ej6` only; nothing is merged or deployed. They contain aggregate numbers and identifiers only (no personal data, no secrets, no addresses). Work-log task key: `CI_G4_S2_COMPLETION_20261106`.

Purpose: keep the audit drafts and the decisions taken in the session in one reviewable place, without touching `main`, the database, product code, permanent workflows or production.

| File | Content |
|---|---|
| [01](01-sk2-session-expiry-requirement-and-gap.md) | SK2 requirement (session expiry and sign-in return) and gap analysis against the code |
| [02](02-pg2-orphan-consumer-tests-mapping.md) | seven orphan consumer tests mapped to P0-A/B/C and to a CI gate |
| [03](03-pg2-zvi-status-addendum.md) | status of the Zvi audit behind `world-corpus-continuation-2029` (undecided) |
| [04](04-risk-plans-four-public-write-rpcs.md) | risk plans: `increment_post_share`, `ingest_event`, `fn_log_name_research`, `ingest_reading_activity_v1` |
| [05](05-retirement-plan-increment-post-share.md) | retirement plan for the two share-counter functions, with the same-day re-check |
| [06](06-ingest-event-observe-report.md) | measurement of every (surface, event_type) pair; decision to keep the narrow worker measurement |
| [07](07-name-research-log-impact-and-retention-30-180.md) | impact assessment and proposed 30 / 180-day retention (proposal only), backup position |
| [08](08-retirement-plan-fn-log-name-research.md) | retirement plan for the name-research writer and its reader (consumer verification first) |
| [09](09-obligations-and-evidence-20261107.md) | exact SHAs, CI evidence by SHA, open obligations |
| [proposed-diffs/](proposed-diffs/workflow_live-contracts-2029.diff) | the workflow step proven on the proof branch (not applied to `main`) |

Conventions: **V** live read-only query, **C** repository, **G** gateway log, **A** subagent scan (not independently re-verified). Every statement that changes a database, access control, workflow or code is plain text for a later, separately approved step; none was executed.
