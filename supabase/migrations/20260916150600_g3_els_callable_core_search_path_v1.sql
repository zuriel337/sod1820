-- pgcrypto.digest lives in extensions on canonical Supabase.
-- Keep the core's explicit search_path while allowing its deterministic dependency-group hash.
alter function public.els_search_core_v1(text,text,integer,integer,text)
  set search_path = public, extensions;
