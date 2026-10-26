import React, { useId } from "react";
import "./life-journey-atlas-2029.css";

// Display-only capability atlas. Every card opens an existing view or capability for the focused person;
// future capabilities are shown but never activated. No research, engine, provider or AI call lives here.
const STATE = Object.freeze({
  available: "זמין",
  references: "רמזים שמורים",
  no_references: "אין עדיין רמזים",
  error: "לא זמין כרגע",
  waiting: "ממתין לנתון",
  checked: "נבדק",
  building: "בבנייה",
  not_connected: "ממתין לחיבור",
});

const GROUPS = Object.freeze([
  {
    id: "personal",
    title: "מחקר אישי",
    note: "השם והתאריך של האדם שנבחר בעץ.",
    cards: [
      { id: "name", title: "מסע השם", blurb: "ערכי השם בשיטות הגימטריה הקיימות, עם חזרה מדויקת.", art: "name", kind: "capability", view: "name", action: "פתח את מסע השם" },
      { id: "date", title: "מסע התאריך", blurb: "התאריך העברי ומטריצת השם והתאריך של האדם.", art: "date", kind: "capability", view: "date", action: "פתח את מסע התאריך" },
      { id: "time", title: "שערי הזמן", blurb: "ימי לידה, מרווחים והתכנסויות זמן על ציר אחד.", art: "gates", kind: "map", tab: "time", action: "פתח את שערי הזמן" },
      { id: "summary", title: "התמונה האישית", blurb: "סיכום של מה שנבדק ומה הצעד הבא, בלי חישוב חדש.", art: "portrait", kind: "map", tab: "summary", action: "פתח את התמונה" },
    ],
  },
  {
    id: "family",
    title: "משפחה וחיבורים",
    note: "אותם אנשים, מזוויות של דורות וקשרים.",
    cards: [
      { id: "family-tree", title: "עץ המשפחה", blurb: "האנשים והקשרים ביניהם, בראש המסך.", art: "tree", kind: "anchor", action: "הצג בעץ" },
      { id: "generations", title: "דורות", blurb: "מי הורה של מי, לפי הקשרים ששמרתם.", art: "generations", kind: "map", tab: "generations", action: "פתח את הדורות" },
      { id: "relationships", title: "קשרים", blurb: "זוגות אנשים והחיבורים שנמצאו ביניהם.", art: "relations", kind: "map", tab: "relationships", action: "פתח את הקשרים" },
      { id: "convergences", title: "התכנסויות", blurb: "מספרים שחוזרים אצל כמה אנשים, לאחר נרמול.", art: "converge", kind: "map", tab: "convergences", action: "פתח את ההתכנסויות" },
      { id: "timeline", title: "ציר הזמן המשפחתי", blurb: "אירועי הלידה של כולם על ציר אחד.", art: "timeline", kind: "map", tab: "timeline", action: "פתח את ציר הזמן" },
    ],
  },
  {
    id: "deep",
    title: "מפות עומק",
    note: "מפעילים ידנית, עם נתונים שמזינים במפורש.",
    cards: [
      { id: "human", title: "Human Design", blurb: "מפת הגוף והערוצים מתוך נתוני הלידה שתזינו.", art: "human", kind: "map", tab: "creation", lens: "human", action: "פתח את Human Design" },
      { id: "sky", title: "מפת שמיים", blurb: "מיקומי גרמי השמיים והיבטים ברגע הלידה.", art: "sky", kind: "map", tab: "creation", lens: "sky", action: "פתח את מפת השמיים" },
      { id: "creation", title: "מפת היצירה", blurb: "האנשים כנקודות במרחב, עם אותיות והתכנסויות.", art: "creation", kind: "map", tab: "creation", lens: "spatial", action: "פתח את מפת היצירה" },
      { id: "sefer", title: "מפת ספר יצירה", blurb: "אמות, כפולות ופשוטות לכל אדם במסע.", art: "sefer", kind: "map", tab: "creation", lens: "sefer", action: "פתח את ספר יצירה" },
    ],
  },
  {
    id: "evidence",
    title: "ראיות ומקורות",
    note: "מה נבדק, מה נמצא, ומה עדיין חסר.",
    cards: [
      { id: "matrix", title: "מטריצה", blurb: "שורה לכל אדם: ערך השם, התאריך העברי והשיטות.", art: "matrix", kind: "map", tab: "matrix", action: "פתח את המטריצה" },
      { id: "evidence", title: "עוצמות ופערים", blurb: "כמה קבוצות שיטה עצמאיות תומכות בכל חיבור.", art: "strength", kind: "map", tab: "evidence", action: "פתח את העוצמות" },
      { id: "sources", title: "מקורות ופסוקים", blurb: "פסוקים וביטויים בעלי אותו ערך, ממאגר מאומת.", art: "sources", kind: "map", tab: "sources", action: "פתח את המקורות" },
      { id: "coverage", title: "כיסוי המחקר", blurb: "מה נבדק לכל אדם ומה עדיין חסר, לא ציון איכות.", art: "coverage", kind: "map", tab: "coverage", action: "פתח את הכיסוי" },
      { id: "private-hints", title: "הרמזים הפרטיים שלי", blurb: "הפניות ותאריכי תצפית שכבר שמורים במסע הפרטי, ללא שכפול.", art: "hints", kind: "map", tab: "hints", action: "פתח את הרמזים" },
      { id: "guide", title: "המסלול המודרך", blurb: "התחנות של המסע והצעד הבא, בלי להפעיל מנוע.", art: "guide", kind: "map", tab: "overview", action: "פתח את המסלול" },
    ],
  },
  {
    id: "soon",
    title: "בקרוב",
    note: "מוצגים כדי שתראו את הכיוון. אינם פעילים.",
    cards: [
      { id: "els", title: "ELS", blurb: "חיפוש רצפי אותיות במרווחים, כענף מרכזי של המסע.", art: "els", kind: "future", future: "not_connected", featured: true },
      { id: "hint-analysis", title: "פענוח רמזים ב־AI", blurb: "בדיקת הקשרים לתאריכים ולאנשים תופעל רק בעתיד ובלחיצה מפורשת.", art: "hints", kind: "future", future: "building" },
      { id: "raziel", title: "חיבור רזיאל לתמונה המחקרית", blurb: "תצוגת עתיד בלבד: אין בה שיחה, זיכרון או קריאה.", art: "raziel", kind: "future", future: "building" },
    ],
  },
]);

