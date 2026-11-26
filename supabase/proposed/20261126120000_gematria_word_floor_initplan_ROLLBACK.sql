-- ROLLBACK for 20261126120000_gematria_word_floor_initplan_PROPOSAL.sql. Restores the exact previous expression. NOT APPLIED.
begin;
  alter policy ti_public_word_floor on public.gematria_words using (rd_is_admin() or gematria_public_word_eligible(id));
commit;
