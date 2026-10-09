import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { KNOWLEDGE_WORLDS, BUILD_TRACKS, BUILD_PROGRESS, FIRST_STAGE_RELEASE_GATES, stagePercent } from "../lib/knowledgeMap.js";
import StayUpdatedCTA from "../components/StayUpdatedCTA.jsx";

function NumbersDepthPreview() {
  const P = usePalette();
  const nums = ["1820","506","358","424","67","337","683","1234","207","661","756","785","891","218","456","386","101","72","26","18","144","2701","730","58","85","314","999","42"];
  const words = ["אור","בינה","בראשית","מלכות","חכמה"];
  return (
    <section className="ndp" aria-label="המחשה חזותית של עומק מערכת המספרים" style={{
      position:"relative",height:"clamp(300px,42vw,430px)",maxWidth:920,margin:"10px auto 30px",
      overflow:"hidden",borderRadius:26,border:`1px solid ${P.borderStrong}`,
      background:"radial-gradient(circle at 50% 48%,rgba(79,58,120,.32),rgba(9,11,18,.96) 58%,#050609 100%)",
      boxShadow:"inset 0 0 100px rgba(0,0,0,.7),0 20px 60px rgba(0,0,0,.18)",perspective:"850px"
    }}>
      <div className="ndp-stars" aria-hidden />
      <div className="ndp-space" aria-hidden>
        {nums.map((n,i)=>{
          const x=(i*37+13)%94+3, y=(i*61+17)%82+8, z=((i*47)%520)-260;
          const s=.68+((i*29)%70)/100, o=.28+((i*17)%62)/100;
          return <span key={n+"-"+i} className={"ndp-num "+(n==="1820"?"anchor":"")} style={{
            left:`${x}%`,top:`${y}%`,opacity:o,fontSize:`${s}rem`,
            transform:`translate(-50%,-50%) translateZ(${z}px)`
          }}>{n}</span>
        })}
        {words.map((w,i)=><span key={w} className="ndp-word" style={{left:`${12+i*19}%`,top:`${25+(i%3)*23}%`,transform:`translateZ(${-150+i*55}px)`}}>{w}</span>)}
        <svg className="ndp-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Array.from({length:18},(_,i)=><line key={i} x1={(i*37+16)%94} y1={(i*61+22)%86} x2={(i*53+43)%94} y2={(i*31+38)%86} />)}
        </svg>
      </div>
      <div className="ndp-copy">
        <strong>הצצה לעומק המערכת</strong>
        <span>מספרים · ביטויים · טקסטים · קשרים · שכבות</span>
      </div>
      <div className="ndp-note">המחשה חזותית של המרחב העתידי · אינה מפת הנתונים בפועל</div>
      <style>{`
        .ndp-space{position:absolute;inset:0;transform-style:preserve-3d;animation:ndpDrift 18s ease-in-out infinite alternate}
        .ndp-num,.ndp-word{position:absolute;white-space:nowrap;transform-style:preserve-3d;user-select:none}
        .ndp-num{font-family:${F.numeric};font-weight:800;color:#f2d77c;text-shadow:0 0 18px rgba(242,215,124,.42)}
        .ndp-num.anchor{font-size:clamp(2.1rem,6vw,4.5rem)!important;opacity:.96!important;left:50%!important;top:48%!important;transform:translate(-50%,-50%) translateZ(150px)!important;color:#fff0a8;text-shadow:0 0 14px rgba(255,224,120,.8),0 0 50px rgba(139,92,246,.48)}
        .ndp-word{font-family:${F.regal};font-size:clamp(.8rem,2vw,1.25rem);color:rgba(211,197,235,.25);letter-spacing:.08em}
        .ndp-lines{position:absolute;inset:0;width:100%;height:100%;opacity:.22}
        .ndp-lines line{stroke:#cdb9ff;stroke-width:.18}
        .ndp-stars{position:absolute;inset:-30%;background-image:radial-gradient(circle,rgba(255,255,255,.55) 0 1px,transparent 1.5px);background-size:43px 43px;opacity:.18;transform:rotate(11deg)}
        .ndp-copy{position:absolute;z-index:5;top:18px;right:20px;display:grid;gap:3px;text-align:right;pointer-events:none}
        .ndp-copy strong{font-family:${F.regal};font-size:clamp(18px,3vw,27px);color:#f5df91}
        .ndp-copy span,.ndp-note{font-family:${F.body};color:rgba(235,229,244,.66);font-size:11px}
        .ndp-note{position:absolute;z-index:5;bottom:12px;left:16px;right:16px;text-align:center}
        @keyframes ndpDrift{0%{transform:rotateX(2deg) rotateY(-4deg) translateZ(-20px) scale(1.03)}100%{transform:rotateX(-3deg) rotateY(5deg) translateZ(35px) scale(1.08)}}
        @media(max-width:620px){.ndp{height:330px!important}.ndp-copy{right:14px;top:14px}.ndp-word{opacity:.7}}
        @media(prefers-reduced-motion:reduce){.ndp-space{animation:none}}
      `}</style>
    </section>
  );
}