function Art({ kind }) {
  const common = { viewBox: "0 0 160 96", "aria-hidden": "true", focusable: "false", className: "life-atlas__svg" };
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const soft = { fill: "currentColor", opacity: 0.14 };
  const mid = { fill: "currentColor", opacity: 0.32 };
  switch (kind) {
    case "name": return <svg {...common}><rect x="14" y="18" width="132" height="60" rx="16" {...soft} /><text x="80" y="62" textAnchor="middle" fontSize="38" fontWeight="650" fill="currentColor" style={{ fontFamily: "var(--s29-font-ui, Rubik, sans-serif)" }}>אבג</text><path d="M36 70h88" {...line} opacity="0.45" /><circle cx="128" cy="30" r="4" {...mid} /></svg>;
    case "date": return <svg {...common}><rect x="30" y="18" width="100" height="62" rx="12" {...soft} /><path d="M30 38h100M56 12v14m48-14v14" {...line} /><path d="M50 52h12m10 0h12m10 0h12M50 66h12m10 0h12" {...line} opacity="0.7" /><circle cx="108" cy="66" r="6" {...mid} /></svg>;
    case "gates": return <svg {...common}><circle cx="80" cy="50" r="34" {...soft} /><circle cx="80" cy="50" r="34" {...line} /><circle cx="80" cy="50" r="20" {...line} opacity="0.5" /><path d="M80 50V30m0 20 14 8" {...line} /><path d="M80 12v8m0 60v8M30 50h8m84 0h8" {...line} opacity="0.6" /></svg>;
    case "portrait": return <svg {...common}><rect x="36" y="10" width="88" height="76" rx="16" {...soft} /><circle cx="80" cy="38" r="14" {...mid} /><path d="M52 78c4-16 14-22 28-22s24 6 28 22" {...line} /><path d="M136 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" {...mid} /></svg>;
    case "tree": return <svg {...common}><path d="M80 24v18M80 42H44m36 0h36M44 42v18m72-18v18" {...line} /><circle cx="80" cy="18" r="9" {...mid} /><circle cx="44" cy="68" r="9" {...soft} /><circle cx="44" cy="68" r="9" {...line} /><circle cx="116" cy="68" r="9" {...soft} /><circle cx="116" cy="68" r="9" {...line} /><path d="M44 77v8m72-8v8" {...line} opacity="0.5" /></svg>;
    case "generations": return <svg {...common}><rect x="52" y="12" width="56" height="18" rx="9" {...mid} /><rect x="30" y="40" width="40" height="18" rx="9" {...soft} /><rect x="90" y="40" width="40" height="18" rx="9" {...soft} /><rect x="52" y="68" width="56" height="18" rx="9" {...mid} /><path d="M80 30v6m-30 4v-4h60v4M80 58v6" {...line} opacity="0.7" /></svg>;
    case "relations": return <svg {...common}><circle cx="42" cy="48" r="16" {...soft} /><circle cx="42" cy="48" r="16" {...line} /><circle cx="118" cy="48" r="16" {...soft} /><circle cx="118" cy="48" r="16" {...line} /><path d="M58 48h44" {...line} strokeDasharray="2 7" /><path d="M72 38c4-6 12-6 16 0M72 58c4 6 12 6 16 0" {...line} opacity="0.6" /></svg>;
    case "converge": return <svg {...common}><path d="M16 18c40 4 50 20 64 30M16 48h64M16 78c40-4 50-20 64-30" {...line} opacity="0.7" /><circle cx="84" cy="48" r="9" {...mid} /><circle cx="84" cy="48" r="18" {...line} opacity="0.4" /><path d="M96 48h46" {...line} /></svg>;
    case "timeline": return <svg {...common}><path d="M14 56h132" {...line} /><circle cx="36" cy="56" r="7" {...mid} /><circle cx="86" cy="56" r="7" {...mid} /><circle cx="124" cy="56" r="7" {...soft} /><circle cx="124" cy="56" r="7" {...line} /><path d="M36 49V30m50 19V22m38 27V36" {...line} opacity="0.6" /><rect x="22" y="16" width="28" height="14" rx="6" {...soft} /><rect x="72" y="8" width="28" height="14" rx="6" {...soft} /></svg>;
    case "human": return <svg {...common}><path d="M80 10l16 14-16 14-16-14z" {...soft} /><path d="M80 10l16 14-16 14-16-14z" {...line} /><rect x="66" y="46" width="28" height="18" rx="4" {...mid} /><path d="M80 38v8m0 18v8M66 55H44m72 0H94M52 78l28-14 28 14" {...line} opacity="0.7" /><circle cx="80" cy="80" r="7" {...soft} /><circle cx="80" cy="80" r="7" {...line} /></svg>;
    case "sky": return <svg {...common}><circle cx="80" cy="48" r="38" {...soft} /><circle cx="80" cy="48" r="38" {...line} /><circle cx="80" cy="48" r="22" {...line} opacity="0.5" /><path d="M80 10v76M42 48h76M53 21l54 54M107 21L53 75" {...line} opacity="0.35" /><circle cx="100" cy="32" r="5" {...mid} /><circle cx="62" cy="62" r="4" {...mid} /></svg>;
    case "creation": return <svg {...common}><path d="M80 14l46 20v28L80 82 34 62V34z" {...soft} /><path d="M80 14l46 20-46 20-46-20zM80 54v28M34 34v28m92-28v28" {...line} /><circle cx="80" cy="34" r="4" {...mid} /></svg>;
    case "sefer": return <svg {...common}><path d="M80 24c-14-8-32-8-48-2v52c16-6 34-6 48 2 14-8 32-8 48-2V22c-16-6-34-6-48 2z" {...soft} /><path d="M80 24v52M80 24c-14-8-32-8-48-2v52c16-6 34-6 48 2 14-8 32-8 48-2V22c-16-6-34-6-48 2z" {...line} /><path d="M46 40h20m-20 10h20m28-10h20m-20 10h20" {...line} opacity="0.5" /></svg>;
    case "matrix": return <svg {...common}><rect x="28" y="14" width="104" height="68" rx="10" {...soft} /><path d="M28 36h104M28 58h104M62 14v68M97 14v68" {...line} opacity="0.7" /><rect x="64" y="38" width="31" height="19" rx="3" {...mid} /></svg>;
    case "strength": return <svg {...common}><path d="M26 82h108" {...line} /><rect x="34" y="52" width="16" height="30" rx="4" {...soft} /><rect x="62" y="34" width="16" height="48" rx="4" {...mid} /><rect x="90" y="20" width="16" height="62" rx="4" {...mid} /><rect x="118" y="62" width="16" height="20" rx="4" {...soft} /><path d="M34 46h16m12-18h16m12-14h16" {...line} opacity="0.4" strokeDasharray="2 5" /></svg>;
    case "sources": return <svg {...common}><path d="M46 14h56c8 0 12 6 12 12v52c0 4-4 8-8 8H54c-8 0-12-4-12-10V18" {...soft} /><path d="M46 14h56c8 0 12 6 12 12v52c0 4-4 8-8 8H54c-8 0-12-4-12-10V18c0-2 2-4 4-4z" {...line} /><path d="M58 34h40M58 48h40M58 62h26" {...line} opacity="0.6" /></svg>;
    case "coverage": return <svg {...common}><circle cx="80" cy="48" r="32" {...soft} /><path d="M80 16a32 32 0 0 1 28 48" {...line} strokeWidth="6" opacity="0.75" /><circle cx="80" cy="48" r="32" {...line} opacity="0.4" /><circle cx="80" cy="48" r="12" {...mid} /></svg>;
    case "guide": return <svg {...common}><path d="M20 70c24 0 24-44 48-44s24 44 48 44h24" {...line} strokeDasharray="1 7" /><circle cx="28" cy="70" r="7" {...mid} /><circle cx="68" cy="26" r="7" {...mid} /><circle cx="116" cy="70" r="7" {...soft} /><circle cx="116" cy="70" r="7" {...line} /><path d="M132 62l8 8-8 8" {...line} /></svg>;
    case "els": return <svg {...common}><g {...line} opacity="0.7"><rect x="40" y="10" width="26" height="22" rx="4" /><rect x="67" y="10" width="26" height="22" rx="4" /><rect x="94" y="10" width="26" height="22" rx="4" /><rect x="40" y="37" width="26" height="22" rx="4" /><rect x="67" y="37" width="26" height="22" rx="4" /><rect x="94" y="37" width="26" height="22" rx="4" /><rect x="40" y="64" width="26" height="22" rx="4" /><rect x="67" y="64" width="26" height="22" rx="4" /><rect x="94" y="64" width="26" height="22" rx="4" /></g><rect x="40" y="10" width="26" height="22" rx="4" {...mid} /><rect x="67" y="37" width="26" height="22" rx="4" {...mid} /><rect x="94" y="64" width="26" height="22" rx="4" {...mid} /></svg>;
    case "hints": return <svg {...common}><circle cx="70" cy="44" r="22" {...line} strokeDasharray="3 6" /><path d="M86 60l26 24" {...line} strokeDasharray="3 6" /><path d="M58 44h24M70 32v24" {...line} opacity="0.4" /></svg>;
    case "raziel": return <svg {...common}><circle cx="80" cy="48" r="26" {...line} strokeDasharray="3 6" /><circle cx="80" cy="48" r="12" {...soft} /><circle cx="80" cy="48" r="38" {...line} strokeDasharray="1 9" opacity="0.5" /></svg>;
    default: return <svg {...common}><circle cx="80" cy="48" r="24" {...soft} /></svg>;
  }
}

