-- G3 callable ELS wrapper security/root-of-trust fix.
-- The internal core is service_role-only. Public/legacy wrappers must execute it through their
-- bounded SECURITY DEFINER boundary, otherwise an anon/authenticated caller would fail on the
-- nested core EXECUTE permission. Fixed search_path prevents caller-controlled resolution.

alter function public.els_search_v1(text,text,integer,integer,text)
  security definer;
alter function public.els_search_v1(text,text,integer,integer,text)
  set search_path = public, extensions;

alter function public.fn_els_search(text,integer,integer)
  security definer;
alter function public.fn_els_search(text,integer,integer)
  set search_path = public, extensions;

-- Keep privilege surfaces explicit after SECURITY DEFINER conversion.
revoke all on function public.els_search_v1(text,text,integer,integer,text) from public;
grant execute on function public.els_search_v1(text,text,integer,integer,text) to anon, authenticated, service_role;

grant execute on function public.fn_els_search(text,integer,integer) to public;
