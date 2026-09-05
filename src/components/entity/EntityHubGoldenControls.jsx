import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QuickActions from "../QuickActions.jsx";
import WatchButton from "../WatchButton.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { supabase } from "../../lib/supabase.js";

const C={ink:"#151515",muted:"#6d6a63",line:"#e8e4dc",paper:"#fffdfa",soft:"#f7f4ee",blue:"#2f6df6",blue2:"#eaf0ff",gold:"#9a7617",gold2:"#f6ecd0",dark:"#0b0d12"};

function Help({title,children}){
  const [open,setOpen]=useState(false);
  return <span style={{position:"relative",display:"inline-flex",verticalAlign:"middle"}}>
    <button type="button" onClick={()=>setOpen(v=>!v)} aria-label={`הסבר על ${title}`}
      style={{border:"1px solid #cfc8ba",background:"#fff",width:22,height:22,borderRadius:"50%",fontSize:12,fontWeight:900,cursor:"pointer",color:"#6f6555"}}>ⓘ</button>
    {open&&<span style={{position:"absolute",zIndex:40,top:28,insetInlineEnd:0,width:"min(330px,80vw)",background:"#fff",border:`1px solid ${C.line}`,borderRadius:14,padding:12,boxShadow:"0 14px 40px rgba(0,0,0,.14)",fontSize:12.5,lineHeight:1.65,color:C.ink,textAlign:"right"}}>
      <b style={{display:"block",marginBottom:4}}>{title}</b>{children}
    </span>}
  </span>
}

function RailButton({active,onClick,children}){
  return <button onClick={onClick} style={{border:`1px solid ${active?C.blue:C.line}`,background:active?C.blue:"#fff",color:active?"#fff":C.ink,borderRadius:999,padding:"8px 13px",fontWeight:850,cursor:"pointer",whiteSpace:"nowrap"}}>{children}</button>
}

