import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sod2029Shell, { use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import CurationMark2029 from "../components/experience2029/CurationMark2029.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchHome2029Projection } from "../lib/research/home2029Projection.js";
import { buildCalculator2029FastPreview } from "../lib/research/calculator2029FastPreview.js";
import { buildUnifiedResearchEntry } from "../lib/research/unifiedResearchEntry.js";
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

function ConnectedGoldenStory({ onOpenPost }) {
  return <article className="sod29-connected-golden-story" aria-label="המשך מהעת אל המקור">
    <div>
      <div className="sod29-kicker">מקור חי</div>
      <h3>רמזי הגאולה, הבינה המלאכותית וסוד השיר — תשפ״ז</h3>
      <p>החיבור של 787 לא נשאר ככרטיס בבית: הוא ממשיך אל המקור, אל העולם, אל המספר ואל רזיאל — עם חזרה מדויקת לאותה נקודה.</p>
    </div>
    <div className="sod29-actions">
      <button className="sod29-action primary" type="button" onClick={onOpenPost}>פתח את הפוסט ←</button>
    </div>
  </article>;
}

function formatPulseNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("he-IL") : null;
}

function formatPulseDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  } catch {
    return null;
  }
}

function HomeSystemPulse({ pulse, loading }) {
  if (loading) {
    return <section
      className="sod29-home-system-pulse is-loading"
      data-experience-capability="home-system-pulse"
      aria-label="דופק המערכת"
    >
      <div className="sod29-home-system-pulse-head">
        <div>
          <div className="sod29-kicker">דופק המערכת</div>
          <strong>בודק מה באמת זז עכשיו…</strong>
        </div>
      </div>
    </section>;
  }

  if (!pulse) return null;

  const metrics = [];
  const corpusTotal = formatPulseNumber(pulse.corpusTotal);
  if (corpusTotal) metrics.push({ key: "corpus", value: corpusTotal, label: "ביטויים במאגר" });

  if (Number(pulse.corpusAdded7d) > 0) {
    metrics.push({ key: "corpus-week", value: "+" + formatPulseNumber(pulse.corpusAdded7d), label: "נוספו השבוע" });
  } else {
    const latestDate = formatPulseDate(pulse.corpusLatestAt);
    if (latestDate) metrics.push({ key: "corpus-last", value: latestDate, label: "עדכון אחרון למאגר" });
  }

  if (Number(pulse.contributions7d) > 0) {
    metrics.push({ key: "contributions", value: formatPulseNumber(pulse.contributions7d), label: "תרומות השבוע" });
  }

  if (Number(pulse.writers7d) > 0) {
    metrics.push({ key: "writers", value: formatPulseNumber(pulse.writers7d), label: "כותבים פעילים" });
  }

  if (Number(pulse.journeysToday) > 0) {
    metrics.push({ key: "journeys", value: formatPulseNumber(pulse.journeysToday), label: "יצאו למסע היום" });
  }

  if (!metrics.length) return null;
  const latestWord = pulse.latestWords?.[0] || null;

  return <section
    className="sod29-home-system-pulse"
    data-experience-capability="home-system-pulse"
    aria-label="דופק המערכת"
  >
    <div className="sod29-home-system-pulse-head">
      <div>
        <div className="sod29-kicker">דופק המערכת</div>
        <strong>מה זז עכשיו</strong>
      </div>
      {latestWord ? <small>
        האחרון שנוסף · <b>{latestWord.phrase} = {latestWord.value}</b>
      </small> : null}
    </div>
    <div className="sod29-home-system-pulse-grid">
      {metrics.map((metric) => <div className="sod29-home-system-pulse-metric" key={metric.key}>
        <strong>{metric.value}</strong>
        <span>{metric.label}</span>
      </div>)}
    </div>
  </section>;
}

function HomeMiniGematria({ onOpenCalculator }) {
  const [expression, setExpression] = useState("");
  const preview = useMemo(() => buildCalculator2029FastPreview(expression), [expression]);
  const methods = preview?.methods || [];
  const hasExpression = expression.trim().length > 0;

  return <section
    className="sod29-home-mini-gematria"
    data-experience-capability="home-gematria-fast-core"
    aria-label="מחשבון גימטריה מהיר"
  >
    <div className="sod29-home-mini-gematria-copy">
      <div className="sod29-kicker">גימטריה · חישוב מיידי</div>
      <h2>כתוב משהו. תשע שיטות נדלקות מיד.</h2>
      <p>התוצאות מופיעות מיד מיד תוך כדי הקלדה. האימות הסופי נעשה בדף המספר.</p>
      <div className="sod29-home-mini-gematria-input">
        <input
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          placeholder="למשל: משיח"
          aria-label="ביטוי לחישוב גימטריה מהיר"
          dir="rtl"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          className="sod29-action primary"
          onClick={() => onOpenCalculator(expression)}
        >
          פתח במחשבון ←
        </button>
      </div>
      <small>{hasExpression ? "מיידי · טרם אומת" : "הקלד כדי לראות ערכים מיידיים"}</small>
    </div>
    <div className="sod29-home-mini-gematria-grid" aria-label="תשע שיטות Core">
      {methods.map((method) => <div
        className="sod29-home-mini-gematria-method"
        key={method.methodKey}
        data-preview-state="preview"
      >
        <span>{method.displayLabel}</span>
        <strong>{method.computedValue ?? 0}</strong>
      </div>)}
    </div>
  </section>;
}

