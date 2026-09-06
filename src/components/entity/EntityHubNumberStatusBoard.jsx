import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNumberStatusProjection } from "../../lib/research/numberStatusProjection.js";

const T = {
  ink: "var(--eh-ink)", muted: "var(--eh-muted)", line: "var(--eh-line)",
  panel: "var(--eh-panel)", soft: "var(--eh-soft)", gold: "var(--eh-gold)",
  goldBg: "var(--eh-goldbg)", blue: "var(--eh-blue)", blueBg: "var(--eh-bluebg)",
};

const fmt = value => value == null ? "—" : new Intl.NumberFormat("he-IL").format(Number(value));
const numFromDetail = detail => {
  const m = String(detail || "").match(/\d+/);
  return m ? Number(m[0]) : null;
};

function meterLayer(meter, name) {
  return (meter?.layers || []).find(layer => layer?.name === name) || null;
}

function PulseTier({ score }) {
  const s = Number(score) || 0;
  const title = s >= 90 ? "מלכותי" : s >= 50 ? "חזק" : s >= 20 ? "מתהווה" : "שקט";
  const mark = s >= 90 ? "👑" : s >= 50 ? "🥈" : s >= 20 ? "🥉" : "·";
  return <div style={{display:"grid",placeItems:"center",width:92,height:92,borderRadius:"50%",border:`2px solid ${T.gold}`,background:T.goldBg,boxShadow:"0 0 28px rgba(212,175,55,.10)"}}>
    <div style={{textAlign:"center",lineHeight:1.05}}>
      <div style={{fontSize:17}}>{mark}</div>
      <div style={{fontSize:27,fontWeight:950,color:T.gold}}>{s}</div>
      <div style={{fontSize:9.5,color:T.muted}}>/100 · {title}</div>
    </div>
  </div>;
}

function Metric({ icon, value, label, sub }) {
  return <div style={{minWidth:0,border:`1px solid ${T.line}`,background:T.soft,borderRadius:13,padding:"9px 10px"}}>
    <div style={{display:"flex",alignItems:"baseline",gap:6}}><span aria-hidden>{icon}</span><b style={{fontSize:18}}>{value}</b></div>
    <div style={{fontSize:11.5,fontWeight:800,marginTop:2}}>{label}</div>
    {sub ? <div style={{fontSize:9.8,color:T.muted,marginTop:1}}>{sub}</div> : null}
  </div>;
}

function Facet({ active, icon, value, label, sub, onClick }) {
  return <button type="button" onClick={onClick} style={{cursor:"pointer",minWidth:0,textAlign:"right",font:"inherit",color:T.ink,border:`1px solid ${active?T.gold:T.line}`,background:active?T.goldBg:T.soft,borderRadius:13,padding:"9px 10px",boxShadow:active?"0 5px 18px rgba(154,118,23,.09)":"none"}}>
    <div style={{display:"flex",gap:7,alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontSize:13,fontWeight:850,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{icon} {label}</span>
      <b style={{fontSize:17,color:active?T.gold:T.ink,whiteSpace:"nowrap"}}>{value}</b>
    </div>
    {sub ? <div style={{fontSize:9.6,color:T.muted,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub}</div> : null}
  </button>;
}

function Chip({ children, gold = false }) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,border:`1px solid ${gold?T.gold:T.line}`,background:gold?T.goldBg:T.soft,borderRadius:999,padding:"5px 8px",fontSize:10.5,color:gold?T.gold:T.ink}}>{children}</span>;
}

