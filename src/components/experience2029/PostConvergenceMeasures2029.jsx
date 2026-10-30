// Adopted A disclosure; corrected under Reality Graph v8. No score engine or store.
import React, { useEffect, useRef, useState } from "react";
import { qualityStars, strengthValue } from "../../lib/ratings2029.js";
import { projectCoverageChecks, sourceGroups } from "../../lib/research/contextDepthProjection2029.js";
import { readPostConvergencePage2029, checkPostCalculation2029 } from "../../lib/research/post2029ReadingProjection.js";
import "./postConvergenceMeasures2029.css";

const RESULTS = { matched: "תוצאת המנוע תואמת לטענה הזאת", mismatch: "התוצאה אינה תואמת או שהשיטה אינה זמינה", failed: "קריאת המנוע נכשלה", not_tested: "טרם נבדק" };
const STEPS = { matched: "צעדי החישוב נבדקו ותואמים", not_tested: "צעדי החישוב טרם נבדקו", unavailable: "צעדי חישוב לא התקבלו", unavailable_or_mismatch: "הצעדים חסרים או אינם תואמים", version_mismatch: "גרסת צעדי החישוב אינה תואמת", failed: "קריאת הצעדים נכשלה" };
const EMPTY = { status: "loading", cards: [], hasMore: false, offset: 0 };

