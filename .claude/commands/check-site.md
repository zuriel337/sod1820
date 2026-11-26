---
description: "בדוק את האתר" — one command: runs the read-only Site Check on a GitHub runner and reports in Hebrew. No logins, no writes, no passwords or codes in chat.
---

Run the Site Check against the public site and report to ZURIEL in Hebrew only. Read-only: do not log in, do not save, do not ask for a password or a login code, do not change any protection.

1. Start it (the target is the production site unless ZURIEL named another of the three public origins):
   `gh api -X POST repos/zuriel337/sod1820/actions/workflows/site-check.yml/dispatches -f ref=main -f url=https://sod1820.co.il`
   (add `-f expected_sha=<SHA>` to require an exact source SHA; use `-f ref=<branch>` for a branch that carries a newer version of the check).
2. Find the run: `gh api "repos/zuriel337/sod1820/actions/workflows/site-check.yml/runs?per_page=1" --jq '.workflow_runs[0]|"\(.id) \(.status) \(.conclusion)"'`, and wait until its status is `completed`.
3. Read the report from the job log between `SITE-CHECK-REPORT-BEGIN` and `SITE-CHECK-REPORT-END`:
   `gh api repos/zuriel337/sod1820/actions/jobs/<JOB_ID>/logs | sed -n '/SITE-CHECK-REPORT-BEGIN/,/SITE-CHECK-REPORT-END/p'` (job id: `gh api repos/zuriel337/sod1820/actions/runs/<RUN_ID>/jobs --jq '.jobs[0].id'`). Screenshots are in the run's artifact `site-check-<run id>`.
4. Report: result, observed source SHA, every failed check with its detail, what was NOT checked (login, save, write, real device), and the run link. A 403/429 from the edge is a finding to report, never something to bypass.

A member (write) check is a separate step that needs ZURIEL's protected secret and reviewer approval; it is not part of this command (CLAUDE.md 0.6).
