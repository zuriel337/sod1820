# SOD1820 Product Intelligence / Experiment Contract v1

Status: ZURIEL Human-Gate approved for implementation on 2026-09-06. This document is a contract over existing analytics infrastructure; it does not authorize or create a parallel analytics store.

## One-system ownership

- Exposure / interaction events: existing `visitor_events` + `events` dual-write through `src/lib/tracking.js`.
- Human / Bot / Unknown truth: canonical Traffic Intelligence / Clean Traffic classification only.
- AI economics: existing `ai_token_log` + time-versioned `api_pricing`.
- Change provenance / effective release state: `work_log` + live `origin/main` / deploy evidence.
- Human decisions: existing Human Gate / `decision_ledger` when a product decision is formally recorded.
- No experiment table, no second traffic classifier, no dashboard-owned truth.

## Standard event metadata

Experiment-aware events use existing `meta` / `events.props` and may include:

- `experiment_id` — stable semantic identity.
- `experiment_version` — contract version for the experiment.
- `experiment_phase` — e.g. pre, post_restore, blocked, treatment.
- `change_ref` — release/change provenance such as `main:<sha>`.
- `access_state` — open / blocked / gated / etc.
- `metric_semantics` — currently `product_intelligence_experiment_v1`.
- `tool`, `route_kind`, `path`, `query`, `previous_path`, `entry_kind` — context when relevant.
- `calendar_context.timezone/local_date/iso_weekday/local_hour` — factual Jerusalem local context.
- `calendar_context.shabbat_status = not_computed` until authoritative halachic entry/exit times are applied in analysis. Friday/Saturday calendar labels must never be treated as an exact Shabbat window by themselves.

## Current golden experiment

`core-tool-reachability-restore-20260906`

Intervention provenance: core tool reachability restored on main change `822f71fc` (Heichal + Number Page + Gematria Calculator + ELS + Beit Midrash reachability restored; mobile favourites bug fixed). Instrumentation starts after the intervention, so historical pre-period comparison remains reconstructed from existing telemetry and release provenance rather than backfilled exposure events.

Tracked route exposures:

- `/research` -> Heichal landing.
- `/research?tool=...` -> Heichal tool projections.
- `/code` -> standalone ELS.
- `/beit-midrash` -> standalone Beit Midrash.
- `/number` and `/number/*` -> Number surfaces.

The global route probe records these without modifying access or navigation behavior.

## Maintenance-lock exposure

`MaintenanceLock` and `LockTeaser` emit an exposure event when actually rendered. Generic lock telemetry records lock variant, flag, mode and path. A caller may optionally provide an experiment identity so the same exposure is joined to a deliberate experiment without creating a second event system.

## Evaluation rules

1. Human != Unknown != Bot. Never collapse Unknown into Human or Bot.
2. Same-day-of-week comparison is the minimum short-window control for this audience.
3. Shabbat/holiday context must use authoritative local-time windows; do not compare halachic Shabbat directly with ordinary weekday traffic.
4. Cost and user value are separate axes. Token count alone is not evidence that a feature is too expensive.
5. Branch != merged != deployed != live != verified. Experiment effective time uses the actual live state when provable.
6. Correlation != causation. Results may be labeled FACT / INFERENCE / RECOMMENDATION / DECISION separately.
7. AI may summarize/rank evidence; ZURIEL remains the Human Gate for product decisions.

## Extension points, not new systems

Later experiments may reuse the same helper and metadata fields. If a future requirement cannot be represented by existing events + provenance + decision infrastructure, stop and run a Foundation Expansion Gate before adding schema.
