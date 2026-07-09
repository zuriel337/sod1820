import React, { useState } from "react";
import { createPortal } from "react-dom";
import { emit, EVENTS } from "../../lib/research/eventBus.js";
import ResearchCenter from "../ResearchCenter.jsx";
import { rwCss, RW_VARS } from "../../lib/research/theme.js";
import { trackResearch } from "../../lib/tracking.js";

// 🧪 EntityHub — שלד הסרגלים (Reality Graph Law · Reader→Research).
// המרכז נשאר בדיוק כמו היום. שני סרגלים מתקפלים, **סגורים כברירת-מחדל**, ו**תואמים למעבדה**:
//   • שמאל = עולם המשתמש (אני · המחקר הפעיל · שמורים · מפה) — בדיוק כמו במעבדה
//   • ימין  = מנועי המחקר (AI · מה מחפשים) — בדיוק כמו במעבדה
// «אדם תמים» רואה דף נקי; ברגע שפותח סרגל — הוא «במעבדה». הפתיחה נזכרת
// (opened once = researcher). אותו תוכן (ResearchCenter) ואותה שפה בהירה כמו /research.
const KEY = "hub_rails_v1";

export default function EntityHubRails({ entity }) {
  const [open, setOpen] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } });
  // ברירת-מחדל «שמור» (החלטת צוריאל 9.7.2026): שרואים קודם את השמירה והמחקר — הפנקס חזר להיות טאב.
  // מפתח נפרד מהמעבדה (rw_left_tab של ResearchShell) — כאן דף-המספר בלבד.
  const [ltab, setLtabRaw] = useState(() => { try { return localStorage.getItem("rw_hub_tab") || "saved"; } catch { return "saved"; } });
  const setLtab = t => { setLtabRaw(t); try { localStorage.setItem("rw_hub_tab", t); } catch { /* noop */ } };
  const set = (side, v) => setOpen(o => {
    const n = { ...o, [side]: v };
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* noop */ }
    if (v) { emit(EVENTS.RESEARCH_ADD ? "hub:enter" : "hub:enter", { side, entity }); trackResearch("open", { where: "rail" }); } // נכנס למצב חוקר
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
        <>
          {/* 📱 בנייד: רקע-הקשה — נגיעה מחוץ לפאנל סוגרת (הפאנל לא תופס את כל העמוד) */}
          <div className="ehr-back" onClick={() => set(side, false)} aria-hidden />
          <div className="ehr-panel">
            <div className="ehr-head">
              <b>{icon} {label}</b>
              <button className="ehr-x" onClick={() => set(side, false)} aria-label="סגור">✕</button>
            </div>
            <div className="ehr-body" style={RW_VARS}>{content}</div>
          </div>
        </>
      )}
    </aside>
  );

  // אותו תוכן כמו המעבדה (ResearchCenter) — עץ אחד. שמאל=עולם-המשתמש · ימין=מנועי-המחקר.
  return createPortal((
    <>
      <style>{RAILS_CSS}</style>
      <style>{rwCss()}</style>
      {/* 👤 «עולם המשתמש» — לשונית-צד שמאלית (inline-end ב-RTL) בכל רוחב מסך.
          החלטת צוריאל (9.7.2026): גם בנייד עמודת-צד, לא כפתור-תחתון/גיליון-תחתון.
          הרכיב מורכב רק בדף-המספר (EntityPage) — לא להרחיב לדפים אחרים. */}
      {rail("right", "👤", "עולם המשתמש", <ResearchCenter variant="context" tabbed activeTab={ltab} onTab={setLtab} />)}
      {/* הסרגל הימני (מנועי המחקר) מוסתר בדף-המספר העצמאי לבקשת צוריאל — רק קיר-המשתמש מוצג.
         {rail("left", "🧮", "מנועי המחקר", <ResearchCenter variant="tools" />)} */}
    </>
  ), document.body);
}

// פלטה בהירה נקייה (research_workspace_law) — «כמו Claude, לא GPT»: קרם/לבן, קווים דקים,
// טקסט כהה, נגיעת-זהב עדינה. לא דארק-מוד. שקט, אוורירי, מודרני.
const RAILS_CSS = `
/* לשונית-צד בכל רוחב מסך (החלטת צוריאל 9.7.2026 — גם בנייד עמודת-צד, לא למטה).
   מתחת לסרגל-העליון (Navbar=64px) — לא לדרוס אותו. */
.ehr{display:block;position:fixed;top:64px;bottom:0;z-index:46;pointer-events:none;
  font-family:'Heebo',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
.ehr-right{inset-inline-end:0}
.ehr-left{inset-inline-start:0}
/* לשונית סגורה — כפתור עדין נקי באמצע הקצה */
.ehr-tab{pointer-events:auto;position:absolute;top:50%;transform:translateY(-50%);
  display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;
  background:#fffdf8;border:1px solid #ece4d3;color:#6b6150;font-family:inherit;
  padding:15px 8px;box-shadow:0 8px 26px -10px rgba(60,46,16,.22),0 2px 6px -2px rgba(60,46,16,.10);
  transition:color .15s,border-color .15s,box-shadow .15s,background .15s}
/* border-radius לוגי → הפינה המעוגלת תמיד פונה פנימה (לא לקצה המסך), נכון גם ב-RTL */
.ehr-right .ehr-tab{inset-inline-end:0;border-inline-end:none;
  border-start-start-radius:14px;border-end-start-radius:14px;border-start-end-radius:0;border-end-end-radius:0}
.ehr-left .ehr-tab{inset-inline-start:0;border-inline-start:none;
  border-start-end-radius:14px;border-end-end-radius:14px;border-start-start-radius:0;border-end-start-radius:0}
.ehr-tab:hover{color:#b07d12;border-color:#e3cf94;background:#fff;
  box-shadow:0 12px 32px -10px rgba(60,46,16,.30),0 3px 8px -2px rgba(60,46,16,.14)}
.ehr-tab-i{font-size:20px}
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

/* רקע-הקשה לסגירה — פעיל רק בנייד (בדסקטופ הפאנל צר ולא צריך) */
.ehr-back{display:none}

/* 📱 נייד — עמודת-צד קומפקטית: הפאנל לא תופס את כל העמוד, נגיעה בחוץ סוגרת, ✕ גדול */
@media (max-width:859px){
  .ehr-tab{padding:16px 10px}
  .ehr-back{display:block;pointer-events:auto;position:fixed;inset:0;z-index:0;
    background:rgba(20,15,5,.28);animation:ehr-fade .18s ease}
  @keyframes ehr-fade{from{opacity:0}to{opacity:1}}
  .ehr-panel{width:min(300px,78vw);z-index:1}
  .ehr-x{width:44px;height:44px;font-size:18px}
  .ehr-head{padding:12px 14px}
  .ehr-body{padding:12px 12px}
}
`;
