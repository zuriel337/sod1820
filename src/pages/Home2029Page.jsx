import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";

function HomeBody() {
  const navigate = useNavigate();
  const research = useResearch();
  const shell = use2029Shell();
  const [query, setQuery] = useState("");
  const context = research.context || null;

  const start = (e) => {
    e?.preventDefault?.();
    const raw = query.trim();
    if (!raw) return;
    const numeric = /^\d+$/.test(raw);
    const id = numeric ? String(Number(raw)) : raw;
    const type = numeric ? "number" : "phrase";
    research.setResearchContext?.({
      subject: { id, type, label: id, href: `/number/${encodeURIComponent(id)}` },
      selection: { entityId: id, entityType: type },
      lens: "world",
      locale: "he",
    });
    navigate("/world");
  };

  return <>
    <section className="sod29-focus-stage" id="universal-entry">
      <div className="sod29-command-shell">
        <div className="sod29-command-copy">
          <div className="sod29-kicker">UNIVERSAL ENTRY</div>
          <h2>פתח דבר אחד.<br />המערכת שומרת את ההקשר.</h2>
          <div className="sod29-muted">Home הוא שער רגוע, לא Dashboard של כל המערכת. מספר, ביטוי או נושא מחקר יוצרים Research Context אחד; משם עוברים לעולם, מקורות, ELS, היכל ורזיאל בלי להתחיל מחדש.</div>
          <form className="sod29-command-bar" onSubmit={start}>
            <input className="sod29-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="למשל 358 · משיח · 1237" aria-label="חיפוש או התחלת מחקר" />
            <button className="sod29-action primary" type="submit">פתח מחקר ←</button>
          </form>
        </div>
        <div className="sod29-orbit-map" aria-label="Research Context אחד">
          <div className="sod29-orbit-center">Context<br />אחד</div>
          <span className="sod29-orbit-node n1">עוגן</span>
          <span className="sod29-orbit-node n2">מקורות</span>
          <span className="sod29-orbit-node n3">מסע</span>
          <span className="sod29-orbit-node n4">רזיאל</span>
        </div>
      </div>
    </section>

    <section className="sod29-home-continuity" aria-label="רציפות אישית">
      <article className="sod29-home-lane">
        <div className="sod29-kicker">RESUME</div>
        <h2>להמשיך מהמקום האחרון</h2>
        {context?.subject ? <>
          <div className="sod29-muted">{context.subject.label || context.subject.id} · {context.subject.type} · {context.lens || "ללא עדשה"}</div>
          <div className="sod29-actions">
            <button className="sod29-action primary" type="button" onClick={() => navigate(context.subject.href || "/world")}>המשך</button>
            <button className="sod29-action" type="button" onClick={() => shell.openRaziel()}>המשך עם רזיאל</button>
          </div>
        </> : <>
          <div className="sod29-muted">אין כרגע מחקר פעיל. Resume אינו מומצא מטראפיק או מצ׳אט.</div>
          <div className="sod29-actions"><button className="sod29-action" type="button" onClick={() => shell.openWorkspace()}>פתח את האזור האישי שלי</button></div>
        </>}
      </article>

      <article className="sod29-home-lane">
        <div className="sod29-kicker">WHAT CHANGED FOR ME</div>
        <h2>מה השתנה בשבילי</h2>
        <div className="sod29-muted">זהו Personal Research Delta נפרד מ־Resume ונפרד מ־Global Now. עד שיש governed change adapter שמוכיח שינוי מהותי — Silence Gate נשמר ולא מוצג “עדכון” מזויף.</div>
        <div className="sod29-actions"><button className="sod29-action" type="button" onClick={() => shell.openWorkspace()}>פתח תשומת־לב אישית</button></div>
      </article>
    </section>

    <section className="sod29-global-now-stage" id="global-now">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">GLOBAL NOW / DISCOVER</div>
          <h2>מה השתנה בעולם המשותף</h2>
          <div className="sod29-muted">Global Now הוא projection ציבורי של שינוי מהותי — לא feed כרונולוגי גולמי ולא Personal Attention.</div>
        </div>
        <span className="sod29-chip">governed adapter pending</span>
      </div>

      <div className="sod29-global-now-lanes">
        <div className="sod29-global-now-lane">
          <strong>חדש בסוד 1820 · First-party</strong>
          מקור ראשון במבנה הציבורי: מחקר, פרסומים, ELS, התכנסויות, Reality ושינויים owner-qualified של SOD1820. לא מציגים פריטים לפני שיש access/publication + dedup + materiality + Why Now.
        </div>
        <div className="sod29-global-now-lane">
          <strong>קולות / עולמות מיוחסים</strong>
          Dimension Five הוא הכיוון העתידי הבולט; Or Geula נשמר כערוץ תומך/היסטורי. חומר אורח נשאר מיוחס בבירור ואינו נטמע כאילו הוא SOD1820 original.
        </div>
      </div>
    </section>
  </>;
}

export default function Home2029Page() {
  useEffect(() => {
    applySeo({ title: "SOD1820 · 2029", description: "שער הכניסה למערכת המחקר החדשה של SOD1820", path: "/2029" });
  }, []);
  return <Sod2029Shell surface="home" symbol="✦" eyebrow="DISCOVER · RESUME · RESEARCH" title="SOD1820 2029" description="שער רגוע למערכת אחת: פותחים עוגן, ממשיכים מחקר קיים, ורואים שינוי ציבורי ואישי בלי לערבב ביניהם."><HomeBody /></Sod2029Shell>;
}
