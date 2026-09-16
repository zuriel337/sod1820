import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";

function HomeBody() {
  const navigate = useNavigate();
  const research = useResearch();
  const userCenter = useUserCenter();
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
    <section className="sod29-section">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">UNIVERSAL ENTRY</div><h2>מה אתה רוצה לפתוח?</h2><div className="sod29-muted">מספר, ביטוי או נושא מחקר. הכניסה יוצרת Research Context אחד שנשמר בין העולם, ספרים, ELS, ההיכל ורזיאל.</div></div>
      </div>
      <form className="sod29-input-row" onSubmit={start}>
        <input className="sod29-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="למשל 358 · משיח · 1237" aria-label="חיפוש או התחלת מחקר" />
        <button className="sod29-action primary" type="submit">פתח מחקר ←</button>
      </form>
    </section>

    {context?.subject ? <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">RESUME</div><h2>להמשיך מהמקום האחרון</h2><div className="sod29-muted">Resume הוא רציפות מחקר. הוא נפרד מ־Global Now ומ־What Changed.</div></div></div>
      <div className="sod29-row">
        <div><strong>{context.subject.label || context.subject.id}</strong><small>{context.subject.type} · {context.lens || "ללא עדשה"}{context.selection?.locator ? ` · ${context.selection.locator}` : ""}</small></div>
        <div className="sod29-actions">
          <button className="sod29-action primary" onClick={() => navigate(context.subject.href || "/world")}>המשך</button>
          <button className="sod29-action" onClick={() => shell.openRaziel()}>שאל את רזיאל</button>
        </div>
      </div>
    </section> : null}

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">PRODUCT HOMES</div><h2>הבתים הראשיים</h2><div className="sod29-muted">לא כל יכולת היא מוצר. אלה משטחים יציבים; הכלים והשיטות נכנסים בתוכם לפי ההקשר.</div></div></div>
      <div className="sod29-grid">
        <Link className="sod29-card" to="/world"><h3>◌ העולם</h3><p>Research World דינמי סביב עוגן אמיתי. אותו גרף, בלי Topic/World store נוסף.</p></Link>
        <Link className="sod29-card" to="/books"><h3>▤ ספרים ומקורות</h3><p>Book / Source / Witness / Locator נשארים מובחנים. הספרייה נבנית מהזהויות החיות.</p></Link>
        <Link className="sod29-card" to="/heichal"><h3>◇ היכל</h3><p>Deep Research Environment שמקמפל את סביבת העבודה סביב Research Context פעיל.</p></Link>
        <Link className="sod29-card" to="/number"><h3>123 דף המספר</h3><p>Number/Phrase נשאר מוצר ישיר. ה־2029 shell מתחבר אליו בלי לקחת בעלות על ה־Golden writer.</p></Link>
        <Link className="sod29-card" to="/els"><h3>✦ ELS</h3><p>אותו Work Area חי של המנוע הקנוני, בתוך ה־2029 shell ועם Research Context משותף.</p></Link>
        <button className="sod29-card" style={{ textAlign: "start", color: "inherit", font: "inherit", cursor: "pointer" }} onClick={() => userCenter.open?.()}><h3>◎ המחקר שלי</h3><p>הבית האישי הקיים נפתח מאותו shell. G3 יחליף את ה־IA, לא את ה־Research OS שמתחתיו.</p></button>
      </div>
    </section>

    <section className="sod29-section sod29-placeholder">
      <h2>Global Now</h2>
      <p className="sod29-muted">המשטח עצמו לא מרנדר כרגע feed מזויף. הוא יחובר רק ל־owner-qualified change descriptors עם access filter, dedup, materiality ו־Why Now. עד שה־adapter הזה קיים — אין כאן “עדכונים” מומצאים.</p>
    </section>
  </>;
}

export default function Home2029Page() {
  useEffect(() => {
    applySeo({ title: "SOD1820 · 2029", description: "שער הכניסה למערכת המחקר החדשה של SOD1820", path: "/2029" });
  }, []);
  return <Sod2029Shell eyebrow="DISCOVER · RESUME · RESEARCH" title="SOD1820 2029" description="שער רגוע למערכת אחת: חיפוש ופתיחת עוגן, חזרה למחקר, מעבר לעולם, מקורות והיכל — בלי לאבד הקשר."><HomeBody /></Sod2029Shell>;
}
