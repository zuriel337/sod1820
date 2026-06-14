// מחולל SQL אידמפוטנטי לייבוא זרע הישויות למסד (nodes + gematria_words + edges).
// תגית מקור: metadata.source='entity_seed_v1' → הכל הפיך: delete from edges/nodes where source tag; gematria_words.source.
import fs from 'fs';
import { buildEntities } from './entities-seed.mjs';
const {ents,edges}=buildEntities();
const Q=s=>"'"+String(s).replace(/'/g,"''")+"'";
const arr=a=>"'{"+a.map(x=>'"'+String(x).replace(/"/g,'\\"')+'"').join(",")+"}'";
const SRC='entity_seed_v1';

const nodeRows=ents.map(e=>{
  const meta=JSON.stringify({source:SRC,world:e.world,tags:e.tags,importance:e.importance});
  return `(${Q(e.label)},${e.importance},$j$${meta}$j$)`;
}).join(",\n");

const gwRows=ents.map(e=>{
  const av=[...new Set([e.ragil,e.miluy,e.misratar,e.kadmi,e.gadol,e.siduri,e.atbash,e.albam])];
  return `(${Q(e.label)},${e.ragil},${e.miluy},${e.misratar},${e.kadmi},${e.gadol},${e.siduri},${e.atbash},${e.albam},'{${av.join(",")}}',${arr(e.tags)})`;
}).join(",\n");

const edgeRows=edges.map(([a,b])=>`(${Q(a)},${Q(b)})`).join(",\n");

const sql=`-- 1) ישויות → nodes
insert into nodes (type,label,weight,is_active,metadata)
select 'entity', v.label, v.importance, true, v.meta::jsonb
from (values
${nodeRows}
) v(label,importance,meta)
where not exists (select 1 from nodes n where n.label=v.label and n.metadata->>'source'='${SRC}');

-- 2) קישור ביטויים קיימים ל-node החדש
update gematria_words gw set node_id=n.id
from nodes n
where n.metadata->>'source'='${SRC}' and n.label=gw.phrase and gw.node_id is null;

-- 3) הוספת ביטויים חדשים (8 שיטות) + קישור
insert into gematria_words (phrase,ragil,miluy,misratar,kadmi,gadol,siduri,atbash,albam,all_values,tags,is_verified,source,node_id,space,dna_status)
select v.label,v.ragil,v.miluy,v.misratar,v.kadmi,v.gadol,v.siduri,v.atbash,v.albam,v.allv::int[],v.tags::text[],true,'${SRC}',n.id,'core','core'
from (values
${gwRows}
) v(label,ragil,miluy,misratar,kadmi,gadol,siduri,atbash,albam,allv,tags)
join nodes n on n.label=v.label and n.metadata->>'source'='${SRC}'
where not exists (select 1 from gematria_words gw where gw.phrase=v.label);

-- 4) קשרים → edges
insert into edges (from_node,to_node,relation_type,weight,metadata)
select a.id,b.id,'related',1,'{"source":"${SRC}"}'::jsonb
from (values
${edgeRows}
) p(f,t)
join nodes a on a.label=p.f and a.metadata->>'source'='${SRC}'
join nodes b on b.label=p.t and b.metadata->>'source'='${SRC}'
where not exists (select 1 from edges e where e.from_node=a.id and e.to_node=b.id and e.relation_type='related');
`;
fs.writeFileSync(new URL('./entities-import.sql',import.meta.url), sql);
console.log("SQL bytes:", sql.length, "| nodes:", ents.length, "| edges:", edges.length);
