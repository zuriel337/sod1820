import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import CurationMark2029 from "../components/experience2029/CurationMark2029.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchHome2029Projection } from "../lib/research/home2029Projection.js";
import { applySeo } from "../lib/seo.js";


function TemporalTreasures({ item }) {
  const treasures = item?.treasures || [];
  if (!treasures.length) return null;

  return <section className="sod29-home-now-treasures" aria-label="אוצרות שמאירים את העת">
    <div className="sod29-home-now-treasures-head">
      <div>
        <small>✦ אוצרות שמאירים את העת</small>
        <strong>שורשים שנשמרו לאורך הדרך</strong>
      </div>
      <span>{treasures.length}</span>
    </div>

    <div className="sod29-home-now-treasure-list">
      {treasures.map((treasure) => <div className="sod29-home-now-treasure" key={treasure.id}>
        <div>
          <strong>{treasure.expression}{treasure.methodLabel ? " = " + treasure.value : ""}</strong>
          <small>
            {treasure.methodLabel
              ? treasure.methodLabel + " · " + (treasure.curation?.label || treasure.value)
              : "מחובר לעוגן " + (treasure.curation?.label || treasure.value)}
          </small>
        </div>
        {treasure.curation ? <CurationMark2029
          item={treasure.curation}
          related={[]}
          witnessCount={0}
          catalog={item.treasureCatalog}
          compact
        /> : null}
      </div>)}
    </div>

    <p>האוצרות נבחרים מתוך שכבת ה־Curation הקיימת לפי ההקשר — לא מתוך גלריה קבועה.</p>
  </section>;
}

function TemporalNowCard({ item, onOpen }) {
  if (!item) return null;
  return <article className="sod29-home-now-card">
    <div className="sod29-home-now-head">
      <div>
        <div className="sod29-kicker">{item.publicLabel}</div>
        <h3>{item.yearLabel} · {item.value}</h3>
      </div>
      <span className="sod29-home-now-live">חי עכשיו</span>
    </div>

    <p className="sod29-home-now-lead">אותו מספר חוזר השנה בכמה מקומות שונים — והחיבורים מתחילים להצטבר לתמונה אחת.</p>

    <div className="sod29-home-now-findings">
      {item.findings.slice(0, 3).map((finding) => <div className="sod29-home-now-finding" key={finding.id}>
        <strong>{finding.expression} = {finding.value}</strong>
        <small>{finding.attribution}{finding.sourceType === "post_update" ? " · מתוך פוסט חי" : " · תרומה"}</small>
      </div>)}
    </div>

    <TemporalTreasures item={item} />

    <div className="sod29-home-now-foot">
      <div>
        <strong>{item.sourceCount} מקורות · אותו מספר · אותה עת</strong>
        <small>{item.whyNow}</small>
      </div>
      <button className="sod29-action primary" type="button" onClick={onOpen}>פתח את החיבור בעולם ←</button>
    </div>
  </article>;
}

function ConnectedGoldenStory({ onOpenPost, onOpenHeichal }) {
  return <article className="sod29-connected-golden-story" aria-label="המשך מהעת אל המקור">
    <div>
      <div className="sod29-kicker">מקור חי · Connected Golden</div>
      <h3>רמזי הגאולה, הבינה המלאכותית וסוד השיר — תשפ״ז</h3>
      <p>החיבור של 787 לא נשאר ככרטיס בבית: הוא ממשיך אל המקור, אל העולם, אל המספר ואל רזיאל — עם חזרה מדויקת לאותה נקודה.</p>
    </div>
    <div className="sod29-actions">
      <button className="sod29-action primary" type="button" onClick={onOpenPost}>פתח את הפוסט ←</button>
      <button className="sod29-action" type="button" onClick={onOpenHeichal}>היכנס להיכל ◇</button>
    </div>
  </article>;
}

