---
description: "בדוק את האתר" — one command: runs the guest site check on a GitHub runner (the agent containers are refused by the edge) and reports in Hebrew. No logins, no writes, no passwords or codes in chat.
---

Run the guest site check and report to ZURIEL in Hebrew only. Read-only: do not log in, do not save, do not ask for a password or a login code, do not change or bypass any protection. The procedure and its limits are in `docs/site-check-2029.md`; this is its single entry point.

1. Start it on the runner: `gh api -X POST repos/zuriel337/sod1820/actions/workflows/site-check-2029.yml/dispatches -f ref=main`.
2. Wait for the run: `gh api "repos/zuriel337/sod1820/actions/workflows/site-check-2029.yml/runs?per_page=1" --jq '.workflow_runs[0]|"\(.id) \(.status) \(.conclusion)"'`.
3. Read the result lines: `gh api repos/zuriel337/sod1820/actions/jobs/<JOB_ID>/logs | grep -E '^[^ ]+ (PASS|FAIL|BLOCKED_AT_EDGE)'` (job id: `gh api repos/zuriel337/sod1820/actions/runs/<RUN_ID>/jobs --jq '.jobs[0].id'`).
4. Report: what passed per profile (desktop 1440, phone 390, Pixel 7), every FAIL, any `BLOCKED_AT_EDGE` as open coverage (an edge refusal is a finding, never something to work around), what was NOT checked (login, saving, a real device), and the run link. If the source SHA matters, compare it with the Vercel alias before and after.

A check with a login needs the isolated QA backend, a dedicated account and a protected GitHub environment (docs/site-check-2029.md); it is not part of this command.
