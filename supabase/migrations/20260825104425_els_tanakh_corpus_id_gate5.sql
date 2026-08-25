-- Gate #5 / WS-TANAKH closure (Master State §17) — ZURIEL Human-Gate approval in chat, 25.8.2026.
--
-- fn_els_corpus_id(p_scope) currently returns the canonical corpus_id ('0b022e8eef6f9c16')
-- only for p_scope='torah', and NULL for anything else -- including 'tanakh', the exact
-- scope string the client (tools/els/els-code.template.html, st.scope="tanakh") sends when
-- saving a full-Tanakh matrix. Every els_records row saved in Tanakh scope therefore gets
-- corpus_id=NULL (confirmed live: 43/43 scope='tanakh' rows are NULL) -- this is the open
-- item that has been sitting under WS-TANAKH / Gate #5.
--
-- The value 0b022e8eef6f9c16 is NOT specific to the Torah subset. Per the original
-- provenance comment in 20260726_name_protocol_wave2_1_els_real.sql, it is defined as
--   sha256(tools/els/data/tk-letters.txt FULL file)[0:16]
-- i.e. the content-address of the entire embedded Tanakh corpus (1,204,583 letters) --
-- independently re-verified against the live file on disk in this session (sha256 matches
-- exactly: 0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b). The Torah
-- subset (304,805 letters) is a strict prefix of that same file and has its own separate,
-- unused hash (9692eb34...) -- it was never what corpus_id actually identifies.
--
-- So "torah" and "tanakh" are two search-domain restrictions over the SAME single
-- content-addressed corpus, not two different corpora -- there is nothing to invent here,
-- only to recognize what the hash already is. This migration is therefore purely additive:
-- it teaches fn_els_corpus_id that scope='tanakh' resolves to the same corpus_id as
-- scope='torah'. Every other scope string still returns NULL (fail-safe unchanged, same
-- as before -- an unrecognized scope must never silently get a guessed identity).
--
-- Per the existing Gate #4 INSERT-only identity policy (Master State §17: "אין batch-assign,
-- אין המצאה", legacy rows opt-in re-anchor only) the 43 already-saved scope='tanakh' rows
-- with corpus_id=NULL are deliberately NOT backfilled here -- only forward saves (via
-- save_els_matrix / save_els_matrix_anon, which both already call fn_els_corpus_id(p_scope)
-- with no other change needed) start getting the correct corpus_id from this point on.

create or replace function public.fn_els_corpus_id(p_scope text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case when coalesce(nullif(p_scope,''),'torah') in ('torah','tanakh')
              then '0b022e8eef6f9c16'
              else null end
$function$;
