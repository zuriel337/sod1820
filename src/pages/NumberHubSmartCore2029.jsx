import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { supabase } from "../lib/supabase.js";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { numberAnchorToUniversalFinding } from "../lib/research/numberAnchorFinding.js";
import { entityFromNumber } from "../lib/research/entity.js";
import PulseRing, { pulseFromCounts } from "../components/PulseRing.jsx";
import QuickActions from "../components/QuickActions.jsx";
import WatchButton from "../components/WatchButton.jsx";
import AskRaziel from "../components/AskRaziel.jsx";
import ConvergenceMeter from "../components/ConvergenceMeter.jsx";
import NumberDNA from "../components/NumberDNA.jsx";

const CORE_METHOD_KEYS = ["רגיל", "מסתתר", "קדמי", "משולש", "מילוי", "אתבש", "אי״ק בכ״ר", "גדול"];

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}
function methodLabel(group) { return group?.registry?.display_label || group?.method || "שיטה"; }
function short(text, max = 110) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max).trim()}…` : s;
}
function cleanAnchorPhrase(fact, number) {
  const text = String(fact || "").trim();
  if (!text) return "";
  const rhs = text.split("=").slice(1).join("=").trim();
  if (!rhs) return "";
  return rhs.replace(new RegExp(`^${number}\\s*`), "").replace(/\([^)]*\)\s*$/, "").trim();
}

function MethodTraceMini({ methodKey, phrase, P }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ loading:false, finding:null, error:null });
  useEffect(() => { setOpen(false); setState({ loading:false, finding:null, error:null }); }, [methodKey, phrase]);
  async function load() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!methodKey || !phrase || state.loading || state.finding || state.error) return;
    setState({ loading:true, finding:null, error:null });
    try { setState({ loading:false, finding:await fetchGematriaMethodTrace(methodKey, phrase), error:null }); }
    catch (error) { setState({ loading:false, finding:null, error }); }
  }
  const trace = state.finding?.projection?.dimensions?.trace || null;
  const value = state.finding?.subject?.value ?? trace?.result ?? trace?.value ?? null;
  return <div style={{marginTop:8}}>
    <button onClick={load} style={{border:`1px solid ${P.border}`,background:P.cardSoft,color:P.accentText,borderRadius:999,padding:"7px 12px",fontFamily:F.heading,fontWeight:800,cursor:"pointer"}}>{open?"סגור חישוב":"איך מחשבים?"}</button>
    {open && <div style={{marginTop:8,padding:10,border:`1px solid ${P.border}`,borderRadius:12,background:P.cardSoft,color:P.inkSoft,fontFamily:F.body,fontSize:12.5,lineHeight:1.65}}>
      {state.loading?"טוען חישוב מהמנוע…":state.error?"החישוב המפורט לא זמין כרגע.":state.finding?<><b style={{color:P.accentText}}>{phrase}</b> · {methodKey}{value!=null?` = ${value}`:""}<div style={{fontSize:11,color:P.accentDim,marginTop:4}}>Trace קנוני · רזיאל מפרש, לא מחשב מחדש.</div></>:null}
    </div>}
  </div>;
}

function Metric({icon,label,value,note,P,onClick}) {
  const body = <><div style={{fontSize:19,lineHeight:1}}>{icon}</div><div style={{fontFamily:F.mono,fontWeight:900,fontSize:20,color:P.accentText,marginTop:5}}>{value}</div><div style={{fontFamily:F.heading,fontWeight:800,fontSize:11.5,color:P.ink,marginTop:2}}>{label}</div>{note&&<div style={{fontFamily:F.body,fontSize:9.8,color:P.inkSoft,marginTop:2,lineHeight:1.35}}>{note}</div>}</>;
  const st={minHeight:104,border:`1px solid ${P.border}`,borderRadius:16,background:P.cardSoft,padding:"12px 8px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"};
  return onClick?<button onClick={onClick} style={{...st,cursor:"pointer",color:"inherit",fontFamily:"inherit"}}>{body}</button>:<div style={st}>{body}</div>;
}

export default function NumberHubSmartCore2029(){
  const {type,key}=useParams();
  const nav=useNavigate();
  const P=usePalette();
  const number=Number(key);
  const [state,setState]=useState({loading:true,data:null,error:null});
  const [anchorFinding,setAnchorFinding]=useState(null);
  const [selectedMethod,setSelectedMethod]=useState("");
  const [activePhrase,setActivePhrase]=useState("");
  const [query,setQuery]=useState("");
  const [showAllMethods,setShowAllMethods]=useState(false);
  const [stats,setStats]=useState({views:0,searches:0});

  useEffect(()=>{
    let live=true;
    setState({loading:true,data:null,error:null});
    fetchEntityHubProjection({type,key,relationLimit:120,researchLimit:60,topicLimit:16})
      .then(data=>live&&setState({loading:false,data,error:null}))
      .catch(error=>live&&setState({loading:false,data:null,error}));
    return()=>{live=false};
  },[type,key]);

  useEffect(()=>{
    let live=true;
    if(!Number.isInteger(number)) return undefined;
    Promise.all([
      supabase.from("number_anchors").select("value,category,fact,hint,created_at,updated_at").eq("value",number).maybeSingle(),
      supabase.from("page_views").select("*",{count:"exact",head:true}).eq("kind","number").eq("ref",String(number)),
      supabase.from("search_log").select("*",{count:"exact",head:true}).eq("value",number),
    ]).then(([a,v,s])=>{
      if(!live)return;
      setAnchorFinding(numberAnchorToUniversalFinding(a?.data));
      setStats({views:v?.count||0,searches:s?.count||0});
    }).catch(()=>{});
    return()=>{live=false};
  },[number]);

  const data=state.data;
  const families=Array.isArray(data?.gematria?.families)?data.gematria.families:[];
  const topics=Array.isArray(data?.topics?.rows)?data.topics.rows:[];
  const surface=data?.surface||{};
  const graphRelations=Array.isArray(data?.graph?.relations)?data.graph.relations:[];
  const anchor=anchorFinding?.projection?.dimensions?.legacyNumberAnchor||null;
  const anchorPhrase=cleanAnchorPhrase(anchor?.fact,number);
  const zero=data?.zeroScale||null;
  const zeroChain=Array.isArray(zero?.scale_chain)?zero.scale_chain:[];

  useEffect(()=>{
    if(!families.length)return;
    const withAnchor=anchorPhrase?families.find(g=>(g.phrases||[]).some(x=>phraseOf(x)===anchorPhrase)):null;
    const preferred=withAnchor||families.find(g=>g.method==="רגיל")||families[0];
    const phrase=anchorPhrase&&(preferred?.phrases||[]).some(x=>phraseOf(x)===anchorPhrase)?anchorPhrase:phraseOf(preferred?.phrases?.[0]);
    setSelectedMethod(preferred?.method||"");
    setActivePhrase(phrase||anchorPhrase||String(number));
  },[families,anchorPhrase,number]);

  const selectedGroup=useMemo(()=>families.find(g=>g.method===selectedMethod)||families[0]||null,[families,selectedMethod]);
  const selectedPhrases=(selectedGroup?.phrases||[]).map(phraseOf).filter(Boolean).slice(0,12);
  const quickMethods=useMemo(()=>{
    const preferred=[]; const used=new Set();
    for(const key of CORE_METHOD_KEYS){const g=families.find(x=>String(x.method).includes(key)||String(methodLabel(x)).includes(key)); if(g&&!used.has(g.method)){preferred.push(g);used.add(g.method);}}
    for(const g of families){if(preferred.length>=6)break;if(!used.has(g.method)){preferred.push(g);used.add(g.method);}}
    return preferred.slice(0,6);
  },[families]);
  const visibleMethods=showAllMethods?families:quickMethods;

  const pulse=pulseFromCounts({posts:surface.postsCount??surface.posts?.length??0,galleries:surface.galleriesCount??surface.galleries?.length??0,words:surface.phrasesCount??surface.phrases?.length??0,events:surface.eventsCount??0,ai:surface.insightsCount??surface.insights?.length??0,comm:surface.commentsCount??0});
  const entity=Number.isInteger(number)?entityFromNumber(number):null;
  const leadTopic=topics[0]||null;
  const dnaBreadth=[surface.phrasesCount??surface.phrases?.length??0,surface.galleriesCount??surface.galleries?.length??0,surface.postsCount??surface.posts?.length??0,topics.length,families.length].filter(v=>Number(v)>0).length;

  function chooseMethod(group){const phrases=(group.phrases||[]).map(phraseOf).filter(Boolean);setSelectedMethod(group.method);setActivePhrase(cur=>phrases.includes(cur)?cur:(phrases[0]||cur));}
  function submitSearch(e){e.preventDefault();const q=query.trim();if(!q)return;setActivePhrase(q);setQuery("");}

  if(state.loading)return <main style={{minHeight:"100vh",direction:"rtl",padding:30,color:P.ink,background:P.pageBg}}>טוען את דף המספר…</main>;
  if(state.error||!data||type!=="number"||!Number.isInteger(number))return <main style={{minHeight:"100vh",direction:"rtl",padding:30,color:P.ink,background:P.pageBg}}>לא ניתן לפתוח את דף המספר כרגע.</main>;

  const frame={maxWidth:760,margin:"0 auto"};
  const card={background:P.cardGrad,border:`1px solid ${P.borderStrong}`,borderRadius:22,boxShadow:P.mode==="dark"?"0 18px 55px rgba(0,0,0,.30)":"0 14px 40px rgba(80,60,10,.10)"};
  const softBtn={border:`1px solid ${P.border}`,background:P.cardSoft,color:P.ink,borderRadius:999,padding:"9px 14px",fontFamily:F.heading,fontWeight:800,cursor:"pointer"};

  return <main style={{minHeight:"100vh",direction:"rtl",padding:"24px 12px 90px",color:P.ink,background:P.mode==="dark"?"radial-gradient(circle at 50% 10%, rgba(70,45,100,.14), transparent 30%), linear-gradient(180deg,#080612,#0b0713 65%,#09060e)":P.pageBg}}>
    <div style={frame}>
      <form onSubmit={submitSearch} style={{display:"flex",gap:8,marginBottom:12}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="מספר, מילה או ביטוי…" style={{flex:1,minWidth:0,border:`1px solid ${P.borderStrong}`,background:P.card,color:P.ink,borderRadius:999,padding:"11px 16px",fontFamily:F.body,fontSize:14,outline:"none"}}/>
        <button style={{...softBtn,background:P.accentBtn,color:P.onAccent,border:"none"}}>חפש</button>
      </form>

      <section style={{...card,padding:"24px 16px 18px",textAlign:"center",overflow:"hidden"}}>
        <div style={{color:P.accentText,fontFamily:F.heading,fontSize:12.5,fontWeight:800,letterSpacing:2}}>דף המספר</div>
        <div style={{color:P.accentText,fontFamily:F.regal,fontSize:"clamp(28px,7vw,42px)",fontWeight:800,marginTop:8}}>{activePhrase||anchorPhrase||number}</div>
        <div style={{color:P.heroNum,fontFamily:F.mono,fontSize:"clamp(64px,17vw,98px)",letterSpacing:8,lineHeight:1.02,marginTop:4,textShadow:`0 0 38px ${P.glow}`}}>{number}</div>
        <div style={{display:"inline-flex",border:`1px solid ${P.border}`,background:P.cardSoft,color:P.accentText,borderRadius:999,padding:"5px 13px",fontFamily:F.heading,fontSize:12,fontWeight:800,marginTop:10}}>ביטוי חי</div>

        <div style={{margin:"16px auto 0",maxWidth:420,display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>
          <Metric icon="🧬" label="DNA" value={dnaBreadth} note="שכבות פעילות" P={P}/>
          <Metric icon="❤️" label="דופק" value={pulse} note="אות פעילות" P={P}/>
          <Metric icon="◎" label="התכנסויות" value={topics.length} note="צירים מאושרים" P={P}/>
          <Metric icon="∑" label="שיטות" value={families.length} note="פוגשות כאן" P={P} onClick={()=>setShowAllMethods(v=>!v)}/>
          <Metric icon="🔗" label="חיבורים" value={graphRelations.length} note="Reality Graph" P={P}/>
          <Metric icon="👁" label="צפיות" value={stats.views.toLocaleString("he")} note={`חיפושים ${stats.searches.toLocaleString("he")}`} P={P}/>
        </div>

        <div style={{marginTop:16,display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          <PulseRing value={pulse} size={86} core={false}/>
          <div style={{minWidth:190,flex:"1 1 220px",maxWidth:360,border:`1px solid ${P.border}`,background:P.cardSoft,borderRadius:16,padding:"12px 13px",textAlign:"right"}}>
            <div style={{color:P.accentDim,fontFamily:F.heading,fontSize:10.5,fontWeight:900,letterSpacing:1.2}}>ANCHOR · מה אנחנו מבינים כרגע</div>
            <div style={{color:P.accentText,fontFamily:F.body,fontSize:14.5,fontWeight:700,lineHeight:1.65,marginTop:5}}>{anchor?.fact||`מרכז המספר ${number}`}</div>
            {anchor?.hint&&<div style={{color:P.inkSoft,fontFamily:F.body,fontSize:11.5,lineHeight:1.55,marginTop:4}}>{short(anchor.hint,130)}</div>}
          </div>
        </div>

        <div style={{marginTop:15,display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
          <WatchButton topic={`number:${number}`} source="g3_golden_smart_core_2029" compact ghost label={`עקוב אחרי ${number}`}/>
          {entity&&<QuickActions entity={entity} hideAnalyze style={{"--acc":P.accent,"--onAcc":P.onAccent,"--line":P.border,"--card":P.cardSoft,"--ink":P.ink,"--ink2":P.inkSoft,"--accS":P.glow}}/>}
        </div>
      </section>

      <section style={{...card,marginTop:14,padding:"14px 13px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <div><div style={{fontFamily:F.heading,fontWeight:900,color:P.accentText}}>שיטות · Smart Core</div><div style={{fontFamily:F.body,fontSize:11.5,color:P.inkSoft,marginTop:2}}>השיטות המרכזיות למעלה · עוד שיטות נפתחות בלי לאבד הקשר.</div></div>
          <button onClick={()=>setShowAllMethods(v=>!v)} style={softBtn}>{showAllMethods?"פחות שיטות":"עוד שיטות"}</button>
        </div>
        <div style={{display:"flex",gap:7,overflowX:"auto",padding:"11px 0 5px",scrollbarWidth:"thin"}}>
          {visibleMethods.map(group=>{const active=group.method===selectedGroup?.method;return <button key={group.method} onClick={()=>chooseMethod(group)} style={{flex:"0 0 auto",border:`1px solid ${active?P.accent:P.border}`,background:active?P.accentBtn:P.cardSoft,color:active?P.onAccent:P.ink,borderRadius:999,padding:"8px 12px",fontFamily:F.heading,fontWeight:850,cursor:"pointer",whiteSpace:"nowrap"}}>{methodLabel(group)} <span style={{fontSize:9.5,opacity:.7}}>· {group.count??group.phrases?.length??0}</span></button>})}
        </div>
        {showAllMethods&&<div style={{fontFamily:F.body,fontSize:10.5,color:P.accentDim,marginTop:3}}>עומק Premium בתוכנית: כל השיטות הכשירות + Trace עמוק + השוואה בין שיטות. כאן בפריוויו מוצגות השיטות החיות שקיימות ל-{number}.</div>}
        <div style={{borderTop:`1px solid ${P.border}`,marginTop:10,paddingTop:10}}>
          <div style={{fontFamily:F.heading,fontSize:10.5,color:P.accentDim,letterSpacing:1.1}}>{methodLabel(selectedGroup)} · ביטויים שמגיעים ל-{number}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:7}}>{selectedPhrases.map(ph=><button key={ph} onClick={()=>setActivePhrase(ph)} style={{border:`1px solid ${ph===activePhrase?P.accent:P.border}`,background:ph===activePhrase?P.glow:P.cardSoft,color:ph===activePhrase?P.accentText:P.ink,borderRadius:999,padding:"6px 10px",fontFamily:F.body,fontSize:12,cursor:"pointer"}}>{ph}</button>)}</div>
          <MethodTraceMini methodKey={selectedGroup?.registry?.method_key||selectedGroup?.method} phrase={activePhrase} P={P}/>
        </div>
      </section>

      <section style={{...card,marginTop:14,padding:"14px 13px"}}>
        <div style={{fontFamily:F.heading,fontWeight:900,color:P.accentText}}>המשך Core</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:9}}>
          {leadTopic&&<button onClick={()=>nav(`/topic/${encodeURIComponent(leadTopic.slug)}`)} style={{...softBtn,borderRadius:14,padding:"11px 10px"}}>◎ התכנסות מובילה<br/><span style={{fontSize:10.5,fontWeight:600}}>{short(leadTopic.title,34)}</span></button>}
          {zero?.applicable&&<div style={{border:`1px solid ${P.border}`,background:P.cardSoft,borderRadius:14,padding:"11px 10px",fontFamily:F.heading,fontSize:12,fontWeight:800}}>0 · Zero Scale<div style={{fontFamily:F.body,fontSize:10.5,fontWeight:500,color:P.inkSoft,marginTop:4}}>{zeroChain.slice(0,4).join(" · ")||"אותו שורש בסדרי גודל אחרים"}</div></div>}
        </div>
      </section>

      <section style={{marginTop:14}}><AskRaziel subject={`${activePhrase||number} · ${methodLabel(selectedGroup)} · ${number}`} facts={[`${activePhrase||number} · ${methodLabel(selectedGroup)} = ${number}`,anchor?.fact||null,leadTopic?.title?`התכנסות מובילה: ${leadTopic.title}`:null].filter(Boolean)} context={`דף המספר ${number}. הביטוי הפעיל: ${activePhrase||"—"}. השיטה הפעילה: ${methodLabel(selectedGroup)}. הסבר מה חשוב עכשיו והצע צעד מחקרי הבא. אל תחשב גימטריה מחדש.`} greeting={`רזיאל רואה כרגע את ${number}, את «${activePhrase||""}» ואת שיטת ${methodLabel(selectedGroup)}.`} title="רזיאל · הצעד הבא" subtitle="אותו רזיאל · אותו הקשר מחקרי" palette={P} metatron cta={false}/></section>

      <section style={{...card,overflow:"hidden",marginTop:14}}><ConvergenceMeter value={number}/><NumberDNA value={number}/></section>
    </div>
  </main>;
}
