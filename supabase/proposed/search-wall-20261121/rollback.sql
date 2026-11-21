-- Rollback: removes the writer and the reader. The source column and its rows stay (no data is deleted).
drop function if exists public.admin_search_wall_2029(integer, text, text, timestamptz);
drop function if exists public.log_search_2029(text, integer, text);
