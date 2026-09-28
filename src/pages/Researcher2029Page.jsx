import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import ContributorFindingsLens from "../components/research/ContributorFindingsLens.jsx";
import { fetchContributorFindingsProjection } from "../lib/research/contributorFindingsProjection.js";
import {
  RESEARCHER_OPERATION_FILTERS,
  fetchResearcherCorpusBySlug,
  filterResearcherCorpus,
} from "../lib/research/researcherCorpusProjection.js";
import { applySeo } from "../lib/seo.js";
import "./researcher2029.css";

const OPERATION_LABELS = Object.freeze({
  "single-verification": "שוויון / חישוב",
  "quantity-product": "כפל כמות",
  "two-phrase-product": "כפל ביטויים",
  "number-product-equals-phrase": "כפל מספרי",
  "general-chain": "שרשרת",
  "phrase-sum-chain": "סכום",
  other: "ממצא",
});

function dateLabel(value) {
  if (!value) return null;
  try { return new Date(value).toLocaleDateString("he-IL"); } catch (_) { return null; }
}

function CorpusRow({ row, onOpenToken }) {
  const operation = OPERATION_LABELS[row.operationKind] || row.operationKind || "ממצא";
  return (
    <article className="sod29-researcher-row">
      <div className="sod29-researcher-row-main">
        <div className="sod29-researcher-row-head">
          <span className="sod29-chip">{operation}</span>
          {row.engineVerified ? <span className="sod29-chip">מנוע ✓</span> : <span className="sod29-chip">דורש בירור</span>}
          {row.value != null ? <button className="sod29-researcher-result" type="button" onClick={() => onOpenToken({ kind: "number", label: String(row.value), value: row.value })}>{row.value}</button> : null}
        </div>
        <h3>{row.statement}</h3>
        {row.tokens.length ? <div className="sod29-researcher-tokens" aria-label="מילים ומספרים מתוך הממצא">
          {row.tokens.map((token, index) => <button
            className={`sod29-researcher-token ${token.kind === "number" ? "is-number" : "is-phrase"}`}
            type="button"
            key={`${token.kind}:${token.label}:${index}`}
            onClick={() => onOpenToken(token)}
            title={token.method ? `${token.method} · פתח בעולם` : "פתח בעולם"}
          >
            <span>{token.label}</span>
            {token.method ? <small>{token.method}</small> : null}
          </button>)}
        </div> : null}
      </div>

      <details className="sod29-researcher-admin-detail">
        <summary>פרטי מנהל</summary>
        <div className="sod29-researcher-admin-grid">
          <div><b>סטטוס</b><span>{row.status || "—"}</span></div>
          <div><b>פרטיות</b><span>{row.privacyScope || "—"}</span></div>
          <div><b>סוג</b><span>{row.kind}</span></div>
          <div><b>נוסף</b><span>{dateLabel(row.createdAt) || "—"}</span></div>
          <div><b>מקור עיבוד</b><span>{row.source || "—"}</span></div>
          <div className="wide"><b>Provenance</b><code dir="ltr">{row.sourceRef || "—"}</code></div>
          <div className="wide"><b>תגיות פעולה</b><span>{row.operationTags.join(" · ")}</span></div>
        </div>
      </details>
    </article>
  );
}

