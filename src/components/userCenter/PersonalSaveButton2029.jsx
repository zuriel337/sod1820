import React from "react";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";
import { usePersonalSave2029 } from "../../lib/research/usePersonalSave2029.js";

// THE save indicator of the site. All states (idle -> saving -> confirmed | failed with a retry) come from usePersonalSave2029 over the ONE research runtime:
// "נשמר" appears only on the server's receipt, and a failure names its real cause with the one action that can fix it (retry, reclaim, re-apply after a conflict).
export default function PersonalSaveButton2029({ entity, royal = false }) {
  const save = usePersonalSave2029(entity);
  const { phase, labelState, notice } = save;
  const label = labelState === "confirmed" ? "✓ ברשימת השמורים" : labelState === "local" ? "נשמר במכשיר · לחצו לסנכרון" : "שמירה לאזור האישי";
  const cls = royal ? "r29-btn is-quiet" : "sod29-action";
  return <span className={royal ? "post-reading-save" : "sod29-actions personal-save-plain"} data-personal-save="true" data-save-phase={phase}
    style={royal ? undefined : { display: "inline-flex", flexDirection: "column", alignItems: "flex-start", maxWidth: "100%", minWidth: 0 }}>
    <button type="button" className={cls} disabled={save.busy} data-save-action="save"
      aria-label={royal ? label : undefined} title={royal ? label : undefined} aria-pressed={save.saved} onClick={save.save}>
      {royal ? <><NavigationIcon2029 name={labelState === "confirmed" ? "check" : "save"} size={18} /><span>{labelState === "confirmed" ? "נשמר" : labelState === "local" ? "סנכרון" : "שמירה"}</span></> : label}
    </button>
    {save.reclaim > 0 ? <button type="button" className={cls} data-save-action="reclaim" onClick={save.reclaimAndRetry}>פינוי ושמירה</button> : null}
    {save.fix ? <button type="button" className={cls} data-save-action="resolve" onClick={save.resolveAndRetry}>סנכרון מחדש ושמירה</button> : null}
    {notice ? <small role="status" data-save-notice={phase} style={royal ? undefined : { whiteSpace: "normal", overflowWrap: "anywhere", maxWidth: "100%" }}>{notice}</small> : null}
  </span>;
}