function BuildTrackCard({ t, featured = false }) {
  const P = usePalette();
  const pct = stagePercent(t.stage);
  return (
    <article style={{
      border:`1px solid ${featured?P.borderStrong:P.border}`,borderRadius:featured?20:16,
      padding:featured?"18px 18px 16px":14,background:featured?P.cardGrad:P.card,
      boxShadow:featured?`0 14px 38px rgba(0,0,0,.07)`:"none"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <b style={{color:P.ink,fontFamily:F.heading,fontSize:featured?17:14}}>{t.icon} {t.label}</b>
        <span style={{color:P.accentText,fontFamily:F.numeric,fontWeight:900,fontSize:featured?17:12}}>{pct}%</span>
      </div>
      <div style={{height:featured?8:6,borderRadius:999,background:P.cardSoft,overflow:"hidden",margin:"10px 0 8px"}}>
        <i style={{display:"block",height:"100%",width:`${pct}%`,background:P.accent,borderRadius:999}} />
      </div>
      <div style={{color:P.accentDim,fontFamily:F.heading,fontSize:10.5,fontWeight:800}}>שלב {t.stage}/4 · {t.status}</div>
      <p style={{color:P.inkSoft,fontFamily:F.body,fontSize:featured?14:12.5,lineHeight:1.7,margin:"8px 0 10px"}}>{t.summary}</p>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {(t.metrics||[]).map(m => <span key={m} style={{border:`1px solid ${P.border}`,borderRadius:999,padding:featured?"4px 9px":"3px 7px",color:P.inkSoft,fontFamily:F.body,fontSize:featured?11.5:10.5}}>{m}</span>)}
      </div>
    </article>
  );
}

function BuildStatusDeep() {
  const P = usePalette();
  const [leadTrack, ...otherTracks] = BUILD_TRACKS;
  return (
    <section style={{maxWidth:1120,margin:"0 auto 28px",background:P.cardGrad,border:`1px solid ${P.borderStrong}`,borderRadius:22,padding:"20px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"end",flexWrap:"wrap",marginBottom:14}}>
        <div>
          <div style={{color:P.accentDim,fontFamily:F.heading,fontSize:11,fontWeight:900,letterSpacing:1.5}}>אותו מד שמופיע בדף הבית · כאן בעומק מלא</div>
          <h2 style={{margin:"5px 0 0",color:P.ink,fontFamily:F.regal,fontSize:25,fontWeight:900}}>🏗️ מצב הבנייה של SOD1820</h2>
        </div>
        <div style={{fontFamily:F.numeric,color:P.accentText,fontSize:26,fontWeight:900}}>{BUILD_PROGRESS}%</div>
      </div>

      <div style={{margin:"0 auto 17px",maxWidth:940,padding:"15px 17px",background:P.cardSoft,border:`1px solid ${P.border}`,borderRadius:16}}>
        <div style={{fontFamily:F.heading,color:P.accentText,fontWeight:900,fontSize:15}}>עדכון מצב · 9 באוקטובר 2026</div>
        <p style={{fontFamily:F.body,color:P.ink,lineHeight:1.85,fontSize:15,margin:"7px 0 12px"}}>
          שלב G3 — סגירת התשתיות — נסגר ואומת ב־1 באוקטובר. כעת אנחנו במעבר G3→G4:
          בודקים מסעות שימוש אמיתיים לקראת חוויית הזהב הראשונה. חלקים נוספים ייפתחו בהדרגה,
          ורק לאחר שיעברו את הבדיקות ושערי האישור שלהם.
        </p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}} aria-label="מצב אבני הדרך של השלב הציבורי הראשון">
          {FIRST_STAGE_RELEASE_GATES.map(g => (
            <span key={g.id} style={{fontFamily:F.heading,fontWeight:800,fontSize:12,padding:"7px 10px",border:`1px solid ${P.border}`,borderRadius:12,color:P.ink}}>
              {g.state === "closed" ? "✓" : g.state === "active" ? "◌" : "○"} {g.id} · {g.state === "closed" ? "נסגר" : g.state === "active" ? "בתהליך" : "בהמשך"}
            </span>
          ))}
        </div>
      </div>

      {leadTrack && <BuildTrackCard t={leadTrack} featured />}

      <section style={{maxWidth:900,margin:"14px auto 18px",padding:"20px 18px",border:`1px solid ${P.border}`,borderRadius:18,background:P.cardSoft}}>
        <StayUpdatedCTA
          source="system-map-openings"
          title="🔔 רוצים לדעת כשחלק חדש במפה נפתח?"
          description="השאירו מייל ונעדכן כשעולמות, כלי מחקר, ספרים, שכבות שפה, מסעות ורכיבים חדשים עוברים מ״בבנייה״ לפתיחה באתר."
        />
      </section>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>
        {otherTracks.map(t => <BuildTrackCard key={t.id} t={t} />)}
      </div>
      <p style={{margin:"14px auto 0",maxWidth:820,textAlign:"center",color:P.inkSoft,fontFamily:F.body,fontSize:12.5,lineHeight:1.7}}>
        מד ההתקדמות העליון מציין אבני דרך שנסגרו בתוכנית, ולא את אחוז התכונות שכבר זמינות לציבור. מצב כל יכולת נקבע בנפרד לפי שערי הפתיחה שלה; שעון ההכרזה אינו פותח יכולות אוטומטית.
      </p>
    </section>
  );
}

function WorldCard({ world, q }) {
  const P = usePalette();
  const items = useMemo(() => {
    const n = q.trim();
    if (!n) return world.items;
    return world.items.filter(it => (it.label+" "+(it.note||"")+" "+(it.state||"")).includes(n));
  }, [world.items, q]);
  if (q.trim() && !items.length && !(world.title+" "+world.kicker+" "+world.stat).includes(q.trim())) return null;
  return (
    <section style={{
      background:P.cardGrad,border:`1px solid ${P.border}`,borderTop:`2px solid ${P.borderStrong}`,
      borderRadius:18,padding:18,boxShadow:"0 14px 44px rgba(0,0,0,.08)"
    }}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
        <div>
          <h2 style={{margin:0,color:P.ink,fontFamily:F.regal,fontSize:23,fontWeight:900}}>{world.title}</h2>
          <div style={{color:P.inkSoft,fontFamily:F.body,fontSize:13.5,lineHeight:1.6,marginTop:5}}>{world.kicker}</div>
          {world.publicCopy && <div style={{color:P.inkSoft,fontFamily:F.body,fontSize:12.5,lineHeight:1.7,marginTop:8,maxWidth:620}}>{world.publicCopy}</div>}
        </div>
        <div style={{color:P.accentText,fontFamily:F.numeric,fontSize:11,fontWeight:900,border:`1px solid ${P.borderStrong}`,borderRadius:999,padding:"5px 9px",whiteSpace:"nowrap"}}>{world.stat}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginTop:14}}>
        {items.map(it => {
          const body = <>
            <div style={{fontSize:24,lineHeight:1}}>{it.emoji}</div>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                <b style={{color:it.locked?P.inkSoft:P.ink,fontFamily:F.heading,fontSize:14}}>{it.label}</b>
                <span style={{
                  color:it.locked?P.accentDim:P.accentText,border:`1px solid ${it.locked?P.border:P.borderStrong}`,
                  borderRadius:999,padding:"1px 6px",fontFamily:F.heading,fontSize:9,fontWeight:900
                }}>{it.state || "פעיל"}</span>
              </div>
              {it.note && <div style={{color:P.inkSoft,fontFamily:F.body,fontSize:11.5,lineHeight:1.5,marginTop:4}}>{it.note}</div>}
            </div>
          </>;
          const style={display:"flex",alignItems:"flex-start",gap:10,padding:"12px",borderRadius:13,border:`1px ${it.locked?"dashed":"solid"} ${P.border}`,background:P.card,textDecoration:"none",opacity:it.locked?.7:1};
          return it.locked
            ? <div key={it.label} aria-disabled="true" style={style}>{body}</div>
            : <Link key={it.to+it.label} to={it.to} style={style}>{body}</Link>;
        })}
      </div>
    </section>
  );
}

