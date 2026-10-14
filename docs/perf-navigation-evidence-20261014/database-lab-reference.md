# Database role B — exact draft reference, not applied

Verified remote `claude/2029-data-bottleneck-lkkdx6` at
`8a629b00fc681c8a1b7031089089285005a6b356` (journald2be0ab8).
[Package/runner/SQL/raw](https://github.com/zuriel337/sod1820/tree/8a629b00fc681c8a1b7031089089285005a6b356/docs/perf-evidence-20261014/database-lab-b).
Role B extends saved `f0c92110` and integration `001c3b05`; no third lab.

Prepared SQL: `sql/33_candidates.sql`; live-verbatim reference `sql/32_live_rpcs.sql`;
real composite engine `sql/30_real_composite_engine.sql`; definer matrix40+41.
Keep these artifacts in their original isolated source branch; no duplicate
migration or client-RPC replacement is created in1100.

Lab-only findings:30/30 normalized function fingerprints match live definitions;
lookup_v3 zero differences on169 cases; earlier v2 differs72/169 and is unsafe.
Dossier/journey29 inputs ×5 synthetic contexts match values/errors. At synthetic
value1: lookup65.7→6.7ms; dossier65.4→3.2ms, median3. Concurrency pgbench is a
separate small synthetic4-vCPU experiment, not user route latency or live DB load.

Human Gate remains open. The definer lab reports anon dossier output includes
encrypted-phrase words that anon lookup excludes; the candidate reproduces it.
Parity is not permission acceptance. Resolve the intended encryption/access
policy before any candidate migration; no phrase contents copied here. Admin
metatron_context remains stubbed, and growth×10/×100, controlled cold cache,
p95 and derived-post maintenance/backfill/id update/write cost/rollback were not
rerun. **No SQL, index, migration, grant or flag was applied to the live product DB.**
