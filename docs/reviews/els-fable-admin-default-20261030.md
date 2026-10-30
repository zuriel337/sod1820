# Bounded administrator activation without manual setup

Actor GPT; task ELS_FABLE_ADMIN_DEFAULT_20261030; recipient ZURIEL.
Base: 5f9c7d236da16a4f4cc56af4f954fb9ada93e87a.
Branch: gpt/els-fable-admin-default-20261030.

User explicitly approved the small server activation and protected 2029 Preview.
Live ai-analyze v89 was downloaded and exactly matched the committed base bundle
(SHA256 5611a3ecd4ffcf725bfcafb6924f5820bab82ce11bd36a19f6db16943bb09f73).
Relevant live ownership was checked; no active overlapping writer. BEFORE e883e747-6b6b-45cd-b64e-ff6a3e52db45.

## Change

Only the existing ai-analyze reading branch receives an operational default when
ELS_MATRIX_READING_ENABLED is absent. It admits the 33x41, cap25, USD2-acknowledged
trial and existing job status/cancel/recover operations. Explicit configuration,
including empty/OFF and preview-only, overrides it. The canonical site availability
gate, authenticated identity, administrator check, canonical axis replay, cost
estimate/refusal, durable job ownership and idempotency remain unchanged.
This is not an authorization based on Origin or a client flag. Admin-only server
access applies regardless of caller; only the named Preview exposes the UI.

No new provider, transport, engine, secret, table, RLS change or model call.
Classic/Research UI, dictionaries and Providers are untouched. Existing backend
supplier key is reused. No main merge or public-site cutover is authorized.

## Verification and remaining acceptance

87 focused action/operation/handler/session/transport/durability/Preview tests pass.
The real handler is exercised with explicitly synthetic provider/network fixtures:
no-config start, zero-model preview, duplicate start/recover retaining one batch,
explicit OFF, administrator gate, site availability, axis mismatch, bounds, cost
acknowledgement and request ID. The recorded 23-row test window is synthetically
padded for the 33-row gate test; this is not live corpus evidence.
Card browser passed at 320/390/1440 and three themes; both standard builds passed.
Packaging, release gates and hosted deployment evidence are reported in delivery.

No authenticated live Fable scan has yet been made. The user must log in with their
existing admin account and explicitly start one bounded reading. Verify completed
result and same-job reload/recovery before claiming live end-to-end acceptance.
No credentials are requested in chat. Server OFF remains available; do not strand
paid outstanding jobs when disabling. No credit pricing is changed.

Supabase guidance preserved server-side secrets and existing authorization;
Vercel guidance confines frontend publication to a protected Preview.