export default function EntityHubNumberStatusBoard({ data, relationGroups = [], onFacet }) {
  const number = Number(data?.identity?.label);
  const nodeId = data?.identity?.nodeId || null;
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState("pulse");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setStatus(null);
    fetchNumberStatusProjection({ number, nodeId })
      .then(next => { if (alive) { setStatus(next); setLoading(false); } })
      .catch(() => { if (alive) { setStatus(null); setLoading(false); } });
    return () => { alive = false; };
  }, [number, nodeId]);

  const meter = status?.meter || null;
  const surface = data?.surface || {};
  const worlds = Array.isArray(data?.numberWorlds) ? data.numberWorlds : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const journey = data?.journeys?.numberKnowledgeJourney || null;
  const zero = data?.zeroScale || null;
  const zeroChain = Array.isArray(zero?.scale_chain) ? zero.scale_chain : [];
  const posts = Array.isArray(surface.posts) ? surface.posts : [];

  const wordLayer = meterLayer(meter, "התכנסות מילים");
  const methodsLayer = meterLayer(meter, "רב-שיטתי");
  const sameWorldLayer = meterLayer(meter, "אשכול אותו-עולם");
  const markedLayer = meterLayer(meter, "ישות מסומנת");
  const meterGraphLayer = meterLayer(meter, "קשרי גרף");
  const meterGalleryLayer = meterLayer(meter, "ראשי בגלריות");

  const entityCount = meter?.evidence_governance?.entities_scored ?? numFromDetail(wordLayer?.detail);
  const governedMethods = meter?.evidence_governance?.methods_scored_after_dependency || [];
  const methodCount = governedMethods.length || numFromDetail(methodsLayer?.detail);
  const worldEntityCount = worlds.reduce((sum, world) => sum + Number(world?.count || 0), 0);
  const galleryMentions = surface.galleriesCount ?? surface.galleries?.length ?? null;
  const postCount = status?.counts?.strictPosts;
  const postValue = status?.counts?.strictPostsCapped && postCount != null ? `${fmt(postCount)}+` : fmt(postCount);

  const analytics = status?.analytics || {};
  const score = meter?.score ?? 0;
  const indexable = status?.discovery?.indexable;

  const facetList = useMemo(() => [
    { key:"entities", icon:"🔢", label:"ישויות", value:fmt(entityCount), sub:"התכנסות מנועית", dna:"expressions" },
    { key:"methods", icon:"🧮", label:"שיטות מחזקות", value:fmt(methodCount), sub:"governed evidence", dna:"multi" },
    { key:"worlds", icon:"🌍", label:"עולמות", value:fmt(worlds.length), sub:`${fmt(worldEntityCount)} שיוכים`, dna:"worlds" },
    { key:"reality", icon:"🖼", label:"מציאות / תמונות", value:`${fmt(status?.counts?.galleryPrimary)}/${fmt(galleryMentions)}`, sub:"ראשי / כל המופעים" },
    { key:"posts", icon:"📖", label:"פוסטים", value:postValue, sub:"סינון רלוונטיות מחמיר" },
    { key:"topics", icon:"🧩", label:"התכנסויות", value:fmt(topics.length), sub:"Topic Cards מאושרים" },
    { key:"graph", icon:"🕸", label:"Reality Graph", value:fmt(status?.counts?.graphEdges), sub:"כל ה־edges הציבוריים", dna:"links" },
    { key:"phrases", icon:"🧬", label:"ביטויים", value:fmt(surface.phrasesCount ?? surface.phrases?.length), sub:"מאגר הביטויים" , dna:"expressions"},
    { key:"sources", icon:"📚", label:"מקורות", value:fmt(sources.length), sub:"מקורות מחוברים" },
    { key:"journey", icon:"🧭", label:"מסע", value:journey ? fmt(journey.branches?.length || 1) : "—", sub:journey?"ענפים / תחנות":"אין מסע כרגע" },
    { key:"els", icon:"🔠", label:"ELS / צפנים", value:fmt(status?.counts?.ciphers), sub:"published ומחובר למספר" },
    { key:"zero", icon:"0️⃣", label:"סדרת האפס", value:zero?.applicable ? fmt(zeroChain.length) : "—", sub:zero?.applicable?`שורש ${zero.core_root}`:"לא ישים" },
  ], [entityCount,methodCount,worlds.length,worldEntityCount,status,galleryMentions,postValue,topics.length,surface,sources.length,journey,zero,zeroChain.length]);

  const selectFacet = item => {
    setFocus(item.key);
    if (item.dna) onFacet?.(item.dna);
  };

  const detail = (() => {
    if (focus === "entities") {
      const evidence = Array.isArray(wordLayer?.evidence) ? wordLayer.evidence : [];
      return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{evidence.slice(0,16).map((item,i) => {
        const label = typeof item === "string" ? item : item?.label;
        if (!label) return null;
        return <Link key={`${label}-${i}`} to={`/number/${encodeURIComponent(label)}`} style={{textDecoration:"none",color:"inherit"}}><Chip gold={Boolean(item?.tier)}>{item?.tier==="silver"?"🥈 ":item?.tier==="gold"?"👑 ":""}{label}{item?.method?` · ${item.method}`:""}</Chip></Link>;
      })}</div>;
    }
    if (focus === "methods") return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{governedMethods.length ? governedMethods.map(method => <Chip key={method} gold>{method}</Chip>) : <span style={{color:T.muted}}>אין פירוט שיטות זמין כרגע.</span>}</div>;
    if (focus === "worlds") return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{worlds.length ? worlds.map(world => <Chip key={world.world} gold={world.world==="גאולה"}>{world.world} · {world.count}</Chip>) : <span style={{color:T.muted}}>אין שיוך עולם חי.</span>}</div>;
    if (focus === "reality") return <div style={{display:"grid",gap:5,fontSize:11.5}}><div>🖼 ציבורי: <b>{fmt(status?.counts?.galleryPrimary)}</b> תמונות שבהן {number} הוא מספר ראשי · <b>{fmt(galleryMentions)}</b> מופעים בכלל.</div>{meterGalleryLayer?.detail ? <div style={{color:T.muted}}>מד ההתכנסות מחזיק scope דירוג משלו: {meterGalleryLayer.detail}. הוא נשמר בנפרד מה־Projection הציבורי.</div> : null}<Link to="/gallery" style={{color:T.gold,fontWeight:850,textDecoration:"none"}}>פתח את שכבת המציאות ←</Link></div>;
    if (focus === "posts") return <div style={{display:"grid",gap:6}}>{posts.length ? posts.slice(0,3).map(post => <Link key={post.id||post.wp_id||post.slug} to={`/${post.slug}`} style={{color:T.ink,textDecoration:"none",fontSize:11.5}}>{post.title?.rendered || post.title || post.slug} ←</Link>) : <span style={{color:T.muted}}>אין דוגמת פוסט בחלון הנוכחי.</span>}</div>;
    if (focus === "topics") return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{topics.length ? topics.map(topic => <Link key={topic.slug} to={`/topic/${encodeURIComponent(topic.slug)}`} style={{textDecoration:"none",color:"inherit"}}><Chip gold>{topic.title||topic.slug}</Chip></Link>) : <span style={{color:T.muted}}>אין Topic מאושר כרגע.</span>}</div>;
    if (focus === "graph") return <div style={{display:"grid",gap:6}}><div style={{fontSize:11.5}}>🕸 <b>{fmt(status?.counts?.graphEdges)}</b> edges ציבוריים מחוברים ל־Node של {number}.</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{relationGroups.map(([name,rows]) => <Chip key={name}>{name} · {rows.length}</Chip>)}</div>{meterGraphLayer?.detail ? <div style={{fontSize:10,color:T.muted}}>שכבת הדירוג של convergence_meter מציגה בנפרד: {meterGraphLayer.detail}.</div> : null}</div>;
    if (focus === "phrases") return <div style={{fontSize:11.5}}>מאגר הישות מחזיר <b>{fmt(surface.phrasesCount ?? surface.phrases?.length)}</b> ביטויים בחלון הציבורי. פירוק לפי שיטה נמצא מיד מתחת בלשונית ביטויים/רב־שיטתי.</div>;
    if (focus === "sources") return <div style={{display:"grid",gap:5}}>{sources.length ? sources.slice(0,10).map((source,i) => <div key={`${source.ref||source.label}-${i}`} style={{fontSize:10.8}}>• {source.label}</div>) : <span style={{color:T.muted}}>אין מקור ציבורי מוקרן כרגע.</span>}</div>;
    if (focus === "journey") return journey ? <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(journey.branches||[]).slice(0,10).map((branch,i) => <Chip key={branch.id||i}>{branch.label||branch.value||branch.kind||`תחנה ${i+1}`}</Chip>)}</div> : <span style={{color:T.muted}}>אין Journey קנוני כרגע — לא ממציאים אחד.</span>;
    if (focus === "els") return <div style={{fontSize:11.5}}>🔠 <b>{fmt(status?.counts?.ciphers)}</b> צפנים מפורסמים מחוברים ישירות ל־{number} דרך primary_number/anchor_numbers. אפס נשאר גלוי — Rank, Don’t Hide.</div>;
    if (focus === "zero") return zero?.applicable ? <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{zeroChain.map(value => <Link key={value} to={`/number/${value}`} style={{textDecoration:"none",color:"inherit"}}><Chip gold={value===number}>{value}</Chip></Link>)}</div> : <span style={{color:T.muted}}>סדרת האפס אינה ישימה לפי fn_zero_scale.</span>;

    return <div style={{display:"grid",gap:7}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(meter?.layers||[]).map((layer,i) => <Chip key={`${layer.name}-${i}`} gold={layer.ok}>{layer.icon} {layer.name} · {layer.detail||"—"}</Chip>)}</div>
      {markedLayer?.detail ? <div style={{fontSize:10.5,color:T.muted}}>ישות מסומנת: {markedLayer.detail} · אותו־עולם: {sameWorldLayer?.detail||"—"}</div> : null}
    </div>;
  })();

  if (!Number.isSafeInteger(number) || number < 1) return null;

  return <section style={{background:T.panel,border:`1px solid ${T.line}`,borderRadius:20,padding:14,boxShadow:"0 8px 28px rgba(0,0,0,.06)"}}>
    <div style={{display:"grid",gridTemplateColumns:"auto minmax(0,1fr)",gap:14,alignItems:"center"}}>
      <PulseTier score={score} />
      <div style={{minWidth:0}}>
        <div style={{fontSize:10,fontWeight:900,letterSpacing:1.5,color:T.gold}}>LIVE ENTITY STATUS · ONE REALITY</div>
        <div style={{display:"flex",gap:8,alignItems:"baseline",flexWrap:"wrap",marginTop:3}}><h2 style={{margin:0,fontSize:31,lineHeight:1}}>{number}</h2><span style={{fontSize:11.5,fontWeight:850,color:T.gold}}>● מספר חי במערכת</span></div>
        <div style={{fontSize:11,color:T.muted,marginTop:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{meter?.anchor || "מרכז מצב דינמי — כל הנתונים נקראים מהמערכת החיה"}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}><Chip gold>דופק {fmt(score)}/100</Chip>{indexable===true?<Chip>SEO · ניתן לאינדוקס</Chip>:indexable===false?<Chip>SEO · לא מאונדקס</Chip>:null}</div>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7,marginTop:12}}>
      <Metric icon="👁" value={loading?"…":fmt(analytics.viewsAll)} label="צפיות" sub={analytics.views30!=null?`${fmt(analytics.views30)} ב־30 יום`:"view_count"} />
      <Metric icon="🔎" value={loading?"…":fmt(analytics.searches)} label="חיפושים" sub="search_log · לא צפיות" />
      <Metric icon="🕸" value={loading?"…":fmt(status?.counts?.graphEdges)} label="קשרי Graph" sub="טופולוגיה מלאה" />
      <Metric icon="👥" value={loading?"…":fmt(analytics.collective)} label="חוקרים" sub="אוספים את הישות" />
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(128px,1fr))",gap:7,marginTop:10}}>
      {facetList.map(item => <Facet key={item.key} {...item} active={focus===item.key} onClick={()=>selectFacet(item)} />)}
    </div>

    <div style={{marginTop:10,border:`1px solid ${T.line}`,background:T.soft,borderRadius:14,padding:"10px 11px",minHeight:48}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:7}}><b style={{fontSize:11.5}}>{focus==="pulse"?"שכבות הדופק":"פירוט · "+(facetList.find(item=>item.key===focus)?.label||focus)}</b><button type="button" onClick={()=>setFocus("pulse")} style={{border:0,background:"transparent",color:T.gold,font:"inherit",fontSize:10.5,fontWeight:850,cursor:"pointer"}}>שכבות הדופק</button></div>
      {loading ? <div style={{color:T.muted,fontSize:11}}>טוען Readers חיים…</div> : detail}
    </div>

    <div style={{fontSize:9.3,color:T.muted,marginTop:8,lineHeight:1.5}}>הציון והשכבות מגיעים מ־convergence_meter · צפיות מ־view_count · חיפושים מ־search_log · Graph/גלריה/ELS נקראים דרך ה־RLS הציבורי. ספירות בעלות scope שונה אינן מאוחדות זו בזו.</div>
  </section>;
}
