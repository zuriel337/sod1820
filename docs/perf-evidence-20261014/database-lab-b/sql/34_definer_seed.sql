-- ROLE B · LOCAL LAB ONLY · SYNTHETIC rows for the definer-context tables (no live data). Deterministic (hash-seeded).
\set ON_ERROR_STOP on
truncate users, nodes, topic_cards, number_anchors, metatron_anchors, convergences, relation_evidence, decision_ledger, learned_patterns, research_candidates, number_roots, number_branches, journey_seeds, word_aliases, tanach_verses;
insert into users(id, email, role) values ('aaaaaaaa-0000-0000-0000-000000000001','admin@lab','admin'), ('bbbbbbbb-0000-0000-0000-000000000002','user@lab','member');
-- nodes: number nodes (core + non-core space + inactive), rule nodes used by fn_rules_snapshot
insert into nodes(type,label,description,metadata,is_active,rule_id,rule_version)
select 'number', v::text, 'desc '||v, case when v%7=0 then '{"space":"private"}'::jsonb when v%5=0 then '{"space":"core"}'::jsonb else null end, (v%11<>0), null, null
from unnest(array[787,7871,7872,12,21,120,321,123,1820,1000,100,10,77,770,7700,7710,1230,999999,5,0,-1]) v;
insert into nodes(type,label,metadata,is_active,rule_id,rule_version) select 'rule','r'||i, '{"space":"core"}', true, r, 1 from unnest(array['equality_vs_convergence','convergence_one_per_value','unified_discovery_architecture','gold_seal_convergence','partial_convergence_approval']) with ordinality t(r,i);
-- topic cards: approved / unapproved / do-not-publish, numbers + highlight_numbers overlapping the test values
insert into topic_cards(slug,title,numbers,highlight_numbers,findings,status)
select 'c'||g, 'card '||g, array[(array[787,7871,7872,12,21,120,321,123,1820,1000,100,10,77,770,7700,7710,1230,5])[1+g%18], (array[787,7871,7872,12,21,120,321,123,1820,1000,100,10,77,770,7700,7710,1230,5])[1+(g*7)%18]],
       case when g%4=0 then array[(array[787,12,21,120])[1+g%4]] else null end,
       case when g%9=0 then '{"_do_not_publish": true, "x": 1}'::jsonb when g%5=0 then '{"a": {"_private": 1, "b": [1,2]}}'::jsonb else '{"a": 1}'::jsonb end,
       case when g%6=0 then 'draft' else 'approved' end
from generate_series(1,215) g;
insert into number_anchors(value,category,fact) select v,'c','fact '||v from unnest(array[787,7871,12,120]) v;
insert into metatron_anchors(anchor_value,label) select v,'lbl '||v from unnest(array[787,12,1820]) v;
insert into convergences(kind,method,value,phrases,group_size) select 'k', m, v, array['p1','p2','p3'], 3 from unnest(array[787,7871,12]) v, unnest(array['רגיל','siduri','אתבש']) m;
insert into relation_evidence(relation_type,method,a_phrase,b_phrase,value,note,status) select 'eq','רגיל','a','b',v,'n','approved' from unnest(array[787,12]) v;
insert into decision_ledger(decision_type,subject_type,subject_ref,human_decision,human_reason,provenance,status,reason_code,rules_snapshot) select 'convergence','number',v::text,'approve','r','{}','done','rc','[]' from unnest(array[787,7871]) v;
insert into learned_patterns(pattern_key,polarity,status) values ('pk1','pos','approved_preference'),('pk2','neg','candidate');
insert into research_candidates(subject_ref,recommendation,status) values ('787','rec','open'),('12','rec','open');
insert into number_roots(number,root_word,essence,is_active,space) values (787,'שורש','e',true,'core'),(12,'x','e',false,'core');
insert into number_branches(number,branch_name,description,phrases,is_active,sort_order,space) values (787,'b1','d',array['a','b'],true,2,'core'),(787,'b0','d',array['a'],true,1,'core'),(12,'b','d',null,true,1,'core');
insert into journey_seeds(value,readiness,status,dna) values (787,3,'seed','{"title":"t"}'),(12,1,'x',null);
-- verses: 23,204 rows like live (every verse has ragil), ragil spread to give 0..~40 verses per value around the test values
insert into tanach_verses(book_idx,book,chapter,verse,text,ragil) select 1+(g%39), 'b'||(g%39), 1+(g%50), 1+(g%30), 'v'||g, 400+(abs(hashint4(g))%8000) from generate_series(1,23204) g;
insert into tanach_verses(book_idx,book,chapter,verse,text,ragil) select 1,'x',1,g,'t'||g, v from unnest(array[787,12,21,120,321,123,1820,1000,100,10,77,770,7700,7710,1230]) v, generate_series(1,3) g;
-- word aliases for map_anchor_family
insert into word_aliases(word_id, alias, lang) select id, 'al'||row_number() over (), 'en' from gematria_words where lead_rank is not null limit 20;
update gematria_words set lead_rank = 1 where id in (select id from gematria_words order by id limit 4000);
update gematria_words set phrase = 'w'||substr(id::text,1,8) where phrase is null;
-- encrypted words that are verified + published AND have bidim rows on the test values (mechanism of the live finding, synthetic marker phrases)
create temp table enc_pick as select distinct b.word_id from bidim b join gematria_words g on g.id=b.word_id where b.value in (787,7871,12) and g.is_verified and coalesce(g.is_published,false) limit 6;
update gematria_words set is_encrypted = true, phrase_encrypted='cipher', phrase_hint='hint' where id in (select word_id from enc_pick);
update bidim set phrase = 'מוצפן'||(abs(hashtext(word_id::text))%1000) where word_id in (select word_id from enc_pick);
update gematria_words set phrase = (select b.phrase from bidim b where b.word_id=gematria_words.id limit 1) where id in (select word_id from enc_pick);
analyze;
select 'seeded: enc words '||count(*) from enc_pick;
