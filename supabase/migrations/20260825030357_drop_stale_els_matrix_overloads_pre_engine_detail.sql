-- CREATE OR REPLACE with a new trailing parameter creates a SECOND overload in Postgres rather than
-- replacing the original (functions are identified by name+arg-types) -- this repo has hit this exact
-- ambiguous-overload bug before (see migrations drop_ambiguous_set_els_meta_3arg,
-- drop_dead_save_els_matrix_overloads, 19.7.2026). Drop the pre-engine_detail signatures now that the
-- p_engine_detail-carrying versions exist, so callers can't accidentally resolve to the old one.
drop function if exists public.save_els_matrix(text, text, integer, text, jsonb, text, text, text, boolean, text, text, text, integer);
drop function if exists public.save_els_matrix_anon(text, text, text, integer, text, jsonb, text, text, text, text, integer);