export default function PostConvergenceMeasures2029({ sourcePost, sourceProjection = null, claims = [], placements = [], initialCardId = null, onOpenCalculation, onNavigate, onRefresh, onSourceInvalid } = {}) {
  const [page, setPage] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const [checks, setChecks] = useState({});
  const [busyClaim, setBusyClaim] = useState(null);
  const [notice, setNotice] = useState(null);
  const request = useRef(0), claimRequest = useRef(0);
  const invalidate = result => {
    if (!result.status.startsWith("source_")) return false;
    setPage({ ...EMPTY, status: result.status }); setSelected(null); setChecks({});
    onSourceInvalid?.(result.status); return true;
  };
  const load = async (offset = 0, selectedId = null) => {
    const ticket = ++request.current;
    ++claimRequest.current;
    setBusyClaim(null); setNotice(null); setChecks({}); setSelected(null); setPage({ ...EMPTY, offset });
    const result = await readPostConvergencePage2029(sourcePost, { offset, selectedId });
    if (ticket !== request.current || invalidate(result)) return;
    setPage({ ...result, cards: result.cards || [], offset });
    if (selectedId != null) { setSelected(result.cards?.find(card => card.id === selectedId) || null); setListOpen(false); }
  };
  useEffect(() => {
    void load(0, initialCardId);
    return () => { ++request.current; ++claimRequest.current; };
  }, [sourcePost.id, sourcePost.modified]); // Post keys this consumer by source + viewer

  const inspectClaim = async (claim, open) => {
    const ticket = ++claimRequest.current; ++request.current;
    setBusyClaim(claim.id); setNotice(null); setSelected(null);
    setPage({ ...EMPTY, status: "not_tested" }); setChecks({});
    const result = await checkPostCalculation2029(sourcePost, claim, { checkSteps: !open, sourceProjection });
    if (ticket !== claimRequest.current || invalidate(result)) return;
    setBusyClaim(null); setChecks({ [claim.id]: result });
    if (result.status === "ready" && open) onOpenCalculation?.(result);
    else if (result.status === "incomplete_claim") setNotice("חסרים ביטוי, שיטה, ערך או מיקום מקור מדויק. אין השלמה אוטומטית.");
    else if (result.status === "method_version_unavailable_or_changed") setNotice("גרסת השיטה חסרה או השתנתה; הטענה לא אומתה ולא נפתחה בשיטה חלופית.");
  };
  const openSelectedCard = async event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !selected) return;
    event.preventDefault();
    const card = selected, ticket = ++request.current;
    setSelected(null); setPage(EMPTY);
    const result = await readPostConvergencePage2029(sourcePost, { selectedId: card.id });
    if (ticket !== request.current || invalidate(result)) return;
    setPage({ ...result, cards: result.cards || [], offset: 0 });
    const fresh = result.cards?.find(item => item.id === card.id);
    if (!fresh) { setNotice("הכרטיס אינו זמין כעת במסלול שנבדק."); return; }
    setSelected(fresh); onNavigate?.(event, fresh.href, fresh);
  };
  if (page.status.startsWith("source_")) return null;
  const q = qualityStars(selected?.quality), s = strengthValue(selected?.meterScore);
  const checked = Object.values(checks), groups = sourceGroups(placements);
  const engineChecks = checked.filter(row => ["matched", "mismatch"].includes(row.resultMatch));
  const dimensions = projectCoverageChecks({
    calculations: { state: checked.some(row => row.status === "failed") ? "failed" : engineChecks.length ? "partial" : "not_tested",
      scope: `${engineChecks.length} טענות נבדקו במנוע מתוך ${claims.length} שיוכים ממופים בהיקף הקריאה.`, missing: "לא פוענחו כל הטקסט והתמונות. אין אימות של הפרשנות או של כל הפוסט." },
    convergence: { state: page.status === "failed" ? "failed" : page.status !== "ready" ? "not_tested" : page.cards.length ? "partial" : "not_found",
      scope: page.scope || "קריאת כרטיסים ציבוריים דרך מספרים משותפים.", missing: page.hasMore ? "יש עמודים נוספים; קשרים ישירים לא נבדקו." : "זו בדיקת תגיות בלבד; קשרים שאינם עוברים דרך מספר לא נבדקו." },
    independence: { state: "not_tested", scope: "קיבוץ הופעות לפי המקור ומזהה הקובץ המדויקים שנמסרו.", missing: "מספר קבוצות המקור אינו מספר ראיות עצמאיות. תלות בין מקורות שונים טרם נבדקה." },
    editor: { state: selected ? "partial" : "not_tested", scope: selected ? `שדה האיכות בכרטיס „${selected.label}”.` : "לא נבחר כרטיס.", missing: "הדירוג אינו מועבר לפוסט. זהב ויהלום נשארים אצל מקור האצירה הקיים בכרטיס." },
    links: { state: "not_tested", scope: "מסלול מספר משותף מוצג כעקיף בלבד.", missing: "לא נבדקו קשרים ישירים במפת המחקר או קשרי מועמדות." },
    approval: { state: "not_tested", scope: "נבדקת הרשאת הצגת המקור והכרטיסים לפני הקריאה.", missing: "הרשאת תצוגה אינה אימות או אישור ממצאי הפוסט; לא נקרא תור אישורים פרטי." },
  });
  return <section className="k29-pcm k29-pcm-compact" aria-label="מדדי הפוסט" data-post-measures="one-tree">
    <header className="k29-pcm-head"><h2>המחקר סביב הפוסט</h2><button type="button" onClick={onRefresh}>רענון מהמקור</button></header>
    <p className="k29-pcm-fine">ארבע קריאות נפרדות. הכרטיס, טענת החישוב והמקור שומרים כל אחד את זהותו.</p>
    {page.status === "loading" ? <p role="status">בודק מקור והרשאת תצוגה…</p> : <>
      {page.status === "failed" ? <p role="alert">קריאת ההתכנסויות נכשלה. לא מוצגים מדדים קודמים.</p> : null}
      {page.status === "not_tested" && page.scope ? <p>{page.scope}</p> : null}
      <div className="k29-pcm-rows">
        <div className="k29-pcm-reading"><h3>חוזק התכנסות</h3>
          {selected ? <><p>{selected.shared.map(n => `דרך המספר ${n}`).join(" · ")} — התכנסות {selected.label}</p>
            <p data-convergence-strength>{s.state === "known" ? `ציון הכרטיס: ${s.value} מתוך 100` : "אין נתון"}</p>
            <p className="k29-pcm-fine">הציון שייך לכרטיס הזה; הוא אינו אחוז ודאות או חוזק הפוסט. מקור: מד ההתכנסות השמור בכרטיס. הפירוק לרכיבים אינו זמין בקריאה הזאת.</p>
            <a href={selected.href} onClick={event => void openSelectedCard(event)}>לכרטיס, למקור המדד ולהסבר</a>
          </> : <p>בחרו התכנסות כדי לראות את הציון שלה. אין בחירה אוטומטית לפי ציון.</p>}
          <button type="button" onClick={() => { setListOpen(true); void load(0); }}>רשימת ההתכנסויות הרלוונטיות</button>
        </div>
        <div className="k29-pcm-reading"><h3>איכות עריכתית</h3>
          <p data-card-quality>{!selected ? "לא נבחר כרטיס" : q.state !== "rated" ? "לא דורג" : <><span role="img" aria-label={`דירוג הכרטיס ${q.stars} מתוך 5 כוכבים`}>{"★".repeat(q.stars)}{"☆".repeat(5 - q.stars)}</span> · {q.raw}/10 · {selected.label}</>}</p>
          <p className="k29-pcm-fine">אצירה ידנית של הכרטיס שנבחר. אין הורשה לפוסט או לממצאיו; סימוני זהב ויהלום נפתחים במקור האצירה בכרטיס.</p>
        </div>
        <div className="k29-pcm-reading"><h3>כיסוי הבדיקה</h3><p>שישה תחומים נפרדים, לפי היקף הבדיקה שבוצעה.</p>
          <details><summary>מה נבדק ומה חסר</summary><ul className="k29-pcm-dims">{dimensions.map(d => <li key={d.key} data-check-state={d.state}><strong>{d.label} · {d.stateLabel}</strong><p>{d.scope}</p><p className="k29-pcm-fine">{d.missing}</p></li>)}</ul></details>
        </div>
        <div className="k29-pcm-reading"><h3>אימות טענת חישוב</h3><p>בוחרים טענה מסוימת. התאמת תוצאה וצעדי חישוב מוצגים בנפרד.</p>
          <details><summary>טענות חישוב ממופות ({claims.length})</summary>
            {!claims.length ? <p>לא נמצאו שיוכי ביטוי־שיטה־ערך מפורשים בקריאה הזאת. תגית מספרית אינה חישוב; ייתכן חומר שלא פוענח בטקסט או בתמונה.</p> : <ul className="k29-pcm-claims">{claims.map(claim => <li key={claim.id}>
              <strong dir="auto">{claim.expression} · {claim.method || "שיטה חסרה"} · {claim.value ?? "ערך חסר"}</strong>
              <p className="k29-pcm-fine">{claim.binding === "saved_text_annotation" ? "זוהה בטקסט שמור; לא אומת בתמונה." : "שיוך מהיטל הקריאה המתועד של הפוסט; לא קריאה מאומתת של תמונה."} גרסת שיטה במקור: {claim.methodVersion || "לא נמסרה"}. {claim.locatorPrecision === "section" ? "המיקום הוא מקטע המקור." : !claim.locator ? "המיקום טרם אותר." : "קיים מיקום הופעה מדויק."}</p>
              {claim.locator ? <a href={claim.locator}>למיקום בפוסט</a> : null}
              <div className="k29-pcm-actions"><button type="button" disabled={busyClaim != null || !claim.method || claim.value == null || !claim.locator} onClick={() => void inspectClaim(claim, false)}>בדיקת תוצאה וצעדים</button>
                <button type="button" disabled={busyClaim != null || !claim.method || claim.value == null || !claim.locator} onClick={() => void inspectClaim(claim, true)}>פתיחה בחלונית המספר</button></div>
              {busyClaim === claim.id ? <p role="status">בודק את הטענה והמקור…</p> : null}
              {checks[claim.id] ? <div role="status"><p>{RESULTS[checks[claim.id].resultMatch] || "הטענה לא נבדקה"}</p><p>{STEPS[checks[claim.id].steps] || "הצעדים לא נבדקו"}</p>{checks[claim.id].methodVersion ? <p>גרסת המנוע שנקראה: {checks[claim.id].methodVersion}</p> : null}</div> : null}
            </li>)}</ul>}
          </details>
          <p className="k29-pcm-fine">החלונית המשותפת יכולה להציג שיטות נוספות מהמנוע, בנפרד מהשיטה שבמקור. חישוב תקין אינו מאמת את הפרשנות או הקשר לאירוע.</p>
        </div>
      </div>
      {notice ? <p role="alert">{notice}</p> : null}
      {listOpen ? <div className="k29-pcm-cards" aria-label="בחירת התכנסות">
        {page.status === "ready" && !page.cards.length ? <p>לא נמצא כרטיס ציבורי במסלול שנבדק.</p> : null}
        <ul>{page.cards.map(card => <li key={card.id}><p>{card.shared.map(n => `דרך המספר ${n}`).join(" · ")} — התכנסות {card.label}</p><p className="k29-pcm-fine">מסלול עקיף דרך תגיות המקור; אין כאן קשר ישיר מתועד או קשר סיבתי.</p><button type="button" onClick={() => void load(page.offset, card.id)}>בחירה: {card.label}</button></li>)}</ul>
        <div className="k29-pcm-actions">{page.offset > 0 ? <button type="button" onClick={() => void load(Math.max(0, page.offset - 8))}>לעמוד הקודם</button> : null}{page.hasMore ? <button type="button" onClick={() => void load(page.nextOffset)}>לעמוד הבא</button> : null}</div>
        <p className="k29-pcm-fine">סדר קבוע לפי המקור, ללא דירוג לפי הציון. מוצג עמוד תחום; אין כאן מניין של כל המחקר.</p>
      </div> : null}
      <details><summary>מקורות, הופעות ותלות</summary><p>{groups.length} קבוצות מקור/קובץ שזוהו בהיקף המוצג; עצמאותן טרם נבדקה.</p>
        <p className="k29-pcm-fine">תגית וגוף הפוסט הם אותה קבוצת מקור. אותו מזהה קובץ בכמה הופעות נספר פעם אחת; כל ההופעות נשמרות. עותקים ששינו מזהה או קובץ דורשים בירור תלות.</p>
        <ul>{placements.map((item, index) => <li key={`${item.ref}:${index}`}>{item.kind === "image" ? "הופעת תמונה" : item.kind === "tag" ? "תגיות הפוסט" : "גוף הפוסט"}{item.occurrence?.locator ? <> · <a href={item.occurrence.locator}>למיקום המקור</a></> : null}</li>)}</ul>
      </details>
      <p className="k29-pcm-fine">הרענון מתבצע בפתיחה ובפעולה מפורשת. כשל או שינוי מקור מסתירים נגזרות קודמות. תאריך פרסום המקור אינו זמן אירוע או זמן קליטה.</p>
    </>}
  </section>;
}