// 🔠 «הצופן נפתח בקרוב» — פתיח בראש מפת המערכת. הטיקר העליון מקשר לכאן (ticker_messages.link_url=/map).
//    התוכן נגזר מ-els_research_layer_law v9 (Classic/Research · וקטורים · עומק · ביקורת · AI אחרי מנוע)
//    ומ-testimony_not_prophecy. זו תצוגה/טיזר בלבד — לא מקור-אמת לסטטוס המימוש.
const CIPHER_POINTS = [
  { icon: "▦", title: "שני מצבים — מנוע אחד", body: "מטריצה קלאסית מוכרת ומהירה, ומטריצת מחקר שנפתחת באותה פשטות וחושפת כלים מתקדמים רק כשהם באמת רלוונטיים. עוברים ביניהן בלי לאבד את מה שמצאתם." },
  { icon: "↔", title: "המשך באותו קו", body: "בדיקה אם הדילוג ממשיך למילים נוספות קדימה ואחורה — כמו «משיח טבת עשירי» שהתארך לשרשרת של 18 אותיות: «משיח טבת עשירי בהתחול»." },
  { icon: "∥", title: "קווים מקבילים והצטלבויות", body: "זיהוי מילים שרצות באותו כיוון גאומטרי גם כשהדילוג שלהן שונה, ומילים שחוצות זו את זו באות משותפת — כמו «תורה קדשה» עם «התורה» ו«אמיתית» המקבילות ו«ברית אור» שחוצה אותן." },
  { icon: "3D", title: "שכבות עומק", body: "המטריצה כולה זזה קדימה בתורה בשכבות, כדי לראות מה עומד «מאחורי» הממצא. בהמשך — גם תצוגה תלת־ממדית." },
  { icon: "⬚", title: "קופסה חכמה", body: "החיפוש מתחיל מאזור קטן סביב הממצא ומתרחב רק לכיוון שבו יש עוד מה לגלות." },
  { icon: "⚖", title: "ביקורת מול אקראיות", body: "כל ממצא נבדק מול עמודות ואזורי ביקורת — כדי להבדיל בין מה שבאמת בולט לבין צפיפות מקרית." },
  { icon: "✦", title: "רזיאל — הסבר AI", body: "ה-AI מסביר, משווה וממליץ מה לבדוק הלאה — אבל לא «ממציא» דילוגים. כל דילוג מגיע מהמנוע ונבדק בשחזור מדויק. והצופן עובד במלואו גם בלי AI." },
];

