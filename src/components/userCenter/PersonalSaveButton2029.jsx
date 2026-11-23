import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";
import { use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import { personalActionsLocked } from "../../lib/publicLaunch2029.js";
import { entityIdentity } from "../../lib/research/researchSyncState.js";
import { decideSaveClick, saveLabelState } from "../../lib/research/personalSaveDecision.js";

// The existing library identity. A local commit is not a server receipt.
const storageProbe=()=>{try{let n=0,top=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'',l=k.length+(localStorage.getItem(k)||'').length;n+=l;top.push([k.split(':')[0].slice(0,24),l]);}top.sort((a,b)=>b[1]-a[1]);let w='ok';try{localStorage.setItem('__sod_probe','x'.repeat(2048));localStorage.removeItem('__sod_probe');}catch(e){w=String(e?.name||'err');}return ' [אחסון: '+Math.round(n/1024)+'KB, כתיבה: '+w+', גדולים: '+top.slice(0,3).map(t=>t[0]+'='+Math.round(t[1]/1024)+'KB').join(' ')+']';}catch(e){return ' [אחסון: '+String(e?.name||'חסום')+']';}};
export default function PersonalSaveButton2029({ entity, royal = false }) {
  const auth=useAuth(),research=useResearch(),shell=use2029Shell();
  const [notice,setNotice]=useState(""),pending=useRef(false);
  const saved=(research.saved||[]).some(row=>entityIdentity(row)===entityIdentity(entity));
  useEffect(()=>{
    if(!pending.current)return;
    if(saved&&research.syncStatus==='synced'&&research.syncPending===0){pending.current=false;setNotice('נשמר באזור האישי בחשבון ✓');}
    else if(['error','conflict','local_error','local_recovery_required'].includes(research.syncStatus)){pending.current=false;setNotice('לא התקבל אישור שמירה מהשרת. השינוי המקומי נשמר לניסיון סנכרון נוסף.');}
  },[saved,research.syncStatus,research.syncPending]);
  useEffect(()=>{pending.current=false;setNotice("");},[auth.user?.id,entity?.id]);
  const save=()=>{
    if(personalActionsLocked(auth)){shell.openWorkspace();setNotice('יש להתחבר לחשבון קיים, ואז ללחוץ שוב על שמירה.');return;}
    if(pending.current||!entity?.id)return;
    // A locally present item is NOT a server receipt. Decide from the sync state, never
    // from list membership alone, and never report a false "cannot start" for a saved item.
    const action=decideSaveClick({saved,syncStatus:research.syncStatus,syncPending:research.syncPending});
    if(action==='confirm'){setNotice('הפריט כבר שמור בחשבון ✓');return;}
    if(action==='wait'){setNotice('הסנכרון לחשבון בעיצומו…');return;}
    if(action==='blocked'){setNotice(research.syncStatus==='conflict'?'יש התנגשות בין המכשיר לחשבון. אפשר לפתור אותה באזור האישי.':'האחסון המקומי של הדפדפן דורש שחזור באזור האישי לפני שמירה נוספת.');return;}
    if(action==='retry'||action==='resave'){
      pending.current=true;setNotice('מנסה לסנכרן את הפריט השמור…');
      const done=ok=>{if(ok){setNotice('ממתין לאישור שמירה מהשרת…');return;}pending.current=false;setNotice('הפריט נשמר במכשיר בלבד ולא סונכרן: הדפדפן חוסם אחסון מקומי או שאין חיבור לשרת. אפשר לנסות שוב. (קוד: '+research.syncStatus+'/'+research.syncPending+')'+storageProbe());};
      try{
        const started=action==='retry'?research.retryResearchSync?.():research.saveItem?.(entity);
        Promise.resolve(started).then(ok=>done(Boolean(ok)),()=>done(false));
      }catch{done(false);}
      return;
    }
    pending.current=true;
    const ok=research.saveItem?.(entity);
    if(!ok){pending.current=false;setNotice(['local_error','local_recovery_required'].includes(research.syncStatus)||research.syncPending>0?'הפריט נקלט אך לא נשמר באחסון הדפדפן, ולכן לא סונכרן. בדקו שהדפדפן אינו חוסם אחסון (מצב פרטי) ונסו שוב.':'לא ניתן להתחיל את השמירה כרגע. (קוד: '+research.syncStatus+'/'+research.syncPending+')'+storageProbe());}
    else setNotice('ממתין לאישור שמירה מהשרת…');
  };
  const labelState=saveLabelState({saved,syncStatus:research.syncStatus,syncPending:research.syncPending});
  const label = labelState==='confirmed' ? "✓ ברשימת השמורים" : labelState==='local' ? "נשמר במכשיר · לחצו לסנכרון" : "שמירה לאזור האישי";
  return <span className={royal ? "post-reading-save" : "sod29-actions"} data-personal-save="true" style={royal ? undefined : { display: "inline-flex", flexDirection: "column", alignItems: "flex-start", maxWidth: "100%", minWidth: 0 }}>
    <button type="button" className={royal ? "r29-btn is-quiet" : "sod29-action"} disabled={pending.current}
      aria-label={royal ? label : undefined} title={royal ? label : undefined} aria-pressed={saved} onClick={save}>
      {royal ? <><NavigationIcon2029 name={labelState==="confirmed" ? "check" : "save"} size={18} /><span>{labelState==="confirmed" ? "נשמר" : labelState==="local" ? "סנכרון" : "שמירה"}</span></> : label}
    </button>
    {notice ? <small role="status" style={royal ? undefined : { whiteSpace: "normal", overflowWrap: "anywhere", maxWidth: "min(260px, 80vw)" }}>{notice}</small> : null}
  </span>;
}