function ResearcherPublicTopic({ slug }) {
  const shell = use2029Shell();
  const [state, setState] = useState({ loading: true, projection: null, error: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, projection: null, error: null });
    fetchContributorFindingsProjection(slug)
      .then((projection) => { if (alive) setState({ loading: false, projection, error: null }); })
      .catch((error) => { if (alive) setState({ loading: false, projection: null, error }); });
    return () => { alive = false; };
  }, [slug]);

  const p = state.projection;
  if (state.loading) return <FrameState kind="loading" title="מחבר את נושא המחקר">מקורות, ממצאים, פעילות והתכנסויות נטענים מאותו Research OS.</FrameState>;
  if (state.error) return <FrameState kind="error" title="נושא המחקר לא נטען כרגע">לא יוצג חומר חלופי במקום המידע שלא נטען.</FrameState>;
  if (!p) return <FrameState kind="empty" title="החוקר לא נמצא">לא נוצרה זהות חלופית לפי שם.</FrameState>;

  return <>
    <section className="sod29-focus-stage sod29-researcher-public-hero" data-experience-capability="researcher-public-topic">
      <div>
        <div className="sod29-kicker">נושא מחקרי · חוקר / כותב</div>
        <h2>{p.contributor.displayName}</h2>
        <p className="sod29-muted">מקום אחד לכל החומר הציבורי שמיוחס לחוקר: המקור, מה שחולץ ממנו, המספרים, המדיה, הפעילות וההתכנסויות. החוקר הוא עדשת provenance — לא עץ נוסף.</p>
        <div className="sod29-actions">
          <span className="sod29-chip">{p.counts.sourceGroups || 0} מקורות</span>
          <span className="sod29-chip">{p.counts.researchObjects || 0} ממצאים</span>
          <span className="sod29-chip">{p.counts.contributions || 0} פעילות / תרומות</span>
          <span className="sod29-chip">{p.counts.topics || 0} התכנסויות</span>
          <button className="sod29-action" type="button" onClick={() => shell.go("/world")}>חזרה לעולם</button>
        </div>
      </div>
    </section>

    <section className="sod29-section sod29-researcher-future-intake" aria-label="פעילות עתידית של החוקר">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">ONE TREE · CONTINUOUS INTAKE</div>
          <h2>גם מה שיעלה בהמשך נשאר באותו נושא מחקרי</h2>
          <div className="sod29-muted">פוסט, הודעת מקור, תרומה, צ׳אט או פורום שמיוחסים לחוקר יכולים להופיע כאן כפעילות/מקור דרך ה־owners הקיימים. הם לא הופכים אוטומטית לממצא מאומת, Topic או אמת קנונית.</div>
        </div>
      </div>
    </section>

    <ContributorFindingsLens projection={p} loading={false} error={null} />
  </>;
}