function HomeWorldPreview({ preview, loading, onOpenTopic, onOpenResearcher, onOpenWorld }) {
  if (loading) {
    return <section className="sod29-home-world-preview is-loading" aria-label="העולם חי">
      <div className="sod29-kicker">העולם חי</div>
      <h2>מחבר את המחקר הציבורי…</h2>
    </section>;
  }
  if (!preview) return null;

  const research = Array.isArray(preview.research) ? preview.research : [];
  const people = Array.isArray(preview.people) ? preview.people : [];
  if (!research.length && !people.length) return null;

  return <section
    className="sod29-home-world-preview"
    data-experience-capability="home-world-discovery"
    aria-label="העולם חי"
  >
    <div className="sod29-home-world-preview-head">
      <div>
        <div className="sod29-kicker">העולם חי</div>
        <h2>מחקרים נפתחים. אנשים מחברים.</h2>
        <p>אותן התכנסויות וחוקרים שכבר חיים בעולם — כאן כחלון קטן למה שקורה במערכת.</p>
      </div>
      <button type="button" className="sod29-action" onClick={onOpenWorld}>פתח את העולם ←</button>
    </div>

    <div className="sod29-home-world-preview-grid">
      <div className="sod29-home-world-research-lane">
        <div className="sod29-home-world-lane-head">
          <strong>חדש במחקר</strong>
          <small>התכנסויות ציבוריות שאושרו לאחרונה</small>
        </div>
        <div className="sod29-home-world-research-list">
          {research.slice(0, 5).map((item) => <button
            type="button"
            className="sod29-home-world-research-item"
            key={item.id}
            onClick={() => item.slug && onOpenTopic(item.slug)}
            disabled={!item.slug}
          >
            <span>{item.value != null ? item.value : "✦"}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.creator}{item.at ? " · " + formatPulseDate(item.at) : ""}</small>
            </div>
          </button>)}
        </div>
      </div>

      <div className="sod29-home-world-people-lane" data-experience-capability="home-researchers">
        <div className="sod29-home-world-lane-head">
          <strong>חוקרים וכותבים</strong>
          <small>זהויות ציבוריות שכבר אושרו במערכת</small>
        </div>
        <div className="sod29-home-world-people-list">
          {people.slice(0, 4).map((person) => <button
            type="button"
            className="sod29-home-world-person"
            key={person.id}
            onClick={() => onOpenResearcher(person.slug)}
          >
            <span className="sod29-home-world-person-mark" aria-hidden="true">
              {(person.displayName || "?").trim().slice(0, 1)}
            </span>
            <div>
              <strong>{person.displayName}</strong>
              <small>{person.role || "חוקר בסוד 1820"}</small>
              {person.meetingCount > 0 ? <em>{person.meetingCount} התכנסויות ציבוריות</em> : null}
            </div>
          </button>)}
        </div>
      </div>
    </div>
  </section>;
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

    const entry = buildUnifiedResearchEntry({ input: { text: raw } });
    const primary = entry.identity_resolution?.primary || null;
    const id = primary?.type === "number"
      ? String(primary.value ?? primary.label ?? raw)
      : String(primary?.label || raw);
    const type = primary?.type === "number" ? "number" : "phrase";
    const href = type === "number" ? `/2029/number/${encodeURIComponent(id)}` : "/world";

    research.setResearchContext?.({
      subject: { id, type, label: id, href },
      selection: { entityId: id, entityType: type },
      lens: "world",
      locale: "he",
      dimensions: {
        unifiedEntryVersion: entry.version,
        inputKind: entry.input_kind,
      },
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
  const worldPreview = homeState.projection?.worldPreview || null;

  const openCalculator = (expression) => {
    const phrase = String(expression || "").trim();
    navigate(phrase ? `/2029/gematria?q=${encodeURIComponent(phrase)}` : "/2029/gematria");
  };

  const openTopic = (slug) => {
    if (!slug) return;
    navigate(`/topic/${encodeURIComponent(slug)}`);
  };

  const openResearcher = (slug) => {
    if (!slug) return;
    navigate(`/researcher/${encodeURIComponent(slug)}`);
  };

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
      />
      {!homeState.loading && !temporalNow ? <div className="sod29-home-now-empty">אין כרגע חיבור מספיק חזק להבלטה. הבית נשאר שקט במקום להמציא עדכון.</div> : null}
    </section>

    <HomeSystemPulse
      pulse={homeState.projection?.systemPulse || null}
      loading={homeState.loading}
    />

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
          <div className="sod29-actions">
            <button className="sod29-action" type="button" onClick={() => navigate("/2029/journey")}>מסע החיים שלי</button>
            <span className="sod29-muted">מידע אישי נכנס רק מתוך המסע — החיפוש הכללי לא מנחש מי הוא אדם.</span>
          </div>
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

    <HomeMiniGematria onOpenCalculator={openCalculator} />

    <HomeWorldPreview
      preview={worldPreview}
      loading={homeState.loading}
      onOpenTopic={openTopic}
      onOpenResearcher={openResearcher}
      onOpenWorld={() => navigate("/world")}
    />

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
  return <Sod2029Shell surface="home" symbol="✦" eyebrow="גלה · עכשיו · המשך" title="SOD1820 2029" description="מה מתגלה עכשיו, מה נפתח בעולם, ואיך ממשיכים מאותה נקודה."><HomeBody /></Sod2029Shell>;
}
