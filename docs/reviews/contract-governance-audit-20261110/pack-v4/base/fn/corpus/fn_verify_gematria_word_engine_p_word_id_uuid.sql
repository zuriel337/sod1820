CREATE OR REPLACE FUNCTION public.fn_verify_gematria_word_engine(p_word_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v public.gematria_words%rowtype;
  v_ok boolean := false;
BEGIN
  SELECT * INTO v FROM public.gematria_words WHERE id = p_word_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v.phrase !~ '^[א-ת]+( [א-ת]+)*$' THEN
    UPDATE public.gematria_words SET is_verified = false WHERE id = p_word_id;
    RETURN false;
  END IF;
  IF v.ragil IS NULL OR v.misratar IS NULL OR v.miluy IS NULL OR v.kadmi IS NULL
     OR v.gadol IS NULL OR v.siduri IS NULL OR v.atbash IS NULL OR v.albam IS NULL
     OR v.miluy_demiluy IS NULL OR v.kadmi_gadol IS NULL OR v.ribua IS NULL
     OR v.ribua_gadol IS NULL OR v.hakpala IS NULL OR v.hakpala_gadol IS NULL THEN
    UPDATE public.gematria_words SET is_verified = false WHERE id = p_word_id;
    RETURN false;
  END IF;
  v_ok := NOT EXISTS (SELECT 1 FROM public.gematria_integrity gi WHERE gi.id = p_word_id);
  UPDATE public.gematria_words SET is_verified = v_ok WHERE id = p_word_id;
  RETURN v_ok;
END;
$function$
