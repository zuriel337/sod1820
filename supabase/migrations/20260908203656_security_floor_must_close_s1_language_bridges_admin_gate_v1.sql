-- Security Floor MUST-CLOSE S1 — project_language_bridges() admin gate.
-- Second ungated graph-write path (nodes/edges) reachable by any authenticated user.
-- Adds ONLY the canonical gate already used by project_contribution_to_graph.
-- Body, graph semantics, provenance metadata and return shape are unchanged.
-- Reversible: re-apply the previous definition without the gate block.

create or replace function public.project_language_bridges()
 returns table(links integer, bridges integer, edges_made integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
declare
  l record; he_id uuid; fw_id uuid; br_id uuid;
  n_links int:=0; n_bridges int:=0; n_edges int:=0;
begin
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;

  for l in select * from public.language_links where status in ('approved','verified') loop
    n_links := n_links + 1;

    -- 1) node עברי (ישות קיימת אם יש, אחרת נוצר)
    select id into he_id from public.nodes where type='entity' and label=l.hebrew limit 1;
    if he_id is null then
      insert into public.nodes(type,label,description,is_active,metadata)
      values('entity', l.hebrew, null, true, jsonb_build_object('lang','he','source','language_bridge'))
      returning id into he_id;
    end if;

    -- 2) node מילה-לועזית
    select id into fw_id from public.nodes where type='foreign_word' and label=l.foreign_word and metadata->>'lang'=l.lang limit 1;
    if fw_id is null then
      insert into public.nodes(type,label,is_active,metadata)
      values('foreign_word', l.foreign_word, true, jsonb_build_object('lang',l.lang))
      returning id into fw_id;
    end if;

    -- 3) node הגשר — הישות המחקרית עצמה, עם כל שדות הפרובננס
    select id into br_id from public.nodes where type='language_bridge' and metadata->>'link_id'=l.id::text limit 1;
    if br_id is null then
      insert into public.nodes(type,label,description,weight,is_active,metadata)
      values('language_bridge', l.hebrew||' ↔ '||l.foreign_word, l.note,
        case l.evidence_level when 'strong' then 3 when 'medium' then 2 else 1 end,
        true,
        jsonb_build_object(
          'link_id', l.id, 'lang', l.lang,
          'he_word', l.hebrew, 'foreign_word', l.foreign_word,
          'relationship_type', l.relationship_type, 'method', l.method,
          'value', l.gematria_he, 'translation_source', l.translation_source,
          'evidence_level', l.evidence_level, 'human_verified', l.human_verified,
          'source', 'language_links'))
      returning id into br_id;
      n_bridges := n_bridges + 1;
    else
      update public.nodes set label=l.hebrew||' ↔ '||l.foreign_word, description=l.note,
        weight=case l.evidence_level when 'strong' then 3 when 'medium' then 2 else 1 end,
        metadata=jsonb_build_object(
          'link_id', l.id, 'lang', l.lang,
          'he_word', l.hebrew, 'foreign_word', l.foreign_word,
          'relationship_type', l.relationship_type, 'method', l.method,
          'value', l.gematria_he, 'translation_source', l.translation_source,
          'evidence_level', l.evidence_level, 'human_verified', l.human_verified,
          'source', 'language_links')
      where id=br_id;
    end if;

    -- 4) edges נושאי-פרובננס (לא שוויון-בלבד): he→bridge, bridge→foreign
    if not exists (select 1 from public.edges where from_node=he_id and to_node=br_id and relation_type='has_language_bridge') then
      insert into public.edges(from_node,to_node,relation_type,weight,metadata)
      values(he_id, br_id, 'has_language_bridge', 1,
        jsonb_build_object('method',l.method,'value',l.gematria_he,'lang',l.lang,'evidence_level',l.evidence_level,'human_verified',l.human_verified));
      n_edges := n_edges + 1;
    end if;
    if not exists (select 1 from public.edges where from_node=br_id and to_node=fw_id and relation_type='bridges_to') then
      insert into public.edges(from_node,to_node,relation_type,weight,metadata)
      values(br_id, fw_id, 'bridges_to', 1,
        jsonb_build_object('method',l.method,'value',l.gematria_he,'lang',l.lang,'relationship_type',l.relationship_type));
      n_edges := n_edges + 1;
    end if;
  end loop;
  return query select n_links, n_bridges, n_edges;
end $fn$;