function stateFor(card, ctx) {
  const { focused, researchReady, selectedPeople, datedPeople, relationshipPairs, links, sourceCount, convergenceCount, hasMembers } = ctx;
  const has = (key) => ({ key, enabled: true });
  if (card.kind === "future") return { key: card.future, enabled: false };
  if (card.kind === "anchor") return has("available");
  switch (card.id) {
    case "name": return !focused ? { key: "waiting", enabled: false } : focused.researchReady ? has("checked") : has("available");
    case "date": return !focused?.hasBirthdate ? { key: "waiting", enabled: false } : has("available");
    case "time": return datedPeople ? has("available") : { key: "waiting", enabled: true };
    case "summary": return has("available");
    case "generations": return links ? has("available") : { key: "waiting", enabled: true };
    case "relationships": return relationshipPairs ? has("available") : { key: "waiting", enabled: true };
    case "convergences": return convergenceCount ? has("checked") : { key: "waiting", enabled: true };
    case "timeline": return datedPeople ? has("available") : { key: "waiting", enabled: true };
    case "human": case "sky": case "creation": case "sefer": return hasMembers ? has("available") : { key: "waiting", enabled: false };
    case "matrix": return researchReady ? has("checked") : { key: "waiting", enabled: true };
    case "evidence": return researchReady ? has("checked") : { key: "waiting", enabled: true };
    case "sources": return sourceCount ? has("checked") : { key: "waiting", enabled: true };
    case "coverage": return selectedPeople ? has("available") : { key: "waiting", enabled: false };
    case "private-hints": return has(["references", "no_references", "error"].includes(ctx.hintState) ? ctx.hintState : "waiting");
    case "guide": return has("available");
    default: return has("available");
  }
}