function SequenceShell({kind,label}){
  const [focus,setFocus]=useState("1237");
  const [note,setNote]=useState("");
  return <article style={{border:`1px solid ${C.line}`,borderRadius:18,overflow:"hidden",background:C.dark,color:"#eef3ff"}}>
    <div style={{padding:"14px 16px",display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
      <div><b style={{fontSize:16}}>{label}</b> <Help title={label}>תצוגת רצף אינטראקטיבית. היא תציג מיקום, הקשר לפני/אחרי ופעולות מחקר רק כאשר מקור הרצף המאומת מחובר. כרגע אין כאן טענת התאמה מספרית.</Help></div>
      <span style={{fontSize:11,color:"#9fb0ca"}}>PROJECTION SHELL · source verification required</span>
    </div>
    <div style={{padding:"20px 16px",background:"linear-gradient(180deg,#0b0d12,#121723)",fontFamily:"ui-monospace,SFMono-Regular,Menlo,monospace",letterSpacing:3,textAlign:"center"}}>
      <span style={{opacity:.32}}>… · · · </span>
      <button onClick={()=>setNote(`בחרת ${focus}; אפשר יהיה להצמיד, להצליב או לשלוח לרזיאל לאחר חיבור מקור ${kind} המאומת.`)}
        style={{border:"1px solid rgba(102,164,255,.8)",background:"rgba(47,109,246,.18)",color:"#fff",borderRadius:10,padding:"9px 14px",font:"inherit",fontWeight:900,cursor:"pointer"}}>{focus}</button>
      <span style={{opacity:.32}}> · · · …</span>
    </div>
    <div style={{padding:"12px 14px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <input value={focus} onChange={e=>setFocus(e.target.value.replace(/\D/g,"").slice(0,12))} inputMode="numeric" aria-label="רצף לחקירה"
        style={{width:130,border:"1px solid #2b3446",background:"#0f1420",color:"#fff",borderRadius:10,padding:"8px 10px",fontFamily:"inherit"}} />
      <button onClick={()=>setNote("◇ לשולחן — יחובר ל-Research Context הקיים, בלי ליצור Store חדש.")} style={{border:"1px solid #31405c",background:"#151d2c",color:"#dce7ff",borderRadius:999,padding:"7px 11px",cursor:"pointer"}}>◇ לשולחן</button>
      <button onClick={()=>setNote("◎ הצלבה — תשתמש במנועי הקשר הקיימים; אין חישוב מזויף מתוך ה-UI.")} style={{border:"1px solid #31405c",background:"#151d2c",color:"#dce7ff",borderRadius:999,padding:"7px 11px",cursor:"pointer"}}>◎ הצלבה</button>
      <button onClick={()=>setNote("✦ רזיאל יקבל את הקטע כ-Research Context מפורש.")} style={{border:"1px solid #31405c",background:"#151d2c",color:"#dce7ff",borderRadius:999,padding:"7px 11px",cursor:"pointer"}}>✦ רזיאל</button>
      {note&&<span style={{fontSize:11.5,color:"#9fb0ca"}}>{note}</span>}
    </div>
  </article>
}


function MethodTrace({method, phrase, onClose}){
  const [state,setState]=useState({loading:true,data:null,error:null});
  useEffect(()=>{
    let alive=true;
    setState({loading:true,data:null,error:null});
    supabase.rpc("gematria_method_trace",{p_method_key:method,p_phrase:phrase})
      .then(({data,error})=>{if(!alive)return; setState({loading:false,data,error:error||null});})
      .catch(error=>alive&&setState({loading:false,data:null,error}));
    return()=>{alive=false};
  },[method,phrase]);
  const trace=state.data;
  return <div style={{marginTop:12,border:`1px solid ${C.line}`,borderRadius:15,background:"#fff",padding:14}}>
    <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center"}}>
      <div><b>{method}</b> · Trace <Help title="Trace שיטה">Trace הוא פירוט חישוב של המנוע הקנוני. הוא אינו Finding, Claim או פרשנות.</Help></div>
      <button onClick={onClose} style={{border:0,background:"transparent",fontSize:20,cursor:"pointer"}}>×</button>
    </div>
    {state.loading?<div style={{color:C.muted,marginTop:8}}>טוען פירוט מהמנוע…</div>
      :state.error?<div style={{color:"#8b3a2b",marginTop:8}}>לא ניתן לטעון Trace כרגע.</div>
      :<pre dir="ltr" style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#f7f7f5",borderRadius:11,padding:11,fontSize:11.5,lineHeight:1.6,margin:"10px 0 0"}}>{JSON.stringify(trace,null,2)}</pre>}
  </div>
}

export default function EntityHubGoldenControls({data,relationGroups=[]}){
  const identity=data?.identity||{};
  const surface=data?.surface||{};
  const families=Array.isArray(data?.gematria?.families)?data.gematria.families:[];
  const topics=Array.isArray(data?.topics?.rows)?data.topics.rows:[];
  const journey=data?.journeys?.numberKnowledgeJourney;
  const research=Array.isArray(data?.research?.rows)?data.research.rows:[];
  const sources=Array.isArray(data?.sources)?data.sources:[];
  const {addToResearch}=useResearch();
  const [dna,setDna]=useState("expressions");
  const [crossOpen,setCrossOpen]=useState(false);
  const [seq,setSeq]=useState("pi");
  const [methodTrace,setMethodTrace]=useState(null);

  const entity=useMemo(()=>({
    id:`entity:${identity.type}:${identity.key||identity.label}`,
    type:identity.type||"entity",
    ref:identity.key||identity.label,
    title:identity.label||"",
    link:`/number/${encodeURIComponent(identity.label||"")}`,
    metadata:{source:"entity-hub-golden",node_id:identity.nodeId||null}
  }),[identity]);

  const regular=families.find(x=>x.method==="רגיל")||families[0]||null;
  const expressions=(regular?.phrases||[]).slice(0,18);
  const multi=families.filter(x=>(x.count||x.phrases?.length||0)>1).slice(0,12);
  const relationTotal=relationGroups.reduce((n,[,rows])=>n+rows.length,0);
  const worlds=Array.isArray(data?.numberWorlds)?data.numberWorlds:[];
  const signatures=Array.isArray(data?.signatures)?data.signatures:[];
  const zero=data?.zeroScale||null;
  const zeroChain=Array.isArray(zero?.scale_chain)?zero.scale_chain:[];

  return <div style={{marginTop:18}}>
    <section style={{background:C.paper,border:`1px solid ${C.line}`,borderRadius:20,padding:18,boxShadow:"0 8px 28px rgba(0,0,0,.05)"}}>
      <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,fontWeight:900,letterSpacing:1.5,color:C.gold}}>ENTITY ACTIONS · 1237 GOLDEN CASE</div>
          <div style={{fontSize:14,color:C.muted,marginTop:3}}>אותו מספר, פעולות אחידות: מחקר, שולחן, מעקב, הצלבה, שיתוף ורזיאל.</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={()=>setCrossOpen(v=>!v)} style={{border:0,background:C.blue,color:"#fff",borderRadius:999,padding:"10px 16px",fontWeight:900,cursor:"pointer"}}>◎ מצא הצלבה</button>
          <button onClick={()=>addToResearch?.(entity)} style={{border:`1px solid ${C.line}`,background:"#fff",color:C.ink,borderRadius:999,padding:"10px 14px",fontWeight:850,cursor:"pointer"}}>◇ שים על השולחן</button>
          <WatchButton topic={`number:${identity.label}`} source="entity_hub_1237" compact ghost label={`עקוב אחרי ${identity.label}`} explainer="המעקב נשמר במנוע המעקב הקיים. notify_topic תומך בכל topic; חיבור אירועי חידוש למספר ייעשה דרך אותו fan-out, בלי מערכת Follow חדשה." />
        </div>
      </div>
      <QuickActions entity={entity} hideAnalyze style={{"--acc":C.blue,"--onAcc":"#fff","--line":C.line,"--card":"#fff","--ink":C.ink,"--ink2":C.muted}} />
      {crossOpen&&<div style={{marginTop:14,borderTop:`1px solid ${C.line}`,paddingTop:14}}>
        <div style={{fontWeight:900}}>◎ הצלבה סביב {identity.label} <Help title="מצא הצלבה">הצלבה מחפשת חיבור בין ישויות/ביטויים דרך שיטות וראיות קיימות. תוצאה היא מועמד למחקר או עובדה מנועית לפי מקורה — לא אמת קנונית אוטומטית.</Help></div>
        <div style={{color:C.muted,fontSize:13,lineHeight:1.7,marginTop:5}}>בשלב הזה ה-Hub לא ממציא Orchestrator חדש. הפעולה מפנה למנוע ההצלבות הקיים, וה-Projection הבא יחזיר את התוצאה לתוך ה-Inspector כאן.</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
          <Link to="/cross" style={{textDecoration:"none",background:C.blue,color:"#fff",borderRadius:999,padding:"9px 14px",fontWeight:850}}>פתח מנוע הצלבות</Link>
          <button onClick={()=>addToResearch?.(entity)} style={{border:`1px solid ${C.line}`,background:"#fff",borderRadius:999,padding:"9px 14px",fontWeight:800,cursor:"pointer"}}>＋ הכנס את 1237 למחקר</button>
        </div>
      </div>}
    </section>

    <section style={{marginTop:18,background:C.paper,border:`1px solid ${C.line}`,borderRadius:20,padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"flex-start",flexWrap:"wrap"}}>
        <div><div style={{fontSize:11,fontWeight:900,letterSpacing:1.4,color:C.gold}}>NUMBER DNA</div><h2 style={{margin:"4px 0 0",fontSize:24}}>DNA · {identity.label} <Help title="DNA המספר">ה-DNA הוא מפת הזהות המחקרית של המספר: ביטויים, רב-שיטתי, עולמות, קשרים וחתימות. הוא לא Store חדש — רק Projection של הידע הקיים.</Help></h2></div>
        <div style={{display:"flex",gap:7,overflowX:"auto",maxWidth:"100%",paddingBottom:2}}>
          <RailButton active={dna==="expressions"} onClick={()=>setDna("expressions")}>ביטויים</RailButton>
          <RailButton active={dna==="multi"} onClick={()=>setDna("multi")}>רב־שיטתי</RailButton>
          <RailButton active={dna==="worlds"} onClick={()=>setDna("worlds")}>עולמות</RailButton>
          <RailButton active={dna==="links"} onClick={()=>setDna("links")}>קשרים</RailButton>
          <RailButton active={dna==="signatures"} onClick={()=>setDna("signatures")}>חתימות</RailButton>
        </div>
      </div>

      <div style={{marginTop:16,border:`1px solid ${C.line}`,borderRadius:16,padding:16,background:C.soft,minHeight:150}}>
        {dna==="expressions"&&<div>
          <b style={{display:"block",marginBottom:10}}>הביטויים המרכזיים · רגיל <Help title="רגיל">השיטה הבסיסית. לחיצה על שיטה בדף המלא תפתח Explain → Example → Trace → Raziel.</Help></b>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{expressions.length?expressions.map((p,i)=>{const t=typeof p==="string"?p:p?.phrase||p?.label;return t?<Link key={i} to={`/number/${encodeURIComponent(t)}`} style={{textDecoration:"none",background:"#fff",border:`1px solid ${C.line}`,borderRadius:13,padding:"10px 12px",color:C.ink,fontWeight:850}}><span style={{fontSize:17}}>{t}</span><span style={{display:"block",fontSize:11,color:C.gold,marginTop:3}}>= {identity.label} · רגיל</span></Link>:null}):<span style={{color:C.muted}}>אין ביטויי רגיל זמינים ב-Projection.</span>}</div>
        </div>}
        {dna==="multi"&&<div>
          <b>רב־שיטתי <Help title="רב־שיטתי">מראה היכן אותו ערך מופיע ביותר משיטת חישוב אחת. זהו Signal מחקרי; מספר שיטות אינו כשלעצמו הוכחת אמת.</Help></b>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9,marginTop:10}}>{multi.length?multi.map(g=><div key={g.method} style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:13,padding:11}}><b>{g.registry?.display_label||g.method}</b><div style={{fontSize:12,color:C.muted,marginTop:3}}>{g.count||g.phrases?.length||0} ביטויים</div></div>):<span style={{color:C.muted}}>אין כרגע קבוצות רב־שיטתיות זמינות.</span>}</div>
        </div>}
        {dna==="worlds"&&<div>
          <b>עולמות <Help title="עולמות">עולם הוא Dimension סמנטי שמגיע מ-nodes.metadata.world הקיים. אין כאן טבלת אמת חדשה.</Help></b>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:9,marginTop:10}}>
            {worlds.length?worlds.map(g=><article key={g.world} style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:13,padding:12}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{g.world}</b><span style={{color:C.gold,fontWeight:900}}>{g.count}</span></div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>{(g.items||[]).slice(0,5).map(x=><Link key={x.id} to={`/number/${encodeURIComponent(x.label)}`} style={{fontSize:11.5,textDecoration:"none",color:C.ink,border:`1px solid ${C.line}`,borderRadius:999,padding:"4px 7px"}}>{x.label}</Link>)}</div>
            </article>):<span style={{color:C.muted}}>אין World metadata חי לישות הזו.</span>}
          </div>
        </div>}
        {dna==="links"&&<div>
          <b>קשרים <Help title="קשרים">קשרים מגיעים מאותו Reality Graph. הם אינם נוצרים בגלל שהכרטיס מוצג כאן.</Help></b>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{relationGroups.slice(0,8).map(([name,rows])=><span key={name} style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:999,padding:"8px 11px"}}>{name} · <b>{rows.length}</b></span>)}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:8}}>סה״כ {relationTotal} קשרי Graph נטענו ב-Golden Case.</div>
        </div>}
        {dna==="signatures"&&<div>
          <b>חתימות <Help title="חתימות">חתימות נקראות מה-owner הקיים: nodes.type=entity עם metadata.role=signature ו-value של המספר.</Help></b>
          <div style={{display:"grid",gap:8,marginTop:10}}>{signatures.length?signatures.map(s=><article key={s.id} style={{background:"#fff",border:`1px solid ${C.line}`,borderRadius:12,padding:11}}><b>{s.metadata?.signature_title||s.label}</b>{s.description?<div style={{fontSize:12,color:C.muted,marginTop:4}}>{s.description}</div>:null}</article>):<span style={{color:C.muted}}>אין חתימה קנונית פעילה ל-{identity.label} כרגע.</span>}</div>
        </div>}
      </div>

      <div style={{marginTop:14}}>
        <div style={{fontWeight:900,marginBottom:8}}>Method Rail · כל השיטות הזמינות ב-Projection <Help title="סרגל שיטות">הסדר מגיע מ-sort_order של Registry קנוני, לא מרשימה ידנית חדשה. בהמשך סדר הניהול הקיים ייבדק ויישמר.</Help></div>
        <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:4}}>{families.map(g=>{const sample=typeof g.phrases?.[0]==="string"?g.phrases[0]:(g.phrases?.[0]?.phrase||g.phrases?.[0]?.label||""); const active=methodTrace?.method===g.method; return <button key={g.method} onClick={()=>sample&&setMethodTrace({method:g.method,phrase:sample})} disabled={!sample} style={{cursor:sample?"pointer":"default",opacity:sample?1:.5,whiteSpace:"nowrap",border:`1px solid ${active?C.blue:C.line}`,background:active?C.blue2:"#fff",color:C.ink,borderRadius:999,padding:"7px 11px",fontSize:12,fontWeight:800}}>{g.registry?.display_label||g.method} · {g.count||g.phrases?.length||0} ⓘ</button>})}</div>
        {methodTrace?<MethodTrace method={methodTrace.method} phrase={methodTrace.phrase} onClose={()=>setMethodTrace(null)} />:null}
      </div>
    </section>

    <section style={{marginTop:18,background:C.paper,border:`1px solid ${C.line}`,borderRadius:20,padding:18}}>
      <div style={{fontSize:11,fontWeight:900,letterSpacing:1.4,color:C.gold}}>ZERO SERIES</div>
      <h2 style={{margin:"4px 0 0",fontSize:23}}>סדרת האפס <Help title="סדרת האפס">ה-owner החי הוא fn_zero_scale. הסדרה שומרת את שורש הספרות ומקרינה סקאלות ×10; זו עובדת מנוע, והפרשנות נשארת נפרדת.</Help></h2>
      {zero?.applicable?<div style={{marginTop:13}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>{zeroChain.map((n,i)=><Link key={n} to={`/number/${n}`} style={{textDecoration:"none",background:i===0?C.blue2:"#fff",border:`1px solid ${i===0?C.blue:C.line}`,borderRadius:12,padding:"10px 12px",color:C.ink,fontWeight:900}}>{n}</Link>)}</div>
        <div style={{fontSize:12,color:C.muted,marginTop:8}}>שורש: <b>{zero.core_root}</b> · source: {zero.source_of_truth}</div>
      </div>:<div style={{color:C.muted,marginTop:10}}>סדרת האפס אינה ישימה לערך הזה לפי המנוע.</div>}
    </section>

    <section style={{marginTop:18,background:C.paper,border:`1px solid ${C.line}`,borderRadius:20,padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><div style={{fontSize:11,fontWeight:900,letterSpacing:1.4,color:C.gold}}>SEQUENCES</div><h2 style={{margin:"4px 0 0",fontSize:23}}>רצפים דיגיטליים <Help title="רצפים דיגיטליים">π ופיבונאצ׳י יהיו מכשירי חקירה חיים: לפני/אחרי, מיקום, סימון קטע ופעולות Context — בלי לעבור דף.</Help></h2></div><div style={{display:"flex",gap:7}}><RailButton active={seq==="pi"} onClick={()=>setSeq("pi")}>π</RailButton><RailButton active={seq==="fib"} onClick={()=>setSeq("fib")}>Fibonacci</RailButton></div></div>
      <div style={{marginTop:12}}>{seq==="pi"?<SequenceShell kind="π" label="π · Digital Scrubber"/>:<SequenceShell kind="Fibonacci" label="Fibonacci · Sequence Explorer"/>}</div>
    </section>

    <section style={{marginTop:18,background:C.paper,border:`1px solid ${C.line}`,borderRadius:20,padding:18}}>
      <div style={{fontSize:11,fontWeight:900,letterSpacing:1.4,color:C.gold}}>RESEARCH TRAIL</div>
      <h2 style={{margin:"4px 0 10px",fontSize:21}}>מסלול מחקר חי <Help title="מסלול מחקר">המסלול שומר Context ומאפשר Exact Reopen. הוא אינו Breadcrumb בלבד ואינו יוצר Graph חדש.</Help></h2>
      <div style={{display:"flex",gap:7,alignItems:"center",overflowX:"auto",paddingBottom:4}}>
        <span style={{whiteSpace:"nowrap",background:C.blue,color:"#fff",borderRadius:999,padding:"8px 12px",fontWeight:900}}>{identity.label}</span>
        {journey?.root?.value?<><span style={{color:C.muted}}>←</span><span style={{whiteSpace:"nowrap",background:"#fff",border:`1px solid ${C.line}`,borderRadius:999,padding:"8px 12px"}}>שורש {journey.root.value}</span></>:null}
        {(journey?.branches||[]).slice(0,5).map((b,i)=><React.Fragment key={i}><span style={{color:C.muted}}>←</span><span style={{whiteSpace:"nowrap",background:"#fff",border:`1px solid ${C.line}`,borderRadius:999,padding:"8px 12px"}}>{b.label||b.value||b.kind||"תחנה"}</span></React.Fragment>)}
      </div>
    </section>

    <section style={{marginTop:18,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
      <div style={{background:C.paper,border:`1px solid ${C.line}`,borderRadius:18,padding:16}}><div style={{fontWeight:900,fontSize:17}}>🔮 התכנסויות חזקות <Help title="התכנסויות">המספר אינו הסיפור היחיד; ה-Hub צריך להראות מה נפגש, באיזו שיטה, ובאיזה מעמד אמת.</Help></div><div style={{fontSize:30,fontWeight:950,marginTop:8}}>{topics.length}</div><div style={{color:C.muted,fontSize:12.5}}>Topics מאושרים מחוברים כרגע ל-{identity.label}. בדף הבא כל כרטיס יציג את המילים בגדול ואת השיטה ליד הערך.</div></div>
      <div style={{background:C.paper,border:`1px solid ${C.line}`,borderRadius:18,padding:16}}><div style={{fontWeight:900,fontSize:17}}>🧭 מסעות <Help title="מסע">מסע הוא traversal של אותו Research Context, לא עותק של ידע. כשהמספר חלק ממסע הוא צריך לבלוט.</Help></div><div style={{fontSize:30,fontWeight:950,marginTop:8}}>{journey?1:0}</div><div style={{color:C.muted,fontSize:12.5}}>{journey?"יש Number Knowledge Journey זמין ב-Projection.":"אין מסע קנוני זמין כרגע; לא ניצור אחד מלאכותית."}</div></div>
      <div style={{background:C.paper,border:`1px solid ${C.line}`,borderRadius:18,padding:16}}><div style={{fontWeight:900,fontSize:17}}>✦ רזיאל · המשך מחקר <Help title="רזיאל">הסיכום הקצר בדף, הניתוח העמוק והליווי המתמשך בהיכל הם שלושה תפקידים שונים. AI לא מקדם לקנוני ולא מפרסם.</Help></div><div style={{color:C.muted,fontSize:12.5,marginTop:8}}>{research.length} Research Objects זמינים · {sources.length} מקורות projected. ההמשך צריך להיות 1–3 פעולות קונקרטיות, לא עוד פסקת AI כפולה.</div><Link to="/research" style={{display:"inline-block",marginTop:10,textDecoration:"none",background:C.blue,color:"#fff",borderRadius:999,padding:"8px 12px",fontWeight:850}}>פתח בהיכל</Link></div>
    </section>

    <section style={{marginTop:18,background:C.paper,border:`1px solid ${C.line}`,borderRadius:20,padding:18}}>
      <div style={{fontWeight:900,fontSize:18}}>שכבות שחייבות להישמר מהדף הישן <Help title="Capability Preservation">ה-Hub החדש מארגן מחדש; הוא לא מוחק יכולות קיימות. Owner שלא מחובר עדיין מסומן במפורש במקום להמציא נתון.</Help></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:9,marginTop:12}}>
        {[
          ["גלריות",surface.galleriesCount??surface.galleries?.length??0,"LIVE"],
          ["פוסטים",surface.postsCount??surface.posts?.length??0,"LIVE"],
          ["סדרת האפס",zeroChain.length||"—",zero?.applicable?"LIVE · fn_zero_scale":"NOT APPLICABLE"],
          ["מצא הצלבה","✓","LIVE ENGINE ENTRY"],
          ["ניתוחי שיטות","✓","LIVE TRACE · gematria_method_trace"],
          ["ELS / צפנים","✓","PRESERVE / lens"],
          ["מסעות",journey?"✓":"—","PROJECTED"],
          ["מקורות",sources.length,"PROJECTED"],
        ].map(([name,val,status])=><div key={name} style={{border:`1px solid ${C.line}`,borderRadius:13,padding:11,background:C.soft}}><b>{name}</b><div style={{fontSize:22,fontWeight:950,marginTop:4}}>{val}</div><div style={{fontSize:10.5,color:C.muted,marginTop:2}}>{status}</div></div>)}
      </div>
    </section>
  </div>
}
