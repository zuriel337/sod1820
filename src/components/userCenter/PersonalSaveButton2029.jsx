import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";
import { use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import { personalActionsLocked } from "../../lib/publicLaunch2029.js";
import { entityIdentity } from "../../lib/research/researchSyncState.js";

// The existing library identity. A local commit is not a server receipt.
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
    // A locally present item is NOT a request to save a second time. Do not
    // turn a repeat tap on an already-saved button into a misleading failure.
    // The local membership and the cloud receipt are separate signals.
    if(saved){
      if(research.syncPending>0&&['error','conflict'].includes(research.syncStatus)){
        pending.current=Boolean(research.retryResearchSync?.());
        setNotice(pending.current?'מנסה לסנכרן את הפריט השמור…':'לא התקבל אישור מהשרת. אפשר לנסות לסנכרן מהאזור האישי.');
      }else if(research.syncStatus==='synced'&&research.syncPending===0){
        setNotice('הפריט כבר שמור בחשבון ✓');
      }else if(['error','conflict','local_error','local_recovery_required'].includes(research.syncStatus)){
        setNotice('הפריט מופיע ברשימה המקומית, אבל לא התקבל אישור שמירה מהשרת.');
      }else{
        setNotice('הפריט ברשימת השמורים; הסנכרון לחשבון עדיין לא אושר.');
      }
      return;
    }
    pending.current=true;
    const ok=research.saveItem?.(entity);
    if(!ok){pending.current=false;setNotice('לא ניתן להתחיל את השמירה כרגע.');}
    else setNotice('ממתין לאישור שמירה מהשרת…');
  };
  const label = saved ? "✓ ברשימת השמורים" : "שמירה לאזור האישי";
  return <span className={royal ? "post-reading-save" : "sod29-actions"} data-personal-save="true">
    <button type="button" className={royal ? "r29-btn is-quiet" : "sod29-action"} disabled={pending.current}
      aria-label={royal ? label : undefined} title={royal ? label : undefined} aria-pressed={saved} onClick={save}>
      {royal ? <><NavigationIcon2029 name={saved ? "check" : "save"} size={18} /><span>{saved ? "נשמר" : "שמירה"}</span></> : label}
    </button>
    {notice ? <small role="status">{notice}</small> : null}
  </span>;
}
