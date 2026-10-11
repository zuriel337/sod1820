import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { listFamily, supabase } from "../lib/supabase.js";
import { LIFE_ENGINES, LIFE_HREF, isEngineNumber, lifeJourneyContext, lifeNumberContext, resolveLifePerson, runLifeJourneyResearch } from "../lib/research/lifeJourneyResearch.js";
import { verifyEls2029Selection } from "../lib/research/els2029ReplayClient.js";
import { projectEls2029Result } from "../lib/research/els2029Projection.js";
import { projectEls2029Layers } from "../lib/research/els2029Layers.js";
import { emitJourney2029 } from "../lib/research/journey2029Telemetry.js";
import { LifeJourneyReflection, LifeJourneyPathHistory } from "./LifeJourneyContinuity.jsx";
import Els2029Representation from "./experience2029/Els2029Representation.jsx";

const labels = { ref: "מראה מקום", text: "טקסט המקור", value: "ערך", part: "רכיב", phrase: "ביטוי", word: "מילה", form: "צורת כתיב", method: "שיטה", count: "כמות מדווחת", source: "מקור", note: "הסבר", evidence: "סוג התאמה", verses: "פסוקים", matches: "התאמות", milui: "מילוי", ragil: "רגיל", anagrams: "אנגרמות", from: "מקורות ההצלבה", hits: "מופעים", across_items: "בין רכיבים", meeting_points: "נקודות מפגש", items: "רכיבים", methods: "שיטות", sum: "סכום", diff: "הפרש", parts: "רכיבים", ms: "שיטות", internal: "בתוך רכיב", cross_parts: "בין רכיבים", order: "סדר", distance: "מרחק", ladder: "דרגות קרבה", achieved: "נמצא", label: "תיאור", level: "דרגה", first: "רכיב ראשון", last: "רכיב אחרון", initials: "ראשי תיבות", finals: "סופי תיבות" };

// Exact engine detail, including unfamiliar fields, remains inspectable without inventing prose.
function SourceDetail({ value, depth = 0 }) {
  if (value == null) return <span>—</span>;
  if (typeof value === "boolean") return <span>{value ? "כן" : "לא"}</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  if (depth > 5) return <pre>{JSON.stringify(value, null, 2)}</pre>;
  if (Array.isArray(value)) return value.length
    ? <ul>{value.map((item, i) => <li key={i}><SourceDetail value={item} depth={depth + 1} /></li>)}</ul>
    : <span>אין פריטים בפלט זה</span>;
  return <dl>{Object.entries(value).map(([key, item]) => <div key={key}>
    <dt>{labels[key] || key}</dt><dd><SourceDetail value={item} depth={depth + 1} /></dd>
  </div>)}</dl>;
}

function NameResults({ data, onNumber }) {
  const [showAll, setShowAll] = useState(false);
  return <>
    <h4>ממצאים מאוחדים</h4>
    <p>נרמול מאחד את התצוגה בלבד. הופעות חוזרות אינן בהכרח ראיות עצמאיות, והתאמה אינה קביעה על האדם.</p>
    {!data.normalized.length ? <p>לא נמצאו ממצאים לאיחוד במסלולים האלה. אפשר לבדוק את יתר מסלולי המקורות למטה.</p> : null}
    <div className="life-result-grid">{data.normalized.slice(0, showAll ? undefined : 12).map((finding) => <article key={finding.normalized_key}>
      <h4>{finding.display_value}</h4>
      <p>{finding.source_engines.map((source) => source.engine).join(" · ")}</p>
      {isEngineNumber(finding.value) && finding.value >= 0 ? <button type="button" onClick={() => onNumber(finding.value)}>חקור את המספר {finding.value}</button> : null}
      <details><summary>מאין הגיע הממצא · {finding.occurrences} הופעות בפלט</summary><SourceDetail value={finding.provenance} /></details>
    </article>)}</div>
    {data.normalized.length > 12 ? <button type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "הצג פחות" : `הצג את כל ${data.normalized.length} הממצאים`}</button> : null}
    <h4>כל מסלולי המקורות</h4>
    {data.groups.map((group, i) => <section key={i} className="life-track-group"><h4>{group.label}</h4>
      {group.tracks.map((t, j) => <details key={`${t.id}:${j}`}>
        <summary>{t.label || t.id} · {t.status === "ok" ? "התקבל פלט" : t.status === "empty" ? "לא נמצאה התאמה בטווח שנבדק" : t.status === "skipped" ? "לא הופעל במסלול זה" : "לא זמין"}</summary>
        {t.sample?.ref ? <p><strong>{t.sample.ref}</strong> {t.sample.text}</p> : null}
        {t.id === "els" ? <p>לחיפוש דילוגים בחרו את מסלול ״דילוגי אותיות״ למעלה.</p> : null}
        {t.evidence === "value_match" ? <p>התאמה מספרית; אינה מוכיחה קשר בין המשמעויות.</p> : null}
        <SourceDetail value={Object.fromEntries(Object.entries(t).filter(([key]) => !["label", "id", "classification", "tier", "status"].includes(key)))} />
      </details>)}
    </section>)}
  </>;
}

