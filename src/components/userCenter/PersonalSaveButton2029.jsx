import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import { personalActionsLocked } from "../../lib/publicLaunch2029.js";
import { entityIdentity } from "../../lib/research/researchSyncState.js";

// The existing library identity. A local commit is not a server receipt.
export default function PersonalSaveButton2029({ entity }) {
  const auth=useAuth(),research=useResearch(),shell=use2029Shell();
  const [notice,setNotice]=useState(""),pending=useRef(false);
  const saved=(research.saved||[]).some(row=>entityIdentity(row)===entityIdentity(entity));
  useEffect(()=>{
    if(!pending.current)return;
    if(research.syncStatus==='synced'&&research.syncPending===0){pending.current=false;setNotice('נשמר באזור האישי בחשבון ✓');}
    else if(['error','conflict','local_error','local_recovery_required'].includes(research.syncStatus)){pending.current=false;setNotice('לא התקבל אישור שמירה מהשרת. השינוי המקומי נשמר לניסיון סנכרון נוסף.');}
  },[research.syncStatus,research.syncPending]);
  useEffect(()=>{pending.current=false;setNotice("");},[auth.user?.id,entity?.id]);
  const save=()=>{
    if(personalActionsLocked(auth)){shell.openWorkspace();setNotice('יש להתחבר לחשבון קיים, ואז ללחוץ שוב על שמירה.');return;}
    if(pending.current||!entity?.id)return;
    pending.current=true;
    const ok=research.syncPending>0&&['error','conflict'].includes(research.syncStatus)?research.retryResearchSync?.():research.saveItem?.(entity);
    if(ok===false){pending.current=false;setNotice('לא ניתן להתחיל את השמירה כרגע.');}
    else setNotice('ממתין לאישור שמירה מהשרת…');
  };
  return <span className="sod29-actions" data-personal-save="true"><button type="button" className="sod29-action" disabled={pending.current} aria-pressed={saved} onClick={save}>{saved?'✓ ברשימת השמורים':'שמירה לאזור האישי'}</button>{notice?<small role="status">{notice}</small>:null}</span>;
}
