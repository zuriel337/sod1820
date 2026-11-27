# Traffic classification rule v4 (proposal, not applied)

Owner: `traffic_intelligence_law` (EXTEND_EXISTING: the same classifier `fn_human_entrances`, no new table, store, engine or cron).
Evidence: speed map `docs/reviews/unified-performance-consolidation-20261031.json` S-64 `wave_investigation_20261127`.

## Draft contract text (for ZURIEL's decision; not written to `nodes`)
```
[UPDATE <date> - CLASSIFICATION RULE v4 (VOLUME ANOMALY) · Human-Gate ZURIEL]
OWNER CHECK=EXTEND_EXISTING (traffic_intelligence_law v12; classifier fn_human_entrances, rules v2/v3 unchanged).
RULE. A session is suspected_bot with reason "rule v4" only when: arrival source = google, exactly one view, no interaction, no
page-engagement event, and the visitor is not identified (is_logged_in false), AND at least 25 such sessions landed on the same path in the same hour. Computed at read time; no event row is
changed, deleted or blocked; no traffic is blocked (open-index law). Retention keeps counting the session under "suspected".
EVIDENCE. 30 days: the busiest normal hour has fewer than 10 such sessions; 26.11.2026 had 13 hours on /community/chat (4,634 sessions),
2 on /codes/:item (92) and 1 on /post/:item (30). Threshold 25 sits above every normal hour.
REVIEW. The threshold is revisited if a normal hour ever reaches 15; raising or lowering it is a ZURIEL decision.
```

## Files
`PROPOSAL.sql` · `ROLLBACK.sql` · `ACCEPTANCE.sql` · local proof `tests/traffic-classification-v4-20261126/realpg.sh` (14 checks, PostgreSQL 16 and 17).
GA4 history completion lives beside it in `../ga4-history-completion-20261126/` (a separate approval, a separate action).

## Consistency across measurement windows
The hour and path partition lies inside one UTC day, and every caller passes whole dates (refresh_traffic_daily_range_v1 passes day-1..day+1 and keeps only its own day), so a session gets the same classification in any window that contains its whole day: proven locally (day window, three-day window and unbounded window agree row for row). Identified (logged-in) visitors are never marked and are not counted toward the threshold (26.11: 3 of 4,840 signature sessions were identified).
