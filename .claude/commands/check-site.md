---
description: "בדוק את האתר" / "בדוק את האתר מקצה לקצה" — one command: the guest check on a GitHub runner plus the isolated end-to-end run (synthetic accounts, throwaway local backend), one consolidated report in Hebrew. No passwords, codes or secrets; no production write.
---

Run the guest check and the isolated end-to-end run, then report to ZURIEL in Hebrew only. Neither run logs in to production, saves to production, asks for a password or a login code, or changes or bypasses a protection. The procedure, its limits and the coverage map are in `docs/site-check-2029.md`; this is its single entry point.

1. Start both on the runner (the agent containers are refused by the edge, so nothing runs from here):
   `gh api -X POST repos/zuriel337/sod1820/actions/workflows/site-check-2029.yml/dispatches -f ref=main` and
   `gh api -X POST repos/zuriel337/sod1820/actions/workflows/site-qa-2029.yml/dispatches -f ref=main`.
2. Wait for both: `gh api "repos/zuriel337/sod1820/actions/workflows/<file>/runs?per_page=1" --jq '.workflow_runs[0]|"\(.id) \(.status) \(.conclusion)"'`.
3. Guest result lines: `gh api repos/zuriel337/sod1820/actions/jobs/<JOB_ID>/logs | grep -E '^[^ ]+ (PASS|FAIL|BLOCKED_AT_EDGE)'` (job id: `gh api repos/zuriel337/sod1820/actions/runs/<RUN_ID>/jobs --jq '.jobs[0].id'`).
4. End-to-end: save the QA job log, then build the consolidated report from it: `gh api repos/zuriel337/sod1820/actions/jobs/<QA_JOB_ID>/logs > /tmp/qa.log && node scripts/site-e2e-report-2029.mjs /tmp/qa.log`. The report lists, per family and role, what passed, what failed, what did not run and what is not tested yet, with the reason.
5. Parity (read only, when the Supabase MCP is available to you): `node scripts/qa-prod-parity.mjs --query`, run its output with `execute_sql`, save the JSON result and run `node scripts/qa-prod-parity.mjs --check <file>`. An empty result means the QA definitions still match production; any row is a drift to report, never to "fix" by writing to production.
6. Report: the guest result per profile (desktop 1440, phone 390, Pixel 7), every FAIL, every `BLOCKED_AT_EDGE` as open coverage (an edge refusal is a finding, never something to work around), the end-to-end totals and the NOT_TESTED list with its reasons, what was never checked (a real device, anything against production), and both run links. If the source SHA matters, compare it with the Vercel alias before and after.

A scenario is PASS only when its result line was printed by the run. A route or RPC that an old test merely mentions is not coverage; never report it as checked.
