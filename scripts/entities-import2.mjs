// ייבוא-דלתא: ישויות batch-2 + תיאורים לכולן + קשרים חדשים. אידמפוטנטי, source='entity_seed_v1'.
import fs from 'fs';
import { WORLDS_EXT, DESC, buildEntities } from './entities-seed.mjs';
const {ents,edges}=buildEntities();
const ext=new Set(Object.keys(WORLDS_EXT));
const batch2=ents.filter(e=>ext.has(e.world));
const Q=s=>"'"+String(s).replace(/'/g,"''")+"'";
const arr=a=>"'{"+a.map(x=>'"'+x+'"').join(",")+"}'";
const SRC='entity_seed_v1';

const nodeRows=batch2.map(e=>{
  const meta=JSON.stringify({source:SRC,world:e.world,tags:e.tags,importance:e.importance});
  return `(${Q(e.label)},${e.importance},${e.desc?Q(e.desc):'null'},$j$${meta}$j$)`;
}).join(",\n");

const descRows=ents.filter(e=>e.desc).map(e=>`(${Q(e.label)},${Q(e.desc)})`).join(",\n");

const gwRows=batch2.map(e=>{
  const av=[...new Set([e.ragil,e.miluy,e.misratar,e.kadmi,e.gadol,e.siduri,e.atbash,e.albam])];
  return `(${Q(e.label)},${e.ragil},${e.miluy},${e.misratar},${e.kadmi},${e.gadol},${e.siduri},${e.atbash},${e.albam},'{${av.join(",")}}',${arr(e.tags)})`;
}).join(",\n");

const edgeRows=edges.map(([a,b])=>`(${Q(a)},${Q(b)})`).join(",\n");

const sql=`-- A) nodes batch-2 (עם description)
insert into nodes (type,label,weight,is_active,description,metadata)
select 'entity',v.label,v.importance,true,v.descr,v.meta::jsonb
from (values\n${nodeRows}\n) v(label,importance,descr,meta)
where not exists (select 1 from nodes n where n.label=v.label and n.metadata->>'source'='${SRC}');

-- B) תיאורים לכל הישויות (כולל batch-1)
update nodes n set description=d.descr
from (values\n${descRows}\n) d(label,descr)
where n.metadata->>'source'='${SRC}' and n.label=d.label and (n.description is null or n.description<>d.descr);

-- C) קישור ביטויים קיימים
update gematria_words gw set node_id=n.id
from nodes n where n.metadata->>'source'='${SRC}' and n.label=gw.phrase and gw.node_id is null;

-- D) ביטויים חדשים (8 שיטות)
insert into gematria_words (phrase,ragil,miluy,misratar,kadmi,gadol,siduri,atbash,albam,all_values,tags,is_verified,source,node_id,space,dna_status)
select v.label,v.ragil,v.miluy,v.misratar,v.kadmi,v.gadol,v.siduri,v.atbash,v.albam,v.allv::int[],v.tags::text[],true,'${SRC}',n.id,'core','core'
from (values\n${gwRows}\n) v(label,ragil,miluy,misratar,kadmi,gadol,siduri,atbash,albam,allv,tags)
join nodes n on n.label=v.label and n.metadata->>'source'='${SRC}'
where not exists (select 1 from gematria_words gw where gw.phrase=v.label);

-- E) קשרים (כל 379, אידמפוטנטי)
insert into edges (from_node,to_node,relation_type,weight,metadata)
select a.id,b.id,'related',1,'{"source":"${SRC}"}'::jsonb
from (values\n${edgeRows}\n) p(f,t)
join nodes a on a.label=p.f and a.metadata->>'source'='${SRC}'
join nodes b on b.label=p.t and b.metadata->>'source'='${SRC}'
where not exists (select 1 from edges e where e.from_node=a.id and e.to_node=b.id and e.relation_type='related');
`;
fs.writeFileSync(new URL('./entities-import2.sql',import.meta.url),sql);
console.log(`batch2 nodes:${batch2.length} | desc:${ents.filter(e=>e.desc).length} | edges:${edges.length} | bytes:${sql.length}`);
