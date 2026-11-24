-- ZURIEL 24.11.2026: every number page (number, word or expression) is public and is counted on its own, as before 2029.
-- The only private surface is Life Journey, which never sends a number page. ingest_event admitted a page identity under
-- /number/ only for a literal number; a word page was refused and reported as the family alone. This widens exactly that
-- one rule to any single bounded segment (no slash, query, fragment or control character, at most 128 characters).
-- Nothing else in the function changes. The guard refuses an unexpected function version; the replacement must apply once.
do $migration$
declare
  v_sig constant regprocedure := 'public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure;
  v_old constant text := $$elsif v_expected ~ '^/number/[0-9]{1,12}$' then v_expected := '/number/:value';$$;
  v_new constant text := $$elsif v_expected ~ '^/number/[^/?#[:cntrl:]]{1,128}$' then v_expected := '/number/:value';$$;
  v_def text := pg_get_functiondef(v_sig);
begin
  if md5(v_def) <> '4006c82328aa8358a21ebdb5792024e3' then
    raise exception 'Unexpected ingest_event version %', md5(v_def);
  end if;
  if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then
    raise exception 'ingest_event number rule not found exactly once';
  end if;
  execute replace(v_def, v_old, v_new);
end;
$migration$;
