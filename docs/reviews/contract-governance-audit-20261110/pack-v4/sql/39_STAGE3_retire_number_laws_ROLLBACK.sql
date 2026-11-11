-- SOD1820 · ROLLBACK of 30_STAGE3_retire_number_laws.sql — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
begin;
update public.nodes set is_active=true where type='rule' and not is_active and rule_version=1 and rule_id in ('number_page_law','no_row_without_number_law');
commit;
