# Public launch candidate — in progress, not release acceptance

Task PUBLIC_LAUNCH_CANDIDATE_ACCEPTANCE_20261101. BEFORE845ae2a9.
Base public product be8f86ad55dfbc625d218a5917a97c260331c27b; branch
`gpt/2029-public-launch-candidate-20261101`. No main/Production/cutover.

The new protected Preview is scoped to public reading. Unaccepted account,
community writing, newsletter and model actions are closed in its UI and
transport; owned Preview API mutation/model entrypoints reject direct calls.
Existing functional Preview branches and shared Auth/RLS/site flags are preserved.
Login/basic personal are excluded from this launch scope pending real-account
acceptance, not presented as working. Legacy URLs and behavior are preserved.

Home opts in to bounded metadata on the existing latest-card query. This removes
separate per-card enrichment and leading-post rereads. The legacy default query
and return shape are preserved. No global cache, new reader or public data write.

Credit branch fcc135e8 diverges from this public product at7649e46c; a wholesale
merge would discard newer Number, World and gallery fixes. No AI handler, client
meter or personal/PhaseL code is imported. Only its identical existing engine
migration, synthetic SQL fixture and isolated runner are carried for a separately
disabled financial prerequisite. New additive owner-pilot guard extends the
private price catalogue, defaults OFF, validates auth.uid against the fixed
approved owner and stored admin role before any expiry/debit/replay side effect.
Direct RPC by another user/admin is denied. Return/settle remain available to the
existing service. One canonical balance/ledger, no grant or duplicated wallet.
The guard and original accounting tests passed on network-none PostgreSQL17;
restore and final exact-SHA acceptance are still pending at this checkpoint.
No live migration, Edge deployment, charge, email or model call occurred.

Final evidence, measurements, publication/recovery plan and blockers will be
added after the final exact-source run. This checkpoint is NOT launch approval.