export default function LifeJourneyAtlas2029({ projection, members, focusedMemberRef, position, panelOpen, onOpenMap, onOpenCapability, onShowTree }) {
  const titleId = useId();
  const focused = projection.coverage.find(row => row.memberRef === focusedMemberRef) || null;
  const ctx = {
    focused,
    researchReady: projection.overview.researchReady,
    selectedPeople: projection.overview.selectedPeople,
    datedPeople: projection.overview.datedPeople,
    relationshipPairs: projection.overview.relationshipPairCount,
    links: projection.generations.links.length,
    sourceCount: projection.overview.sourceCount,
    convergenceCount: projection.overview.convergenceCount,
    hasMembers: members.length > 0,
    hintState: projection.synthesisPack.observations.hints.state,
  };
  const focusedName = focused?.name || "";
  const activate = (card) => {
    if (card.kind === "capability") onOpenCapability(focusedMemberRef, card.view);
    else if (card.kind === "anchor") onShowTree();
    else if (card.kind === "map") onOpenMap(card.tab, { memberRef: focusedMemberRef, ...(card.lens ? { lens: card.lens } : {}) });
  };
  return <section className="life-atlas" data-experience-capability="life-journey-capability-atlas" aria-labelledby={titleId}>
    <header className="life-atlas__head">
      <div><small>כל מה שיש וכל מה שמתוכנן</small><h4 id={titleId}>אטלס היכולות של המסע</h4></div>
      {focusedName ? <span className="life-atlas__for">עבור <b>{focusedName}</b></span> : null}
    </header>
    {GROUPS.map(group => <section key={group.id} className="life-atlas__group" data-group={group.id} data-count={group.cards.length} aria-label={group.title}>
      <header><h5 className="life-atlas__group-title">{group.title}</h5><p>{group.note}</p></header>
      <ul className="life-atlas__cards">
        {group.cards.map(card => {
          const state = stateFor(card, ctx);
          const active = Boolean(panelOpen && card.kind === "map" && position.tab === card.tab && (!card.lens || position.lens === card.lens));
          const disabled = !state.enabled;
          const hintCoverage = card.id === "private-hints" ? projection.synthesisPack.observations.hints : null;
          const hintDetail = hintCoverage?.state === "references"
            ? `${hintCoverage.referenceCount} הפניות פרטיות · ${hintCoverage.datedCount} עם תאריך מפורש`
            : hintCoverage?.state === "error" ? "הקריאה הפרטית לא הושלמה; לא מוצג מצב ריק מטעה."
              : hintCoverage?.state === "no_references" ? "הענף מחובר ומוכן לרמז הראשון." : "טוען את ההפניות הפרטיות…";
          return <li key={card.id} className={`life-atlas__card${card.featured ? " is-featured" : ""}`} data-map-card={card.id} data-map-tab={card.tab || ""} data-state={state.key} data-kind={card.kind} data-active={active ? "true" : "false"}>
            <div className="life-atlas__art"><Art kind={card.art} /></div>
            <div className="life-atlas__body">
              <h6>{card.title}</h6>
              <p>{card.blurb}</p>
              <div className="life-atlas__foot">
                <span className="life-atlas__state" data-state={state.key}>{STATE[state.key]}</span>
                {card.kind === "future"
                  ? <span className="life-atlas__soon">לא פעיל</span>
                  : <button type="button" className="life-atlas__action" data-atlas-action disabled={disabled} aria-current={active ? "true" : undefined} onClick={() => activate(card)}>{card.action}</button>}
              </div>
              {card.kind === "future" ? null : disabled && card.kind === "capability" ? <small className="life-atlas__hint">{!focused ? "בחרו אדם בעץ." : "חסר תאריך לידה לאדם הזה."}</small> : null}
              {hintCoverage ? <small className="life-atlas__hint">{hintDetail}</small> : null}
            </div>
          </li>;
        })}
      </ul>
    </section>)}
  </section>;
}
