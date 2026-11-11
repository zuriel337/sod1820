-- SOD1820 · ROLLBACK of 21_retire_9_legacy_specs.sql — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
begin;
update public.nodes set is_active=true where type='spec' and not is_active and id in ('2fa07a3e-5537-42c4-86ad-920920202cbd', 'abc9bf76-46f7-4598-a635-25240730b112', '0caadab6-fc1f-4d1d-a401-d613a3b6ef47', 'f8927670-babf-4ffe-87ed-7e833bedc5f0', '1ccaf4df-d985-4fc9-8b5d-4acbfeb5efb7', '64bb4f0d-1fad-4ac7-98cb-2dfbee23d4a0', '40af59bd-010e-47a2-819d-149a597a24e0', '76ef74ea-e227-4760-9e24-d616e5ed71c3', 'f30c0148-e4c0-4937-a4ee-4cd26019587f');
commit;
