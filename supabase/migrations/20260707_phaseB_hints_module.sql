-- Phase B — «הרמזים שלי»: ארכיון רמזים אישי על גבי research_items (עץ אחד, אין טבלה מקבילה).
-- רמז = research_items bucket='hint', entity_type='hint', entity_ref=מספר דומיננטי (→/number/:n),
-- metadata = { hint_type, image_url, note, source_url, occurred_at }.

-- 1) לאפשר bucket='hint'
ALTER TABLE public.research_items DROP CONSTRAINT IF EXISTS research_items_bucket_check;
ALTER TABLE public.research_items ADD CONSTRAINT research_items_bucket_check
  CHECK (bucket = ANY (ARRAY['cart','library','draft','favorite','pinned','searched','hint']));

-- 2) my_center מחזיר גם ספירת רמזים (badge במודול)
CREATE OR REPLACE FUNCTION public.my_center(p_uid uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'posts',         public.my_post_count(p_uid),
    'research_items',(select count(*) from public.research_items where user_id = p_uid),
    'saved',         (select count(*) from public.research_items where user_id = p_uid and bucket in ('library','favorite')),
    'searched',      (select count(*) from public.research_items where user_id = p_uid and bucket = 'searched'),
    'hints',         (select count(*) from public.research_items where user_id = p_uid and bucket = 'hint'),
    'contributions', (select count(*) from public.contribution_events where user_id = p_uid),
    'is_publisher',  public.can_publish_posts(p_uid)
  );
$function$;
