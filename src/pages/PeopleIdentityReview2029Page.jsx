import React, { useEffect, useMemo, useState } from "react";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import {
  PEOPLE_IDENTITY_FILTERS,
  fetchPeopleIdentityReview,
  filterPeopleIdentityRows,
} from "../lib/research/peopleIdentityProjection.js";
import { applySeo } from "../lib/seo.js";
import "./researcher2029.css";
import "./peopleIdentityReview2029.css";

function dateLabel(value) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("he-IL"); } catch (_) { return "—"; }
}

function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function IdentityRow({ row }) {
  return <article className="sod29-people-row">
    <div className="sod29-people-row-main">
      <div className="sod29-people-row-head">
        <div>
          <div className="sod29-kicker">{row.identityLabel}</div>
          <h3>{row.displayName}</h3>
        </div>
        <div className="sod29-people-chips">
          {row.emailVerified ? <span className="sod29-chip">מייל מקור מאומת</span> : <span className="sod29-chip">ללא אימות מקור</span>}
          {row.siteAccountMatch ? <span className="sod29-chip">חשבון אתר</span> : null}
          {row.historicalSameNameIds > 1 ? <span className="sod29-chip">{row.historicalSameNameIds} זהויות באותו שם</span> : null}
        </div>
      </div>

      {row.siteAccountMatch ? <div className="sod29-people-link">
        <strong>חשבון אתר תואם</strong>
        <span>{row.siteDisplayName || row.siteUsername || "חשבון קיים"}</span>
      </div> : null}

      <div className="sod29-people-metrics">
        <div><strong>{row.messages.toLocaleString("he-IL")}</strong><span>הודעות</span></div>
        <div><strong>{row.activeDays.toLocaleString("he-IL")}</strong><span>ימי פעילות</span></div>
        <div><strong>{pct(row.blockedRatio)}</strong><span>חסימות מקור</span></div>
        <div><strong>{row.verifiedSameNameIds}</strong><span>עוגנים מאומתים בשם</span></div>
      </div>

      <div className="sod29-people-foot">
        <span>{dateLabel(row.firstSeen)} ← {dateLabel(row.lastSeen)}</span>
        <span>{row.contributorRole || row.contributorKind || "חבר קהילה / זהות היסטורית"}</span>
      </div>
    </div>

    <details className="sod29-researcher-admin-detail">
      <summary>פרטי זהות</summary>
      <div className="sod29-researcher-admin-grid">
        <div><b>מצב</b><span>{row.identityState}</span></div>
        <div><b>מקור Contributor</b><span>{row.contributorSource || "—"}</span></div>
        <div><b>Contributor ID</b><code dir="ltr">{row.contributorId || "—"}</code></div>
        <div><b>Source ID</b><code dir="ltr">{row.sourceId || "—"}</code></div>
        <div className="wide"><b>גבול</b><span>קריאה בלבד · אין Merge / Claim / Delete במסך הזה.</span></div>
      </div>
    </details>
  </article>;
}

function PeopleIdentityReviewBody() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fetchPeopleIdentityReview({ scope: "recent", limit: 250 })
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [authLoading, isAdmin]);

  const rows = state.data?.rows || [];
  const visible = useMemo(() => filterPeopleIdentityRows(rows, { query, filter }), [rows, query, filter]);

  if (authLoading) return <FrameState kind="loading" title="בודק הרשאת מנהל">טוען זהות והרשאה.</FrameState>;
  if (!isAdmin) return <FrameState kind="gated" title="מסך מנהל בלבד">מפת הזהויות כוללת provenance פנימי ואינה משטח ציבורי.</FrameState>;
  if (state.loading) return <FrameState kind="loading" title="טוען מפת אנשים">קורא projection מנהלי בלבד; אין שינוי בזהויות.</FrameState>;
  if (state.error) return <FrameState kind="unavailable" title="People Review עדיין Branch-only">ה־UI מוכן, אך RPC המנהל טרם שוחרר ל־DB החי.</FrameState>;

  const summary = state.data?.summary || {};
  return <>
    <section className="sod29-focus-stage sod29-people-hero">
      <div>
        <div className="sod29-kicker">PEOPLE · IDENTITY REVIEW · ADMIN</div>
        <h2>אדם אחד. הרבה מקורות. בלי ניחושים.</h2>
        <p className="sod29-muted">משתמשי אתר, OpenWeb, Contributors וכתבים מוצגים כאן כ־projection אחד. התאמה היא ראיה לבדיקה — לא פעולת Merge.</p>
      </div>
      <div className="sod29-people-summary">
        <div><strong>{Number(summary.rows || rows.length).toLocaleString("he-IL")}</strong><span>זהויות בסקופ</span></div>
        <div><strong>{Number(summary.site_accounts || 0).toLocaleString("he-IL")}</strong><span>מחוברות לאתר</span></div>
        <div><strong>{Number(summary.verified_anchors || 0).toLocaleString("he-IL")}</strong><span>עוגנים מאומתים</span></div>
        <div><strong>{Number(summary.review || 0).toLocaleString("he-IL")}</strong><span>לבדיקה</span></div>
      </div>
    </section>

    <section className="sod29-section sod29-people-controls">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">Identity 360</div>
          <h2>מצא אדם, חשבון או כינוי</h2>
          <div className="sod29-muted">אין מיילים גולמיים במסך. אימות מוצג כמצב בלבד.</div>
        </div>
        <span className="sod29-chip">{visible.length} מוצגים</span>
      </div>

      <label className="sod29-researcher-search">
        <span>חיפוש</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="שם · username · תפקיד" />
      </label>

      <div className="sod29-researcher-filters" role="group" aria-label="סינון זהויות">
        {PEOPLE_IDENTITY_FILTERS.map((item) => <button
          key={item.key}
          type="button"
          className={`sod29-action${filter === item.key ? " primary" : ""}`}
          aria-pressed={filter === item.key}
          onClick={() => setFilter(item.key)}
        >
          {item.label}
          <small>{state.data?.counts?.[item.key] ?? 0}</small>
        </button>)}
      </div>
    </section>

    <section className="sod29-section">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">Review Queue</div>
          <h2>מועמדי זהות לפי חוזק ראיות</h2>
        </div>
      </div>
      {visible.length ? <div className="sod29-people-list">
        {visible.map((row) => <IdentityRow row={row} key={row.sourceId || row.contributorId || row.displayName} />)}
      </div> : <FrameState kind="empty" title="אין תוצאות">אין זהויות שמתאימות לסינון הזה.</FrameState>}
    </section>
  </>;
}

export default function PeopleIdentityReview2029Page() {
  useEffect(() => {
    applySeo({
      title: "People Identity Review · SOD1820",
      description: "Internal 2029 identity reconciliation projection",
      path: "/2029/admin/people",
      noindex: true,
    });
  }, []);

  return <Sod2029Shell
    surface="workspace"
    symbol="◎"
    eyebrow="PEOPLE · IDENTITY · 2029"
    title="מפת האנשים"
    description="זהות, היסטוריה וקרדיט בעץ אחד — בלי לאחד אנשים לפי שם ובלי לאבד provenance."
    status="מנהל · Branch-only"
  >
    <PeopleIdentityReviewBody />
  </Sod2029Shell>;
}