function CipherComingSoon() {
  const P = usePalette();
  return (
    <section id="tzofen" aria-labelledby="tzofen-title" style={{border:`1px solid ${P.borderStrong}`,borderRadius:22,padding:"26px 20px",background:P.cardSoft,marginBottom:34}}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{color:P.accentDim,fontFamily:F.heading,fontSize:11,fontWeight:900,letterSpacing:2.4}}>בקרוב · הצופן התנ״כי</div>
        <h2 id="tzofen-title" style={{margin:"8px 0 10px",color:P.ink,fontFamily:F.regal,fontSize:"clamp(24px,4.4vw,38px)",fontWeight:900}}>🔠 הצופן מתעורר</h2>
        <p style={{maxWidth:760,margin:"0 auto",color:P.inkSoft,fontFamily:F.body,fontSize:15.5,lineHeight:1.9}}>
          מדילוג בודד לתמונה שלמה: הצטלבויות, שרשראות ורמזים שמתחברים סביב מילה אחת בתורה.
          הצופן נבנה מחדש כסביבת מחקר — מדויקת, שקופה, ומלווה בבינה מלאכותית.
        </p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:12}}>
        {CIPHER_POINTS.map(pt => (
          <article key={pt.title} style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:16,padding:"16px 15px"}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
              <span aria-hidden style={{width:32,height:32,flex:"none",borderRadius:10,display:"grid",placeItems:"center",border:`1px solid ${P.borderStrong}`,color:P.accentText,fontFamily:F.heading,fontSize:pt.icon==="3D"?10:16,fontWeight:900}}>{pt.icon}</span>
              <h3 style={{margin:0,color:P.accentText,fontFamily:F.heading,fontSize:15.5,fontWeight:900}}>{pt.title}</h3>
            </div>
            <p style={{margin:0,color:P.inkSoft,fontFamily:F.body,fontSize:13.5,lineHeight:1.8}}>{pt.body}</p>
          </article>
        ))}
      </div>
      <div style={{maxWidth:760,margin:"18px auto 0",textAlign:"center",color:P.inkSoft,fontFamily:F.body,fontSize:13.5,lineHeight:1.9}}>
        <b style={{color:P.ink}}>עדות, לא ניבוי.</b> כל ממצא נשמר עם הפרטים המלאים שלו — ספר, דילוג, כיוון ומיקום מדויק — כך שכל אחד יכול לשחזר אותו.
        גם «לא נמצא» היא תשובה: המערכת לא מכריחה צופן איפה שאין.
      </div>
      <div style={{textAlign:"center",marginTop:16}}>
        <Link to="/code" style={{color:P.accentText,textDecoration:"none",fontFamily:F.heading,fontSize:14,fontWeight:900}}>לדף הצופן ולעדכון כשייפתח ←</Link>
      </div>
    </section>
  );
}

