-- Read-only preflight; abort on drift. Values captured from the connected live project 2026-11-20.
do $$ begin
 if md5(pg_get_functiondef('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure)) <> 'e7017ece28ccfe1b59fb9b5f66e8af44' then raise exception 'preimage drift: ingest_event'; end if;
 if md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure)) <> 'fb315aae28cce31eb0f462ed6b6e7bd9' then raise exception 'preimage drift: admin_2029_analytics'; end if;
 if md5(pg_get_functiondef('public.recent_number_opens(integer)'::regprocedure)) <> '0faaf48ad941a11b37a9c172c287d0f2' then raise exception 'preimage drift: recent_number_opens'; end if;
 if md5(pg_get_functiondef('public.add_wall_word(text,integer)'::regprocedure)) <> '72e441984c14da6fdf2b5ec3a7a77282' then raise exception 'preimage drift: add_wall_word'; end if;
end $$;
