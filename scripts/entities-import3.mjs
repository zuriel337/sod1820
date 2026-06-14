import fs from 'fs';
import { WORLDS_EXT2, buildEntities } from './entities-seed.mjs';
const {ents,edges}=buildEntities();
const ext=new Set(Object.keys(WORLDS_EXT2));
const b=ents.filter(e=>ext.has(e.world));
const blabels=new Set(b.map(e=>e.label));
const Q=s=>"'"+String(s).replace(/'/g,"''")+"'";
const arr=a=>"'{"+a.map(x=>'"'+x+'"').join(",")+"}'";
const SRC='entity_seed_v1';
const nodeRows=b.map(e=>`(${Q(e.label)},${e.importance},${e.desc?Q(e.desc):'null'},$j$${JSON.stringify({source:SRC,world:e.world,tags:e.tags,importance:e.importance})}$j$)`).join(",\n");
const gwRows=b.map(e=>{const av=[...new Set([e.ragil,e.miluy,e.misratar,e.kadmi,e.gadol,e.siduri,e.atbash,e.albam])];return `(${Q(e.label)},${e.ragil},${e.miluy},${e.misratar},${e.kadmi},${e.gadol},${e.siduri},${e.atbash},${e.albam},'{${av.join(",")}}',${arr(e.tags)})`;}).join(",\n");
// edges שנוגעים לפחות בישות אחת חדשה
const eRows=edges.filter(([a,c])=>blabels.has(a)||blabels.has(c)).map(([a,c])=>`(${Q(a)},${Q(c)})`).join(",\n");
const sql=`insert into nodes (type,label,weight,is_active,description,metadata)
select 'entity',v.label,v.importance,true,v.descr,v.meta::jsonb
from (values\n${nodeRows}\n) v(label,importance,descr,meta)
where not exists (select 1 from nodes n where n.label=v.label and n.metadata->>'source'='${SRC}');

update gematria_words gw set node_id=n.id
from nodes n where n.metadata->>'source'='${SRC}' and n.label=gw.phrase and gw.node_id is null;

insert into gematria_words (phrase,ragil,miluy,misratar,kadmi,gadol,siduri,atbash,albam,all_values,tags,is_verified,source,node_id,space,dna_status)
select v.label,v.ragil,v.miluy,v.misratar,v.kadmi,v.gadol,v.siduri,v.atbash,v.albam,v.allv::int[],v.tags::text[],true,'${SRC}',n.id,'core','core'
from (values\n${gwRows}\n) v(label,ragil,miluy,misratar,kadmi,gadol,siduri,atbash,albam,allv,tags)
join nodes n on n.label=v.label and n.metadata->>'source'='${SRC}'
where not exists (select 1 from gematria_words gw where gw.phrase=v.label);

insert into edges (from_node,to_node,relation_type,weight,metadata)
select a.id,b.id,'related',1,'{"source":"${SRC}"}'::jsonb
from (values\n${eRows}\n) p(f,t)
join nodes a on a.label=p.f and a.metadata->>'source'='${SRC}'
join nodes b on b.label=p.t and b.metadata->>'source'='${SRC}'
where not exists (select 1 from edges e where e.from_node=a.id and e.to_node=b.id and e.relation_type='related');`;
fs.writeFileSync(new URL('./entities-import3.sql',import.meta.url),sql);
console.log(`batch3 nodes:${b.length} edges:${eRows.split('\n').length} bytes:${sql.length}`);