function HomeBody() {
  const navigate = useNavigate();
  const research = useResearch();
  const shell = use2029Shell();
  const [query, setQuery] = useState("");
  const [homeState, setHomeState] = useState({ loading: true, projection: null });
  const context = research.context || null;

  useEffect(() => {
    let live = true;
    fetchHome2029Projection()
      .then((projection) => { if (live) setHomeState({ loading: false, projection }); })
      .catch(() => { if (live) setHomeState({ loading: false, projection: null }); });
    return () => { live = false; };
  }, []);

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

  const openTemporalNow = () => {
    const item = homeState.projection?.temporalNow;
    if (!item) return;
    const id = String(item.value);
    research.setResearchContext?.({
      subject: { id, type: "number", label: id, href: `/2029/number/${id}` },
      selection: { entityId: id, entityType: "number" },
      lens: item.worldLens || "time",
      locale: "he",
      dimensions: {
        temporal: item.worldDimension || "now",
        hebrewYear: item.yearLabel,
        currentYearValue: item.value,
      },
      returnTo: {
        href: "/2029",
        label: "דף הבית",
        subject: null,
        selection: null,
        lens: "home",
        dimensions: {},
        journey: null,
      },
    });
    navigate("/world");
  };

  const temporalNow = homeState.projection?.temporalNow || null;

  return <>
    <section className="sod29-global-now-stage sod29-home-now-first" id="global-now">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">עכשיו ב־SOD1820</div>
          <h2>מה מתגלה עכשיו</h2>
          <div className="sod29-muted">לא כל דבר חדש הופך לפוסט. כאן עולים רק חיבורים שהפכו משמעותיים עכשיו.</div>
        </div>
        <span className="sod29-chip">{homeState.loading ? "בודק…" : temporalNow ? "חיבור חי" : "שקט עכשיו"}</span>
      </div>

      {homeState.loading ? <div className="sod29-home-now-empty">בודק מה באמת התחבר לעת הזאת…</div> : null}
      {!homeState.loading && temporalNow ? <TemporalNowCard item={temporalNow} onOpen={openTemporalNow} /> : null}
      <ConnectedGoldenStory
        onOpenPost={() => shell.go("/post/remzei-geula-ai-sod-hashir")}
        onOpenHeichal={() => shell.go("/heichal")}
      />
      {!homeState.loading && !temporalNow ? <div className="sod29-home-now-empty">אין כרגע חיבור מספיק חזק להבלטה. הבית נשאר שקט במקום להמציא עדכון.</div> : null}
    </section>

    <section className="sod29-focus-stage" id="universal-entry">
      <div className="sod29-command-shell">
        <div className="sod29-command-copy">
          <div className="sod29-kicker">גלה משהו משלך</div>
          <h2>פתח מספר, ביטוי או נושא.<br />משם העולם נפתח.</h2>
          <div className="sod29-muted">החיפוש שומר את ההקשר וממשיך איתך לעולם, למקורות, להיכל ולרזיאל בלי להתחיל מחדש.</div>
          <form className="sod29-command-bar" onSubmit={start}>
            <input className="sod29-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="למשל 358 · משיח · 1820" aria-label="חיפוש או התחלת גילוי" />
            <button className="sod29-action primary" type="submit">פתח בעולם ←</button>
          </form>
        </div>
        <div className="sod29-orbit-map" aria-label="הקשר אחד שממשיך איתך">
          <div className="sod29-orbit-center">עולם<br />אחד</div>
          <span className="sod29-orbit-node n1">מוקד</span>
          <span className="sod29-orbit-node n2">מקורות</span>
          <span className="sod29-orbit-node n3">מסע</span>
          <span className="sod29-orbit-node n4">רזיאל</span>
        </div>
      </div>
    </section>

    <section className="sod29-home-continuity" aria-label="רציפות אישית">
      <article className="sod29-home-lane">
        <div className="sod29-kicker">המשך</div>
        <h2>להמשיך מהמקום האחרון</h2>
        {context?.subject ? <>
          <div className="sod29-muted">{context.subject.label || context.subject.id} · {context.subject.type} · {context.lens || "ללא עדשה"}</div>
          <div className="sod29-actions">
            <button className="sod29-action primary" type="button" onClick={() => navigate(context.subject.href || "/world")}>המשך</button>
            <button className="sod29-action" type="button" onClick={() => shell.openRaziel()}>המשך עם רזיאל</button>
          </div>
        </> : <>
          <div className="sod29-muted">כשתתחיל לגלות משהו, הבית יידע להחזיר אותך בדיוק לשם.</div>
          <div className="sod29-actions"><button className="sod29-action" type="button" onClick={() => shell.openWorkspace()}>האזור שלי</button></div>
        </>}
      </article>

      <article className="sod29-home-lane">
        <div className="sod29-kicker">בשבילי</div>
        <h2>מה השתנה בשבילי</h2>
        <div className="sod29-muted">כאן יופיע רק שינוי שבאמת נוגע למה ששמרת או פתחת. עד שאין שינוי מוכח — לא ממציאים התראה.</div>
        <div className="sod29-actions"><button className="sod29-action" type="button" onClick={() => shell.openWorkspace()}>פתח תשומת־לב אישית</button></div>
      </article>
    </section>
  </>;
}

export default function Home2029Page() {
  useEffect(() => {
    applySeo({ title: "SOD1820 · 2029", description: "מה מתגלה עכשיו ב-SOD1820 — שער לעולם אחד של רמזים, מקורות וחיבורים.", path: "/2029" });
  }, []);
  return <Sod2029Shell surface="home" symbol="✦" eyebrow="DISCOVER · NOW · CONTINUE" title="SOD1820 2029" description="מה מתגלה עכשיו, מה נפתח בעולם, ואיך ממשיכים מאותה נקודה."><HomeBody /></Sod2029Shell>;
}
