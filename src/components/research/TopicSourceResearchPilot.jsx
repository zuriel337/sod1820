import React from "react";

const clean = (value) => value == null ? "" : String(value).trim();

function AnalysisKind({ kind }) {
  const label = {
    fact: "עובדה / חישוב",
    relation: "קשר",
    hypothesis: "השערה",
    observation: "ממצא",
    question: "שאלה",
  }[clean(kind)] || "ממצא";
  return <span className="sod29-topic-research-kind">{label}</span>;
}

function SourceArtifact({ group, index }) {
  const media = Array.isArray(group?.media) ? group.media : [];
  const refs = Array.isArray(group?.sourceRefs) ? group.sourceRefs : [];
  return <article className="sod29-topic-source-artifact">
    <div className="sod29-topic-source-artifact-head">
      <div>
        <div className="sod29-kicker">SOURCE · דברי צבי</div>
        <h3>{index === 0 ? "המקור המחקרי" : "מופע מקור נוסף"}</h3>
      </div>
      <span className="sod29-chip">{refs.length} מופעי מקור</span>
    </div>

    {media.length ? <div className="sod29-topic-source-media" data-media-count={media.length}>
      {media.map((src, mediaIndex) => <figure key={src}>
        <img src={src} loading="lazy" alt={`מקור חזותי למחקר · ${mediaIndex + 1}`} />
        <figcaption>תמונת מקור · לא תחליף לטקסט ולא לניתוח</figcaption>
      </figure>)}
    </div> : <div className="sod29-topic-source-media-missing">
      <strong>המקור החזותי עדיין לא הוכח ישירות</strong>
      <span>הטקסט נשמר; לא נחבר תמונה לפי דמיון או סמיכות זמן בלבד.</span>
    </div>}

    {group?.text ? <div className="sod29-topic-source-words">
      <div className="sod29-topic-layer-label">המילים של צבי</div>
      <p>{group.text}</p>
    </div> : null}

    <div className="sod29-topic-source-foot">
      {group?.createdAt ? <span>{new Date(group.createdAt).toLocaleDateString("he-IL")}</span> : null}
      {group?.channel ? <span>{group.channel}</span> : null}
      {group?.contributor ? <span>{group.contributor}</span> : null}
    </div>
  </article>;
}

export default function TopicSourceResearchPilot({ state }) {
  if (!state?.enabled) return null;

  if (state.loading) {
    return <section className="sod29-section sod29-topic-research-pilot">
      <div className="sod29-kicker">SOURCE + RESEARCH · ADMIN PILOT</div>
      <h2>מחבר את דברי החוקר לניתוח</h2>
      <p className="sod29-topic-research-lead">טוען מקור, מדיה ו־Research Objects מאותו lineage.</p>
    </section>;
  }

  if (state.error) {
    return <section className="sod29-section sod29-topic-research-pilot">
      <div className="sod29-kicker">SOURCE + RESEARCH · ADMIN PILOT</div>
      <h2>הפיילוט לא נטען</h2>
      <p className="sod29-topic-research-lead">לא נציג מקור או ניתוח משוער. הדף הציבורי נשאר ללא שינוי.</p>
    </section>;
  }

  const projection = state.projection;
  if (!projection) return null;

  return <section className="sod29-section sod29-topic-research-pilot" id="topic-source-research" data-admin-research-pilot="zvi-620">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">SOURCE + RESEARCH · ADMIN PILOT</div>
        <h2>דברי צבי והמחקר החי</h2>
      </div>
      <span className="sod29-chip">פיילוט מנהל</span>
    </div>

    <p className="sod29-topic-research-lead">
      אותו מחקר, שתי שכבות שאינן מתערבבות: קודם המקור כפי שנכתב ונראה, אחר כך הממצאים והאימותים של המערכת.
    </p>

    <div className="sod29-topic-research-stats" aria-label="מצב חומר המחקר">
      <span><strong>{projection.counts.sourceOccurrences}</strong> מופעי מקור</span>
      <span><strong>{projection.counts.directMedia}</strong> תמונות מקור ישירות</span>
      <span><strong>{projection.counts.verifiedAnalysis}</strong> ממצאים מאומתים</span>
      <span><strong>{projection.counts.pendingStructuralAnalysis}</strong> ממתינים לפענוח מבני</span>
    </div>

    <div className="sod29-topic-source-stack">
      {projection.sourceGroups.map((group, index) => <SourceArtifact group={group} index={index} key={group.sourceIds.join(":") || index} />)}
    </div>

    <div className="sod29-topic-analysis-panel">
      <div className="sod29-topic-analysis-head">
        <div>
          <div className="sod29-kicker">SYSTEM ANALYSIS</div>
          <h3>ניתוח המערכת</h3>
        </div>
        <span>{projection.analysis.length} ממצאים</span>
      </div>

      {projection.analysis.length ? <div className="sod29-topic-analysis-list">
        {projection.analysis.map((row) => <article className="sod29-topic-analysis-row" key={row.id || row.sourceRef}>
          <div className="sod29-topic-analysis-meta">
            <AnalysisKind kind={row.kind} />
            {row.engineVerified
              ? <span className="sod29-topic-engine-verified">מאומת במנוע</span>
              : <span className="sod29-topic-engine-pending">מחקר / לא מאומת במנוע</span>}
          </div>
          <strong>{row.statement}</strong>
          {row.evidence && row.evidence !== row.statement ? <p>{row.evidence}</p> : null}
        </article>)}
      </div> : <div className="sod29-topic-source-media-missing">
        <strong>עדיין אין ניתוח מערכת להצגה</strong>
        <span>המקור נשמר גם בלי להמציא ממנו מסקנות.</span>
      </div>}
    </div>

    <div className="sod29-topic-research-boundary">
      <strong>גבול אמת</strong>
      <span>{projection.truthBoundary}</span>
    </div>
  </section>;
}
