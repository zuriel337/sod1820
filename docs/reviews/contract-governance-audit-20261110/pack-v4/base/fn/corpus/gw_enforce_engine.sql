CREATE OR REPLACE FUNCTION public.gw_enforce_engine()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_calc text;
begin
  v_calc := fn_normalize_for_calc(NEW.phrase);

  if v_calc ~ '^[א-ת]+( [א-ת]+)*$' then
    NEW.ragil         := ragil_calc(v_calc);
    NEW.misratar      := mistater_calc(v_calc);
    NEW.miluy         := miluy_calc(v_calc);
    NEW.kadmi         := kadmi_calc(v_calc);
    NEW.gadol         := gadol_calc(v_calc);
    NEW.siduri        := siduri_calc(v_calc);
    NEW.atbash        := atbash_calc(v_calc);
    NEW.albam         := albam_calc(v_calc);
    NEW.miluy_demiluy := miluy_demiluy_calc(v_calc);
    NEW.kadmi_gadol   := kadmi_gadol_calc(v_calc);
    NEW.ribua         := ribua_calc(v_calc);
    NEW.ribua_gadol   := ribua_gadol_calc(v_calc);
    NEW.hakpala       := hakpala_calc(v_calc);
    NEW.hakpala_gadol := hakpala_gadol_calc(v_calc);
  end if;

  NEW.all_values := (
    select array_agg(distinct v order by v)
    from unnest(array[NEW.ragil, NEW.misratar, NEW.gadol, NEW.siduri, NEW.miluy, NEW.kadmi,
                       NEW.atbash, NEW.albam, NEW.ribua, NEW.kadmi_gadol, NEW.miluy_demiluy,
                       NEW.ribua_gadol, NEW.hakpala, NEW.hakpala_gadol]) v
    where v is not null
  );

  return NEW;
end; $function$
