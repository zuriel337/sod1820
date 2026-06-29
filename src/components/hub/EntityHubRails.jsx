import React, { useState } from "react";
import { createPortal } from "react-dom";
import { emit, EVENTS } from "../../lib/research/eventBus.js";

// 🧪 EntityHub — שלד הסרגלים (Reality Graph Law · Reader→Research).
// המרכז נשאר בדיוק כמו היום. שני סרגלים מתקפלים, **סגורים כברירת-מחדל**:
//   • שמאל = כלי-המעבדה (מסע · מחשבון · ELS · ישויות)
//   • ימין  = מחקר (התכנסויות · הצלבות · מספרים-קשורים · מחקרים-פעילים)
// «אדם תמים» רואה דף נקי; ברגע שפותח סרגל — הוא «במעבדה». הפתיחה נזכרת
// (opened once = researcher). דסקטופ בלבד בשלב זה; מובייל = Bottom-Sheet בהמשך.
// כאן רק השלד — התוכן (left/right) ממולא בצעדים הבאים.
const KEY = "hub_rails_v1";

export default function EntityHubRails({ entity, left, right }) {
  const [open, setOpen] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  const set = (side, v) => setOpen(o => {
    const n = { ...o, [side]: v };
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* noop */ }
    if (v) emit(EVENTS.RESEARCH_ADD ? "hub:enter" : "hub:enter", { side, entity }); // נכנס למצב חוקר
    return n;
  });

  const rail = (side, icon, label, content, hint) => (
    <aside className={`ehr ehr-${side}${open[side] ? " open" : ""}`}>
      {!open[side] ? (
        <button className="ehr-tab" onClick={() => set(side, true)} title={`פתח ${label}`}>
          <span className="ehr-tab-i">{icon}</span>
          <span className="ehr-tab-t">{label}</span>
        </button>
      ) : (
        <div className="ehr-panel">
          <div className="ehr-head">
            <b>{icon} {label}</b>
            <button className="ehr-x" onClick={() => set(side, false)} aria-label="סגור">✕</button>
          </div>
          <div className="ehr-body">{content || <div className="ehr-empty">{hint}</div>}</div>
        </div>
      )}
    </aside>
  );

  return createPortal((
    <>
      <style>{RAILS_CSS}</style>
      {rail("right", "🕸", "מחקר", right, "פאנלי-המחקר ייכנסו כאן — התכנסויות · הצלבות · מספרים-קשורים · מחקרים-פעילים.")}
      {rail("left", "🧪", "כלים", left, "כלי-המעבדה ייכנסו כאן — מסע · מחשבון · צופן התורה · חיפוש ישויות.")}
    </>
  ), document.body);
}

// פלטה בהירה נקייה (research_workspace_law) — «כמו Claude, לא GPT»: קרם/לבן, קווים דקים,
// טקסט כהה, נגיעת-זהב עדינה. לא דארק-מוד. שקט, אוורירי, מודרני.
const RAILS_CSS = `
/* דסקטופ בלבד בשלב זה — מובייל נשאר מרכז-נקי (Bottom-Sheet בהמשך) */
.ehr{display:none;font-family:'Heebo',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
@media (min-width:1024px){ .ehr{display:block;position:fixed;top:0;bottom:0;z-index:46;pointer-events:none} }
.ehr-right{inset-inline-end:0}
.ehr-left{inset-inline-start:0}
/* לשונית סגורה — כפתור עדין נקי באמצע הקצה */
.ehr-tab{pointer-events:auto;position:absolute;top:50%;transform:translateY(-50%);
  display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;
  background:#fffdf8;border:1px solid #ece4d3;color:#6b6150;font-family:inherit;
  padding:15px 8px;box-shadow:0 8px 26px -10px rgba(60,46,16,.22),0 2px 6px -2px rgba(60,46,16,.10);
  transition:color .15s,border-color .15s,box-shadow .15s,background .15s}
.ehr-right .ehr-tab{inset-inline-end:0;border-inline-end:none;border-radius:14px 0 0 14px}
.ehr-left .ehr-tab{inset-inline-start:0;border-inline-start:none;border-radius:0 14px 14px 0}
.ehr-tab:hover{color:#b07d12;border-color:#e3cf94;background:#fff;
  box-shadow:0 12px 32px -10px rgba(60,46,16,.30),0 3px 8px -2px rgba(60,46,16,.14)}
.ehr-tab-i{font-size:17px}
.ehr-tab-t{writing-mode:vertical-rl;font-size:12.5px;font-weight:800;letter-spacing:1px}
/* פאנל פתוח — לבן נקי, קו-זהב דק */
.ehr-panel{pointer-events:auto;position:absolute;top:0;bottom:0;width:min(330px,86vw);
  display:flex;flex-direction:column;background:#fffdf8;
  box-shadow:0 0 50px -8px rgba(60,46,16,.22);animation:ehr-in .22s ease}
.ehr-right .ehr-panel{inset-inline-end:0;border-inline-start:1px solid #ece4d3}
.ehr-left .ehr-panel{inset-inline-start:0;border-inline-end:1px solid #ece4d3}
@keyframes ehr-in{from{opacity:0;transform:translateX(var(--d,12px))}to{opacity:1;transform:none}}
.ehr-left .ehr-panel{--d:-12px}
.ehr-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 16px;
  border-bottom:1px solid #ece4d3;color:#221d12;font-family:inherit;font-size:15px;font-weight:800}
.ehr-x{cursor:pointer;background:#f4eede;border:1px solid #ece4d3;color:#6b6150;
  width:34px;height:34px;border-radius:9px;font-size:15px;transition:color .15s,background .15s}
.ehr-x:hover{color:#b07d12;background:#f3e6c2}
.ehr-body{flex:1;overflow-y:auto;padding:14px 16px;direction:rtl}
.ehr-empty{color:#9a8f78;font-family:inherit;font-size:13px;line-height:1.7}
`;
