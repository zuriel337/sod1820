CREATE OR REPLACE FUNCTION public.rd_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$function$