function ResearcherCorpusView({ slug }) {
  const { isAdmin, loading: authLoading } = useAuth();
  const research = useResearch();
  const shell = use2029Shell();
  const [state, setState] = useState({ loading: false, contributor: null, rows: [], counts: {}, error: null });
  const [query, setQuery] = useState("");
  const [operation, setOperation] = useState("all");

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let alive = true;
    setState({ loading: true, contributor: null, rows: [], counts: {}, error: null });
    fetchResearcherCorpusBySlug(slug)
      .then((result) => alive && setState({ loading: false, contributor: result.contributor, rows: result.rows, counts: result.counts, error: null }))
      .catch((error) => alive && setState({ loading: false, contributor: null, rows: [], counts: {}, error }));
    return () => { alive = false; };
  }, [slug, isAdmin, authLoading]);

  const visibleRows = useMemo(
    () => filterResearcherCorpus(state.rows, { query, operation }),
    [state.rows, query, operation]
  );

  const openToken = (token) => {
    const raw = String(token?.label ?? token?.value ?? "").trim();
    if (!raw) return;
    const numeric = token?.kind === "number" || /^\d+$/.test(raw);
    const id = numeric ? String(Number(token?.value ?? raw)) : raw;
    const type = numeric ? "number" : "phrase";
    research.setResearchContext?.({
      subject: { id, type, label: id, href: "/world" },
      selection: { entityId: id, entityType: type },
      lens: "world",
      returnTo: { href: `/researcher/${encodeURIComponent(slug)}`, label: state.contributor?.display_name || "קורפוס חוקר" },
    });
    shell.go("/world", { preserve: false });
  };

  if (authLoading) return <FrameState kind="loading" title="בודק הרשאת מנהל">טוען זהות והרשאה.</FrameState>;
  if (!isAdmin) return null;
  if (state.loading) return <FrameState kind="loading" title="טוען קורפוס מפוענח">קורא את חומר החוקר מתוך Research Objects הקיימים.</FrameState>;
  if (state.error) return <FrameState kind="error" title="הקורפוס לא נטען">{String(state.error?.message || state.error)}</FrameState>;
  if (!state.contributor) return <FrameState kind="empty" title="החוקר לא נמצא">לא נוצרה זהות חלופית ולא בוצע חיבור לפי שם.</FrameState>;

  return <>
    <section className="sod29-focus-stage sod29-researcher-hero">
      <div>
        <div className="sod29-kicker">RESEARCHER CORPUS · ADMIN DEEP VIEW</div>
        <h2>{state.contributor.display_name}</h2>
        <p className="sod29-muted">{state.contributor.specialty_label || state.contributor.role || "קורפוס מחקר מפוענח"}</p>
        <div className="sod29-actions">
          <span className="sod29-chip">{state.counts.all || 0} ממצאים</span>
          <span className="sod29-chip">{state.counts.multiplication || 0} עם כפל</span>
          <span className="sod29-chip">{state.counts.addition || 0} עם חיבור</span>
          <span className="sod29-chip">{state.counts.unresolved || 0} דורשים בירור</span>
        </div>
      </div>
    </section>

    <section className="sod29-section sod29-researcher-controls">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">סינון</div>
          <h2>ראה בדיוק את מה שאתה מחפש</h2>
          <div className="sod29-muted">הפילטרים מקרינים את הפענוח הקיים. הם אינם מחשבים מחדש ואינם משנים אמת, סטטוס או פרטיות.</div>
        </div>
        <span className="sod29-chip">{visibleRows.length} מוצגים</span>
      </div>
      <label className="sod29-researcher-search">
        <span>חיפוש מילה, ביטוי או מספר</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="טוב · 102 · מלאך · 3060" />
      </label>
      <div className="sod29-researcher-filters" role="group" aria-label="סינון לפי פעולה">
        {RESEARCHER_OPERATION_FILTERS.map((filter) => <button
          key={filter.key}
          type="button"
          className={`sod29-action${operation === filter.key ? " primary" : ""}`}
          aria-pressed={operation === filter.key}
          onClick={() => setOperation(filter.key)}
        >
          {filter.label}
          <small>{state.counts[filter.key] ?? 0}</small>
        </button>)}
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">החומר המפוענח</div>
          <h2>{operation === "all" ? "כל הממצאים" : RESEARCHER_OPERATION_FILTERS.find((x) => x.key === operation)?.label}</h2>
        </div>
      </div>
      {visibleRows.length ? <div className="sod29-researcher-list">
        {visibleRows.map((row) => <CorpusRow row={row} key={row.id} onOpenToken={openToken} />)}
      </div> : <FrameState kind="empty" title="אין תוצאות לסינון הזה">נסה מילה אחרת או בחר פילטר אחר.</FrameState>}
    </section>
  </>;
}

export default function Researcher2029Page() {
  const { slug } = useParams();
  useEffect(() => {
    applySeo({
      title: "חוקר / כותב · SOD1820 2029",
      description: "נושא מחקרי ציבורי של חוקר או כותב ב-SOD1820 2029",
      path: `/researcher/${encodeURIComponent(slug || "")}`,
      noindex: true,
    });
  }, [slug]);

  return (
    <Sod2029Shell
      surface="world"
      symbol="⌁"
      eyebrow="RESEARCHER CORPUS · 2029"
      title="חוקר / כותב"
      description="נושא מחקרי אחד שמחבר את המקורות, הממצאים, הפעילות, המספרים וההתכנסויות של החוקר."
      status="2029 · נושא מחקרי"
    >
      <ResearcherPublicTopic slug={slug} />
      <ResearcherCorpusView slug={slug} />
    </Sod2029Shell>
  );
}
