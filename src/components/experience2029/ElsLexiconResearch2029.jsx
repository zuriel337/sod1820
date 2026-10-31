import React, { useEffect, useMemo, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { elsLexiconWindowKey, prepareElsLexiconFindings, ELS_LEXICON_PRESETS, expandElsLexiconPlan, filterElsForwardSource } from "../../lib/research/elsLexiconResearch.js";
import { groupElsLexiconDiscoveries, ELS_DISCOVERY_GROUP_LABELS } from "../../lib/research/elsStructureInspection.js";
import ElsStructureResearch2029 from "./ElsStructureResearch2029.jsx";
import "./elsLexiconResearch2029.css";

const errors = {
  "window-too-large": "חלון המחקר גדול מתקציב הסריקה. הקטינו אותו ונסו שוב.",
  "lexicon-unavailable": "אוצר הלשון לא נטען או לא עבר בדיקת תקינות. לא בוצעה סריקה.",
  "results-changed": "המופע השתנה. הפעילו סריקה חדשה במפורש.",
  "scan-failed": "הסריקה לא הושלמה. אין להסיק מכך שאין מילים באזור.",
};
const sources = { canonical_tanakh_words: "מילות התנ״ך", maftech_core_snapshot: "מילון הליבה" };

export default function ElsLexiconResearch2029({ state, visible, busy, response, onRequest, onRestore, color, onFocus, onFindWords }) {
  const [run, setRun] = useState(null), [result, setResult] = useState(null), [notice, setNotice] = useState("");
  const [page, setPage] = useState(0), [kind, setKind] = useState("groups"), [groupType, setGroupType] = useState("all");
  const [inspectionVisited, setInspectionVisited] = useState(false);
  const [plan, setPlan] = useState({ minLength: 5, maxLength: 10, maxDistance: 120, minMembers: 2 });
  const [hideForwardSource, setHideForwardSource] = useState(false);
  const languagePlan = plan.mode === "language";
  const scanButton = useRef(null);
  const active = useRef(null), request = useRef(onRequest); request.current = onRequest;
  const key = elsLexiconWindowKey(state);
  const cancel = (message = "הסריקה נעצרה. אפשר להתחיל שוב בלחיצה.") => {
    if (!active.current) return;
    request.current({ ...active.current.target, cancel: true }); active.current = null; setRun(null); setNotice(message);
  };
  useEffect(() => {
    if (active.current && (!visible || busy || key !== active.current.key)) cancel("הסריקה נעצרה בעקבות שינוי המסך או המופע; לא הוחלפו תוצאות.");
  }, [visible, busy, key]);
  useEffect(() => () => {
    if (active.current) request.current({ ...active.current.target, cancel: true });
    active.current = null;
  }, []);
  useEffect(() => {
    if (!run) return;
    const timer = setTimeout(() => cancel("הטעינה או הסריקה לא הסתיימו בזמן. הפעולה בוטלה; אפשר לנסות שוב במפורש."), 45000);
    return () => clearTimeout(timer);
  }, [run?.target.scanId]);
  useEffect(() => {
    if (!active.current || response?.target?.scanId !== active.current.target.scanId || active.current.key !== key) return;
    if (response.pending) { setRun(current => ({ ...current, progress: response })); return; }
    const runKey = active.current.key; active.current = null; setRun(null);
    if (!response.ok) { setNotice(errors[response.reason] || errors["scan-failed"]); return; }
    setResult({ key: runKey, state, data: response }); setPage(0); setNotice("");
    if (response.plan?.mode === "language") setKind("els");
  }, [response, key]);
  const startPlan = selectedPlan => {
    if (!visible || busy || !key || active.current) return;
    const target = { scanId: crypto.randomUUID(), hitId: state.axis.hitId, scope: state.scope, plan: { ...selectedPlan } };
    const next = { key, target }; active.current = next; setRun(next); setResult(null); setNotice(""); onRequest(target);
  };
  const start = () => startPlan(plan);
  const updatePlan = (field, value) => setPlan(current => {
    const next = { ...current, [field]: Number(value) };
    if (field === "minLength" && next.maxLength < next.minLength) next.maxLength = next.minLength;
    if (field === "maxLength" && next.minLength > next.maxLength) next.minLength = next.maxLength;
    return next;
  });
  const data = result?.data, current = result?.key === key && !!key;
  const presented = useMemo(() => {
    if (!result) return null;
    const items = filterElsForwardSource(result.data.items, hideForwardSource);
    return { items, structures: groupElsLexiconDiscoveries(result.state, { ...result.data, items }, result.data.plan) };
  }, [result, hideForwardSource]);
  const structures = presented?.structures;
  const groups = structures?.groups || [];
  const rows = kind === "groups" ? groups.filter(group => groupType === "all" || group.types.includes(groupType))
    : (presented?.items || []).filter(item => item.kind === kind);
  const nextPlan = data?.plan ? expandElsLexiconPlan(data.plan) : null;
  const slice = rows.slice(page * 20, page * 20 + 20);
  const isAdded = item => {
    const finding = state?.findings?.find(f => f.t === item.term);
    return [...(finding?.hits || []), ...(finding?.sourceHits || [])].some(hit => hit.hitId === item.hitId && hit.selected && (item.kind === "source" || hit.verified));
  };
  const add = items => {
    if (!current || busy || run) return;
    const load = prepareElsLexiconFindings(state, data, items, color);
    if (!load) { setNotice("לא ניתן להוסיף: בדקו את המופע ואת מגבלת 12 המילים במטריצה."); return; }
    onRestore?.(load); setNotice("נשלח לאימות במנוע. רק ממצאים שאומתו יסומנו על המטריצה.");
  };
  return <section hidden={!visible} className="els29-lexicon-research" aria-label="גילוי וקשרים במטריצה">
    <h3>גילוי וקשרים במטריצה</h3>
    <p>גלו מילים וקשרים בחלון הנוכחי, ובחרו קבוצה לבדיקה ולסימון על אותה מטריצה. ללא AI.</p>
    <label>מה לגלות?<select aria-label="מסלול הגילוי" disabled={!!run} value={languagePlan ? "language" : "words"}
      onChange={event => setPlan(current => event.target.value === "language"
        ? { ...current, mode: "language", minLength: 5, maxLength: 16 }
        : { ...current, mode: "words", minLength: 5, maxLength: 10 })}>
      <option value="words">מילים ומבנים — התאמה מילונית</option>
      <option value="language">ביטויים וחלוקת רצפים — קורא הלשון</option>
    </select></label>
    {languagePlan ? <p>מילים וחלוקה לשתי מילים על אותו קו, במדגם מוגבל סביב הציר. האותיות נשמרות; הרווחים מוצעים לבדיקה שלכם.</p> : null}
    <details className="els29-discovery-plan"><summary>{languagePlan ? "גבולות בדיקת הביטויים" : "תכנית סריקה · מהיר, רחב או עמוק"}</summary>
      <p>הגדירו אילו מילים לחפש וכמה להתרחק מהציר. שינוי הגדרה אינו מתחיל סריקה.</p>
      {!languagePlan ? <div className="els29-discovery-actions" role="group" aria-label="תבניות סריקה">
        {[["quick", "מהיר"], ["broad", "רחב"], ["deep", "עמוק"]].map(([id, label]) => <button type="button" key={id} disabled={!!run}
          aria-pressed={Object.keys(ELS_LEXICON_PRESETS[id]).every(field => plan[field] === ELS_LEXICON_PRESETS[id][field])}
          onClick={() => setPlan({ ...ELS_LEXICON_PRESETS[id] })}>{label}</button>)}
      </div> : null}
      <fieldset disabled={!!run}><legend>גבולות הסריקה בחלון הפעיל</legend>
        {!languagePlan ? <><label>מינימום אותיות<select aria-label="מינימום אותיות בגילוי" value={plan.minLength} onChange={event => updatePlan("minLength", event.target.value)}>
          {[3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
        </select></label>
        <label>מקסימום אותיות<select aria-label="מקסימום אותיות בגילוי" value={plan.maxLength} onChange={event => updatePlan("maxLength", event.target.value)}>
          {[3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
        </select></label></> : <p>5–16 אותיות ברצף מוצג. המילון תומך עד 10 אותיות למילה; רצף ארוך יותר הוא הצעת חיבור של שתי מילים, לא הרחבה של המילון.</p>}
        <label>מרחק מרבי מהציר<select aria-label="מרחק מהציר בגילוי" value={plan.maxDistance} onChange={event => updatePlan("maxDistance", event.target.value)}>
          {[0,4,8,12,30,40,80,120].map(n => <option key={n} value={n}>{n === 0 ? "נוגע בציר בלבד" : `עד ${n} תאים`}</option>)}
        </select></label>
        <label>מינימום מופעים בקבוצה<select aria-label="מינימום מופעים בקבוצה" value={plan.minMembers} onChange={event => updatePlan("minMembers", event.target.value)}>
          {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
        </select></label>
      </fieldset>
      {!languagePlan ? <p>המילון הנוכחי תומך עד 10 אותיות. בחירה ב־3–4 אותיות מוגבלת לעד 12 תאים סביב ציר מאומת באורך 5 אותיות ומעלה. „עמוק” מרחיב את התכנית בתוך החלון בלבד, לא את כל התורה.</p>
        : <p>המרחק מסנן את הקריאות שהקורא החזיר; הוא אינו מרחיב את מדגם הקווים או את חלון המטריצה.</p>}
    </details>
    <label className="els29-discovery-source-filter"><input type="checkbox" checked={hideForwardSource}
      onChange={event => { setHideForwardSource(event.target.checked); setPage(0); }} />הסתר טקסט רגיל קדימה — דילוג 1</label>
    <details><summary>היקף הסריקה והמגבלות</summary>
      <p>הסתרת טקסט רגיל חלה על קריאה קדימה בלבד. קריאה לאחור בדילוג 1 נשארת מוצגת, ומסומנת כקריאה הפוכה. הסינון משנה גם את הקבוצות, בלי למחוק תוצאות או להריץ סריקה.</p>
      <p>התכנית הבאה: {plan.minLength}–{plan.maxLength} אותיות · עד {plan.maxDistance} תאים מהציר · לפחות {plan.minMembers} מופעים בקבוצה, כולל הציר כשהוא משתתף. עד 8,192 תאים, 256 שורות ו־129 עמודות.</p>
      <p>{languagePlan ? "קורא הלשון: עד 24 קווים, עד 24 אותיות בכל קו, בשני הכיוונים. עד 9,216 בדיקות רצף ו־196,608 בדיקות באינדקס. עד 24 קריאות ועד 24 חלוקות לפני סינון כפילויות, חלקי ציר ומרחק. אינו סריקה ממצה." : "התאמה מילונית: עד 100,000 בדיקות רצף ו־300 התאמות · עד 10 שניות חישוב לאחר הטעינה."}</p>
      <p>המילון נטען רק בלחיצה. הסריקה אינה מקיפה את כל התורה, את כל הדילוגים או כל ביטוי עברי. שמות וכתיבים שאינם במילון עלולים להחמיץ; אפשר לחפש אותם ידנית.</p>
      <p>שורות, טורים ושני האלכסונים בשני הכיוונים. קבוצות נבנות רק מההתאמות שנשמרו: מקבילות עד 8 תאים עם תמיכה משותפת, המשכים עד 3 תאים, חיתוכים, חזרות, מסדרונות ואשכולות של 3 מופעים ומעלה עד 4 תאים בין כל זוג. עד 240 קבוצות, עד 8 מופעים בקבוצה.</p>
    </details>
    <div className="els29-discovery-actions">
      <button ref={scanButton} type="button" disabled={!key || busy || !!run} onClick={start}>{languagePlan ? "בדוק ביטויים וחלוקת רצפים" : "גלה מילים ומבנים"}</button>
      {onFindWords ? <button type="button" disabled={!key || busy || !!run} onClick={onFindWords}>חפש מילה מסוימת</button> : null}
    </div>
    {run ? <CanonicalProgress compact title={languagePlan ? "בדיקת ביטויים" : "סריקה מילונית"} phase={run.progress?.phase === "scan" ? "בודק קווים בחלון" : "טוען ומאמת את אוצר הלשון"}
      current={run.progress?.coverage?.completedRays ?? null} total={run.progress?.coverage?.totalRays ?? null} onCancel={() => cancel()} /> : null}
    <p role="status">{notice || (!key ? "בחרו מופע מאומת לפני סריקה." : !data ? "הסריקה מתחילה רק בלחיצה. התוצאות זמניות בעמוד זה; מעבר מצב עוצר סריקה פעילה." : "")}</p>
    {data ? <div aria-label="תוצאות הסריקה המילונית">
      <p>המופע שנסרק: <bdi>{data.origin.term}</bdi> · {data.origin.corpus === "tanakh" ? "תנ״ך" : "תורה"} · דילוג <bdi>{data.origin.skip}</bdi>.</p>
      {!current ? <p role="note">התוצאה שייכת לחלון קודם. סרקו את החלון הנוכחי לפני הוספת ממצא.</p> : null}
      <p>{data.plan?.mode === "language" ? "בדיקת מדגם קווים — לא סריקה מלאה של החלון" : data.coverage.complete ? "הסריקה המוגדרת הושלמה" : "סריקה חלקית — הושגה תקרת החישוב או התוצאות"} · {presented.items.length} קריאות מוצגות מתוך {data.items.length} שנשמרו · {groups.length} קבוצות להצגה.</p>
      {hideForwardSource ? <p>{data.items.length - presented.items.length} קריאות מקור קדימה הוסתרו. הקבוצות עודכנו בהתאם.</p> : null}
      {current && nextPlan ? <button type="button" disabled={busy || !!run} onClick={() => { setPlan(nextPlan); startPlan(nextPlan); }}>הרחב עוד טבעת · סרוק מחדש עד {nextPlan.maxDistance} תאים</button> : null}
      {nextPlan ? <p>{data.plan?.mode === "language" ? "הרחבה חוזרת על אותו מדגם קווים ומאפשרת להציג קריאות רחוקות יותר מתוכו. היא אינה מוסיפה קווים." : "הרחבה בודקת מחדש את התכנית בטווח רחב יותר בתוך אותו חלון."} האזור שמחוץ לחלון אינו נסרק.</p> : null}
      <p>הקבוצות הן מועמדות לבדיקה. הוספה למטריצה עוברת אימות במנוע.</p>
      {!structures?.ok ? <p role="status">{structures?.reason}</p> : null}
      {structures?.truncated ? <p>מוצג מדגם של עד 240 קבוצות מכל סוגי הקשרים שנמצאו. בחרו סוג קשר למיקוד; המספרים מציינים כמה מוצגות מתוך הקבוצות שנבנו.</p> : null}
      {structures?.excluded ? <p>{structures.excluded} התאמות עם זהות או מיקום לא שלמים לא צורפו לקבוצות.</p> : null}
      <details><summary>מקור, כיסוי וגבולות</summary>
        {data.plan ? <p>בוצע: <bdi>{data.plan.minLength}–{data.plan.maxLength}</bdi> אותיות, עד {data.plan.maxDistance} תאים מהציר, לפחות {data.plan.minMembers} מופעים בקבוצה.</p> : null}
        {hideForwardSource ? <p>הקבוצות נבנו מחדש מהקריאות שנותרו; הסינון אינו משלים התאמות שלא נשמרו בגלל תקרת הסריקה.</p> : null}
        <p>התחלת הציר: <bdi>{data.origin.start}</bdi>. {data.coverage.completedRays}/{data.coverage.totalRays} קווים · {data.coverage.windows} רצפים נבדקו. התוצאות זמניות בעמוד זה ולא נשמרות ברענון.</p>
        <p>הסריקה מצאה התאמות לאותיות, לא דירוג של משמעות או נדירות. חלקי הציר ({data.coverage.axisFragments}) לא נספרו כממצאים חדשים.</p>
        <p>{groups.length} קבוצות מוצגות מתוך {structures?.totalGroups ?? 0} שנבנו מאותן מילים. קשרים מבניים מוצגים לפני אשכולות של קרבה בלבד; בתוך כל סוג — קרבה לציר ואז מספר המופעים. זה סדר תצוגה, לא ציון חוזק.</p>
        <p>אוצר: מילות התנ״ך ומילון הליבה, {data.lexicon.entryCount} ערכים. התאמה מדויקת לאחר נרמול אותיות סופיות; אין השלמת אותיות.</p>
        <p>רוחב מטריצה {data.box.S}; שורות {data.box.r0}–{data.box.r1}, עמודות {data.box.c0}–{data.box.c1} (ספירה מאפס). חלון המחקר עשוי להיות גדול מהחלק המוצג במסך.</p>
        <p>סדר ההצגה: קרבה לציר, אורך, מילה ומיקום. התקרה נשמרת לפי סדר הסריקה; זו אינה הבטחה שכל הממצאים נמצאו.</p>
      </details>
      {data.languageInspection ? <details className="els29-language-advanced"><summary>מתקדם · קווים גולמיים והשערות חלוקה</summary>
        <p>רצפים גולמיים אינם מילים מזוהות. גבולות המילים הם השערות לפי פרופיל לשון, לא ממצאים מאומתים. לא בוצעה קריאת AI.</p>
        <p>{data.languageInspection.coverage.returnedRays} קווים נבחרו מתוך {data.languageInspection.coverage.totalRays}; כל קו קוצר לעד {data.languageInspection.coverage.maxLetters} אותיות סביב הציר ונבדק בשני הכיוונים.</p>
        <details><summary>הקווים שנבדקו</summary>{data.languageInspection.rays.map(ray => <p key={ray.id}><bdi>{ray.text}</bdi> · התחלה <bdi>{ray.start}</bdi> · צעד חתום <bdi>{ray.step}</bdi></p>)}</details>
        <details><summary>דוגמאות גבולות מילים — עד 24 מתוך {data.languageInspection.boundaries.length}</summary>
          {data.languageInspection.boundaries.slice(0,24).map((row,index) => <p key={index}><bdi>{row.leftContext} | {row.rightContext}</bdi> · מיקום הגבול <bdi>{row.leftEnd} → {row.rightStart}</bdi></p>)}
        </details>
      </details> : null}
      <label>סוג התוצאות <select aria-label="סוג התוצאות" value={kind} onChange={event => { setKind(event.target.value); setPage(0); }}>
        <option value="groups">קבוצות ומבנים ({groups.length})</option>
        <option value="els">{data.plan?.mode === "language" ? "מילים וביטויים בדילוג" : "מילים בדילוג"} ({presented.items.filter(item => item.kind === "els").length})</option>
        <option value="source">רצפי מקור וקריאות הפוכות ({presented.items.filter(item => item.kind === "source").length})</option>
      </select></label>
      {kind === "groups" ? <label>סוג הקשר <select aria-label="סוג הקשר" value={groupType} onChange={event => { setGroupType(event.target.value); setPage(0); }}>
        <option value="all">כל הקשרים</option>
        {Object.entries(ELS_DISCOVERY_GROUP_LABELS).map(([value, label]) => {
          const shown = groups.filter(group => group.types.includes(value)).length, total = structures?.typeCounts?.[value] ?? shown;
          return <option key={value} value={value}>{label} ({shown === total ? shown : `${shown} מתוך ${total}`})</option>;
        })}
      </select></label> : null}
      {!rows.length ? <p>{kind === "groups" ? "לא נבנו קבוצות מסוג זה מתוך ההתאמות שנשמרו. אפשר לעבור לתצוגת המילים או לחפש מילה ידנית; זה אינו אומר שאין מבנים בטקסט." : "לא נמצאו התאמות מסוג זה במסגרת הסריקה שבוצעה."}</p> : null}
      <ol>{slice.map(item => {
        if (kind === "groups") return <li key={item.id}>
          <strong>{item.types.map(type => ELS_DISCOVERY_GROUP_LABELS[type]).join(" · ")}</strong>
          <p>{item.includesAxis ? <><bdi>{data.origin.term}</bdi> · </> : null}{item.items.map((word, index) => <React.Fragment key={`${word.term}:${word.hitId}`}>{index ? " · " : ""}<bdi>{word.label || word.term}</bdi></React.Fragment>)}</p>
          <details><summary>מה מחבר ביניהם?</summary>{item.reasons.map(reason => <p key={reason}>{reason}</p>)}
            {item.items.map(word => <p key={`${word.term}:${word.hitId}`}><bdi>{word.label || word.term}</bdi> · {word.kind === "source" ? word.dir < 0 ? "קריאה הפוכה בדילוג 1" : "רצף מקור" : "ELS"} · דילוג <bdi>{word.skip}</bdi> · התחלה <bdi>{word.start}</bdi> · {word.dir < 0 ? "אחורה" : "קדימה"}</p>)}
          </details>
          {item.membersTruncated ? <p>מוצגים עד 8 מתוך {item.totalMembers} מופעים בקבוצה; ההוספה בודקת רק את המוצגים.</p> : null}
          <button type="button" disabled={!current || busy || !!run || item.items.every(isAdded) || !onRestore} onClick={() => add(item.items)}>{item.items.every(isAdded) ? "הקבוצה נבחרה במטריצה" : "אמת והצג קבוצה"}</button>
        </li>;
        const added = isAdded(item);
        return <li key={`${item.term}:${item.hitId}`} data-lexicon-hit={item.hitId}><strong>{item.label}</strong><p>{item.skip === 1 ? item.dir < 0 ? "קריאה הפוכה · " : "טקסט מקור קדימה · " : ""}דילוג <bdi>{item.skip}</bdi> · {item.dir < 0 ? "אחורה" : "קדימה"} · התחלה <bdi>{item.start}</bdi> · {item.lexiconSources.map(source => sources[source] || source).join(" + ")}</p>
          {item.language ? <details><summary>האותיות והחלוקה המוצעת</summary>
            <p>האותיות ברצף: <bdi>{item.term}</bdi>. הרווחים בכותרת מוצעים לקריאה בלבד; האימות בודק אותיות ומיקום, לא את משמעות הביטוי.</p>
            {item.language.tokens.some(token => token.relation !== "exact-lexicon-match") ? <p>הזיהוי נעזר בצורות לשון או בכתיב חסר. מילות הבסיס במילון: {item.language.tokens.map(token => token.baseTerm).join(" · ")}. אלו אינן תחליף לאותיות המטריצה.</p> : null}
          </details> : null}
          <button type="button" disabled={!current || busy || !!run || added || !onRestore} onClick={() => add([item])}>{added ? "נבחר במטריצה" : `בדוק והוסף ${item.label}`}</button>
        </li>;
      })}</ol>
      {rows.length > 20 ? <nav aria-label="עמודי תוצאות מילוניות"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>הקודם</button><span>עמוד {page + 1} מתוך {Math.ceil(rows.length / 20)}</span><button type="button" disabled={(page + 1) * 20 >= rows.length} onClick={() => setPage(page + 1)}>הבא</button></nav> : null}
    </div> : null}
    <details className="els29-discovery-inspection" onToggle={event => { if (event.currentTarget.open) setInspectionVisited(true); }}>
      <summary>בדיקת הסימונים והשוואת מופעים</summary>
      {inspectionVisited ? <ElsStructureResearch2029 state={state} visible={visible} busy={busy || !!run} onRestore={onRestore} onFocus={onFocus}
        onFindWords={onFindWords} onOpenLexicon={() => { scanButton.current?.scrollIntoView({ block: "center", behavior: "instant" }); scanButton.current?.focus({ preventScroll: true }); }} /> : null}
    </details>
  </section>;
}