export default function NavigationCenterPage() {
  const P = usePalette();
  const [q,setQ]=useState("");
  return (
    <div dir="rtl" style={{maxWidth:1280,margin:"0 auto",padding:"46px 18px 110px",position:"relative",zIndex:1}}>
      <CipherComingSoon />

      <section style={{textAlign:"center",marginBottom:26}}>
        <div style={{color:P.accentDim,fontFamily:F.heading,fontSize:11,fontWeight:900,letterSpacing:2.4}}>SOD1820 · SYSTEM MAP</div>
        <h1 style={{margin:"8px 0 10px",color:P.ink,fontFamily:F.regal,fontSize:"clamp(30px,5vw,52px)",fontWeight:900}}>🗺️ מפת המערכת</h1>
        <p style={{maxWidth:760,margin:"0 auto",color:P.inkSoft,fontFamily:F.body,fontSize:16,lineHeight:1.9}}>
          כאן רואים את כל SOD1820 במבט אחד — מה כבר חי, מה נמצא בבנייה, ואילו דלתות ייפתחו בהמשך.
          זו לא רשימת עמודים, אלא מפת הידע והמערכת שנבנית סביבם.
        </p>
        <div style={{display:"inline-flex",alignItems:"center",gap:10,marginTop:18,padding:"9px 13px",border:`1px solid ${P.borderStrong}`,borderRadius:999,background:P.card}}>
          <span style={{fontFamily:F.heading,fontSize:11,fontWeight:900,color:P.ink}}>🏗️ SOD1820 V2</span>
          <span style={{fontFamily:F.numeric,fontSize:14,fontWeight:900,color:P.accentText}}>{BUILD_PROGRESS}%</span>
          <span style={{width:120,height:4,borderRadius:999,background:P.border,overflow:"hidden"}}><i style={{display:"block",width:`${BUILD_PROGRESS}%`,height:"100%",background:P.accent}} /></span>
        </div>
      </section>

      <BuildStatusDeep />

      <NumbersDepthPreview />

      <div style={{maxWidth:560,margin:"0 auto 24px"}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="חפשו עולם, כלי, יכולת או משהו שבדרך…"
          style={{width:"100%",boxSizing:"border-box",background:P.card,border:`1px solid ${P.borderStrong}`,borderRadius:999,color:P.ink,fontFamily:F.body,fontSize:15,padding:"12px 18px",outline:"none",textAlign:"center"}} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:16}}>
        {KNOWLEDGE_WORLDS.map(w => <WorldCard key={w.title} world={w} q={q} />)}
      </div>

      <section style={{marginTop:24,border:`1px solid ${P.borderStrong}`,borderRadius:18,padding:"22px",background:P.cardSoft,textAlign:"center"}}>
        <div style={{color:P.ink,fontFamily:F.regal,fontSize:20,fontWeight:900}}>🏛️ ההיכל יהיה הדרך המרחבית להיכנס לכל המפה הזאת</div>
        <p style={{maxWidth:760,margin:"8px auto 0",color:P.inkSoft,fontFamily:F.body,fontSize:14,lineHeight:1.8}}>
          הניווט מביא אתכם מהר. ההיכל יאפשר לשוטט בין מספרים, צפנים, ספרים, אנשים וקשרים במרחב אחד.
          רזיאל יהיה שכבת ה-AI שתלווה את אותו גוף ידע מכל עמוד.
        </p>
      </section>
    </div>
  );
}
