-- ROLLBACK for world_group_source_youtube_links_v1 (applied 11.11.2026). Restores the exact previous definition (md5 473ea5b4613fcf45b7dee3e2d8984715):
-- it swaps the two-step YouTube-preserving expression back to the original single expression, inside the live text, so whitespace stays identical.
do $r$
declare v text := pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure);
begin
  v := replace(v, $n$regexp_replace(regexp_replace(cu.text, '((https?://)?(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])\S*', '\1', 'gi'), '(https?://|www\.)(?!(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}(?![A-Za-z0-9_-]))\S+', '[קישור]', 'gi')$n$,
                  $o$regexp_replace(cu.text, '(https?://|www\.)\S+', '[קישור]', 'gi')$o$);
  execute v;
  if md5(pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure)) <> '473ea5b4613fcf45b7dee3e2d8984715' then raise exception 'rollback did not restore the exact definition'; end if;
end $r$;