export default function LifeJourneyResearch({ ownerId, userId, members, startRequest = 0 }) {
  const research = useResearch();
  const navigate = useNavigate();
  const selfRef = `person:${ownerId}:self`;
  const savedDimensions = research.context?.dimensions || {};
  const [personRef, setPersonRef] = useState(() => resolveLifePerson(members, ownerId, savedDimensions.lifePersonRef) ? savedDimensions.lifePersonRef : selfRef);
  const [engines, setEngines] = useState(() => Array.isArray(savedDimensions.lifeEngines) ? savedDimensions.lifeEngines.filter((id) => LIFE_ENGINES.some((e) => e.id === id)) : ["name", "methods", "date"]);
  const [familyRefs, setFamilyRefs] = useState(() => (savedDimensions.lifeFamilyRefs || []).filter((ref) => resolveLifePerson(members, ownerId, ref)));
  const [scope, setScope] = useState(savedDimensions.lifeElsScope === "tanakh" ? "tanakh" : "torah");
  const [form, setForm] = useState(savedDimensions.lifeElsForm === "first" ? "first" : "full");
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [pathBusy, setPathBusy] = useState(false);
  const [active, setActive] = useState(null);
  const [replay, setReplay] = useState(null);
  const runRef = useRef({ epoch: 0, controller: null });
  const lastStart = useRef(0);
  const section = useRef(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; runRef.current.epoch++; runRef.current.controller?.abort(); }; }, []);

  const invalidate = () => {
    runRef.current.epoch++;
    runRef.current.controller?.abort();
    setRunning(false); setResults({}); setActive(null); setReplay(null); setNotice("");
  };
  const memberSignature = JSON.stringify(members.map((m) => [m.source_ref, m.name, m.meta]));
  const previousMembers = useRef(memberSignature);
  useEffect(() => {
    if (previousMembers.current !== memberSignature) {
      previousMembers.current = memberSignature;
      invalidate();
    }
    // A changed saved profile invalidates results before an explicit new run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberSignature]);
  const config = { personRef, engines, familyRefs, scope, form };
  const selected = resolveLifePerson(members, ownerId, personRef);
  const contextFor = (cfg, step = "results") => lifeJourneyContext({ ...cfg, ownerId, previous: research.context, step });

  async function run(cfg = config) {
    runRef.current.controller?.abort();
    const epoch = ++runRef.current.epoch;
    const controller = new AbortController();
    runRef.current.controller = controller;
    const current = () => mounted.current && epoch === runRef.current.epoch && !controller.signal.aborted;
    setNotice(""); setReplay(null); setActive(null); setRunning(true);
    setResults(Object.fromEntries(cfg.engines.map((id) => [id, { state: "loading" }])));
    const timer = setTimeout(() => {
      if (!current()) return;
      controller.abort();
      setRunning(false);
      setResults((prev) => Object.fromEntries(Object.entries(prev).map(([id, value]) => [id, value.state === "loading" ? { state: "error", error: "הבדיקה ארכה מעבר לזמן המותר. אפשר לנסות שוב." } : value])));
      setNotice("הבדיקה נעצרה בזמן שהוקצב. תוצאות שכבר התקבלו נשארו זמינות.");
    }, 45000);
    try {
      // Recheck authorization and resolve the saved people at each explicit run/resume.
      const fresh = await listFamily(ownerId);
      if (!current()) return;
      const person = resolveLifePerson(fresh.members || [], ownerId, cfg.personRef);
      if (!person) throw new Error("person_unavailable");
      const ctx = contextFor(cfg);
      research.setResearchContext(ctx);
      emitJourney2029("start", { context: ctx, sourceSurface: "journey" });
      setActive({ ...cfg, personName: person.name });
      await runLifeJourneyResearch({ ...cfg, client: supabase, userId, ownerId, members: fresh.members || [], signal: controller.signal,
        onResult: (id, outcome) => { if (current()) setResults((prev) => ({ ...prev, [id]: outcome })); },
      });
    } catch {
      if (current()) { setActive(null); setResults({}); setNotice("לא ניתן לפתוח את המחקר. בדקו שהחשבון מחובר ושהאדם עדיין קיים בפרטים השמורים."); }
    } finally {
      clearTimeout(timer);
      if (current()) setRunning(false);
    }
  }

  useEffect(() => {
    if (!startRequest || lastStart.current === startRequest) return;
    lastStart.current = startRequest;
    setPersonRef(selfRef);
    void run({ ...config, personRef: selfRef });
    section.current?.scrollIntoView({ block: "start" });
    // startRequest changes only after an explicit profile save; never run on page mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRequest]);

  async function savePath() {
    if (!active || running) return;
    setPathBusy(true); setNotice("");
    try {
      research.setResearchContext(contextFor(active));
      const result = await research.saveCurrentResearchPath({ href: LIFE_HREF, label: "מסע חיים פרטי", surface: "journey" });
      if (mounted.current) setNotice(result?.ok ? "המסלול נשמר בחשבון שלך. בחזרה אליו נבדוק מחדש את הפרטים השמורים; התוצאות אינן נשמרות כעובדות." : "השמירה לא הושלמה. אפשר לנסות שוב.");
    } catch { if (mounted.current) setNotice("השמירה לא הושלמה. אפשר לנסות שוב."); }
    finally { if (mounted.current) setPathBusy(false); }
  }

  const latest = research.pathResume?.latest;
  const canResume = latest?.representation?.context?.dimensions?.lifePersonRef?.startsWith(`person:${ownerId}:`);
  async function resumePath(pathId = latest?.path_id) {
    setPathBusy(true); setNotice("");
    try {
      const snapshot = await research.resumeResearchPath(pathId);
      if (!mounted.current) return;
      const dims = snapshot?.context?.dimensions;
      if (!snapshot?.ok || !dims?.lifePersonRef?.startsWith(`person:${ownerId}:`)) throw new Error("resume_unavailable");
      const cfg = { personRef: dims.lifePersonRef,
        engines: (dims.lifeEngines || []).filter((id) => LIFE_ENGINES.some((e) => e.id === id)),
        familyRefs: dims.lifeFamilyRefs || [], scope: dims.lifeElsScope || "torah", form: dims.lifeElsForm || "full" };
      if (!cfg.engines.length) throw new Error("resume_unavailable");
      setPersonRef(cfg.personRef); setEngines(cfg.engines); setFamilyRefs(cfg.familyRefs); setScope(cfg.scope); setForm(cfg.form);
      await run(cfg);
    } catch { if (mounted.current) setNotice("לא ניתן לחדש את המסלול. אפשר לבחור אדם ולהתחיל בדיקה חדשה."); }
    finally { if (mounted.current) setPathBusy(false); }
  }

  function openNumber(value) {
    if (!active) return;
    const ctx = lifeNumberContext(contextFor(active, "methods"), value);
    research.setResearchContext(ctx);
    emitJourney2029("step", { context: ctx, sourceSurface: "journey" });
    navigate(`/2029/number/${value}`);
  }

  async function verifyOccurrence(occurrence) {
    const epoch = runRef.current.epoch;
    setReplay({ state: "loading" });
    const verified = await verifyEls2029Selection({ entityType: "els", term: occurrence.term, corpus: active.scope,
      skip: occurrence.skip, start: occurrence.start, dir: occurrence.dir },
    (body) => supabase.functions.invoke("els-search-bridge", { body }));
    if (!mounted.current || epoch !== runRef.current.epoch) return;
    setReplay(verified.ok ? { state: "ready", layers: projectEls2029Layers(projectEls2029Result(verified.result)) }
      : { state: "error" });
  }

  const toggleEngine = (id) => { invalidate(); setEngines((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]); };
  return <section id="life-research" ref={section} className="person-journey-panel life-research" data-experience-capability="life-journey-research">
    <div className="person-journey-section-head"><div><small>02</small><h2>המחקר שלי</h2></div><span>פרטי</span></div>
    <p>אפשר לחקור רק את עצמך. המשפחה היא אפשרות נוספת, ואפשר לחזור אליה בכל זמן.</p>
    <label><span>על מי חוקרים?</span><select aria-label="על מי חוקרים?" value={personRef} disabled={pathBusy} onChange={(e) => { invalidate(); setPersonRef(e.target.value); }}>
      {!members.some((m) => m.source_ref === selfRef) ? <option value={selfRef}>אני — יש לשמור פרטים תחילה</option> : null}
      {members.map((m) => <option key={m.source_ref} value={m.source_ref}>{m.name}{m.source_ref === selfRef ? " · אני" : ""}</option>)}
    </select></label>
    <fieldset disabled={pathBusy}><legend>מה נבדוק?</legend><div className="life-engine-options">
      {LIFE_ENGINES.map((engine) => <label key={engine.id}><input type="checkbox" checked={engines.includes(engine.id)} onChange={() => toggleEngine(engine.id)} /><span><strong>{engine.label}</strong><small>{engine.detail}</small></span></label>)}
    </div></fieldset>
    {engines.includes("family") ? <fieldset disabled={pathBusy}><legend>עם מי להשוות? עד חמישה אנשים נוספים</legend>
      {members.filter((m) => m.source_ref !== personRef).map((m) => <label className="life-checkbox" key={m.source_ref}><input type="checkbox" checked={familyRefs.includes(m.source_ref)} onChange={(e) => { invalidate(); setFamilyRefs((prev) => e.target.checked ? [...prev, m.source_ref] : prev.filter((ref) => ref !== m.source_ref)); }} /><span>{m.name}</span></label>)}
      {members.length < 2 ? <p>אפשר להוסיף בן משפחה באזור ״המשפחה שלי״ למטה.</p> : null}
    </fieldset> : null}
    {engines.includes("els") ? <div className="person-journey-fields">
      <label><span>קורפוס הדילוגים</span><select disabled={pathBusy} value={scope} onChange={(e) => { invalidate(); setScope(e.target.value); }}><option value="torah">התורה</option><option value="tanakh">כל התנ״ך</option></select></label>
      <label><span>הביטוי לחיפוש</span><select disabled={pathBusy} value={form} onChange={(e) => { invalidate(); setForm(e.target.value); }}><option value="full">השם המלא</option><option value="first">השם הפרטי</option></select></label>
      <p>בדיקה מוגבלת לדילוגים עד 40 ול־16 תוצאות מוצגות. אפשר לחקור טווחים נוספים בכלי הצופן בנפרד.</p>
    </div> : null}
    <div className="person-journey-actions">
      <button type="button" className="person-journey-primary" disabled={!selected || !engines.length || running || pathBusy} onClick={() => run()}>{running ? "בודק את המסלולים…" : personRef === selfRef ? "המשך למחקר על עצמי" : "התחל מחקר על האדם שנבחר"}</button>
      {running ? <button type="button" onClick={() => { runRef.current.epoch++; runRef.current.controller?.abort(); setRunning(false); setResults((prev) => Object.fromEntries(Object.entries(prev).map(([id, out]) => [id, out.state === "loading" ? { state: "unavailable", data: { unavailable: "הבדיקה בוטלה." } } : out]))); setNotice("הבדיקה נעצרה. אפשר לבחור מסלולים ולנסות שוב."); }}>עצור בדיקה</button> : null}
      {canResume ? <button type="button" disabled={running || pathBusy} onClick={() => resumePath()}>חדש את המסלול השמור</button> : null}
    </div>
    <p className="life-note">שם ותאריך הם קלט למחקר. התאמה מספרית או לשונית אינה אבחון, תחזית או קביעה על חייך. מסלול מחודש משתמש בפרטים העדכניים שבחשבון.</p>
    {notice ? <p role="status" className="person-journey-state">{notice}</p> : null}
    {active ? <h3>תוצאות המחקר על {active.personName}</h3> : null}
    <div className="life-results" aria-live="polite">{LIFE_ENGINES.filter((engine) => results[engine.id]).map((engine) => {
      const result = results[engine.id];
      return <article className="life-engine-result" key={engine.id} data-engine={engine.id}>
        <h3>{engine.label}</h3>
        {result.state === "loading" ? <p role="status">בודק…</p> : null}
        {result.state === "error" ? <p role="alert">{result.error}</p> : null}
        {result.state === "unavailable" ? <p>{result.data.unavailable}</p> : null}
        {result.state === "ready" && engine.id === "name" ? <NameResults data={result.data} onNumber={openNumber} /> : null}
        {result.state === "ready" && engine.id === "methods" ? <div className="life-methods">{result.data.methods.map(([method, value]) => <button type="button" key={method} disabled={value < 0} onClick={() => openNumber(value)}><span>{method.replaceAll("_", " ")}</span><strong>{value}</strong><small>המשך למספר</small></button>)}</div> : null}
        {result.state === "ready" && engine.id === "date" ? <><h4>{result.data.representation.hebrew.pretty}</h4><p>המקורות מציינים אילו רכיבים השתתפו. התאמה עשויה להיות בין שיטות של אותו רכיב בלבד.</p>
          {(result.data.bundle.findings || []).filter((f) => f.kind === "date_cross").map((f) => <div key={f.id}><button type="button" disabled={!isEngineNumber(f.subject.value) || f.subject.value < 0} onClick={() => openNumber(f.subject.value)}>ערך בחישוב {f.subject.value}</button><details><summary>מקורות החישוב</summary><SourceDetail value={f.verification.engine_result} /></details></div>)}
          {!(result.data.bundle.findings || []).some((f) => f.kind === "date_cross") ? <p>התאריך הומר; המנוע לא החזיר ממצאים מספריים במסלול שנבדק.</p> : null}
        </> : null}
        {result.state === "ready" && engine.id === "family" ? <><p>הפלט עשוי לכלול התאמות בתוך שם יחיד. ״בין רכיבים״ במקור מציין כמה רכיבים השתתפו.</p><p>נבדקו השמות: {result.data.people.map((p) => p.name).join(" · ")}</p>
          {(result.data.result.meeting_points || []).map((p, i) => <div key={i}>{isEngineNumber(p.value) && p.value >= 0 ? <button type="button" onClick={() => openNumber(p.value)}>חקור את הערך {p.value}</button> : null}<SourceDetail value={p} /></div>)}
          {!result.data.result.meeting_points?.length ? <p>המנוע לא החזיר ממצאים מספריים בהשוואה הזאת.</p> : null}
          <details><summary>פלט ההשוואה ומקורותיו</summary><SourceDetail value={result.data.result} /></details>
        </> : null}
        {result.state === "ready" && engine.id === "els" ? <>
          <p>{result.data.projection.occurrences.length} מופעים מוצגים בטווח שנבדק{result.data.projection.completion.truncated ? " · קיימות תוצאות נוספות שאינן מוצגות בבדיקה המוגבלת" : ""}. אי־מציאה בטווח הזה אינה אי־מציאה בכל הקורפוס.</p>
          <div className="life-methods">{result.data.projection.occurrences.map((hit) => <button type="button" key={hit.occurrenceId} disabled={replay?.state === "loading"} onClick={() => verifyOccurrence(hit)}><span>דילוג {hit.skip} · {hit.dir === 1 ? "קדימה" : "אחורה"}</span><small>מיקום {hit.start} · בדוק ופתח</small></button>)}</div>
          {replay?.state === "loading" ? <p role="status">מאמת את המופע מול המקור…</p> : null}
          {replay?.state === "error" ? <p role="alert">לא התקבל אימות למופע. אין תצוגה מאומתת כרגע.</p> : null}
          {replay?.state === "ready" ? <Els2029Representation layers={replay.layers} profile="CLASSIC" /> : null}
        </> : null}
      </article>;
    })}</div>
    {active && Object.values(results).some((r) => r.state === "ready") ? <div className="person-journey-actions"><button type="button" disabled={running || pathBusy} onClick={savePath}>{pathBusy ? "שומר…" : "שמור מסלול פרטי להמשך"}</button><small>נשמרים האדם ומסלולי הבדיקה. בחידוש יתבצע מחקר חדש על הפרטים השמורים.</small></div> : null}
    <LifeJourneyPathHistory ownerId={ownerId} members={members} onResume={resumePath} busy={running || pathBusy} refreshKey={latest?.revision_id || latest?.revision_no || latest?.path_id} />
    <LifeJourneyReflection ownerId={ownerId} userId={userId} members={members} />
  </section>;
}
