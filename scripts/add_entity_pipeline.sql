-- ===== צינור הוספת ישויות (entity_expansion) =====
-- מילה → node (type=entity, world/weight/value) + שורה מאומתת ב-gematria_words (8 שיטות מחושבות)
-- → מופיעה מיד ב-bidim ובדף ההצלבות. בטוח לדה-דופ (לא משכפל ביטוי קיים).
-- דורש את פונקציות החישוב מ-scripts/gematria_calc_functions.sql.
-- שימוש: select add_entity('ביאת המשיח', 'גאולה', 4);   -- (label, world, weight, tier=null)

create or replace function add_entity(
  p_label text, p_world text, p_weight int default 3,
  p_tier text default null, p_category text default 'ישות'
) returns text language plpgsql as $$
declare
  v_ragil int := ragil_calc(p_label);
  v_node uuid;
  v_gw uuid;
begin
  if p_label is null or length(trim(p_label)) = 0 then return 'skip: empty'; end if;
  p_label := trim(p_label);

  select id into v_node from nodes where type='entity' and label = p_label limit 1;
  if v_node is null then
    insert into nodes (type, label, weight, is_active, metadata)
    values ('entity', p_label, p_weight, true,
      jsonb_build_object('world', p_world, 'value', v_ragil, 'source', 'entity_expansion_v1')
      || case when p_tier is not null then jsonb_build_object('tier', p_tier) else '{}'::jsonb end)
    returning id into v_node;
  end if;

  select id into v_gw from gematria_words where phrase = p_label limit 1;
  if v_gw is null then
    insert into gematria_words (phrase, ragil, miluy, misratar, kadmi, gadol, siduri, atbash, albam,
      is_verified, category, source, node_id)
    values (p_label, v_ragil, miluy_calc(p_label), mistater_calc(p_label), kadmi_calc(p_label),
      gadol_calc(p_label), siduri_calc(p_label), atbash_calc(p_label), albam_calc(p_label),
      true, p_category, 'entity_expansion_v1', v_node);
  else
    update gematria_words set is_verified = true, node_id = coalesce(node_id, v_node)
    where id = v_gw and (is_verified is distinct from true or node_id is null);
  end if;

  return p_label || ' = ' || v_ragil;
end; $$;
