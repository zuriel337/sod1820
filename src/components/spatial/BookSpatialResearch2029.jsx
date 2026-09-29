import React, { useMemo, useState } from "react";
import {
  BOOK_SPATIAL_LENSES,
  compileBookResearchScene,
  hasBookSpatialProjection,
} from "../../lib/spatial/bookResearchScene.js";
import "./bookSpatialResearch2029.css";

const GLYPH = Object.freeze({
  book: "▤",
  spine: "◌",
  triad: "≡",
  ring22: "22",
  source_bridge: "↔",
  aleph: "א",
  ring50: "50",
  tetra: "△",
  stack7: "7",
  shells: "OM",
  pulse: "◉",
  void: "∞",
  return_path: "↩",
  control: "!",
  research: "·",
});

function truthLabel(node) {
  if (node?.ref?.engineVerified) return "חישוב אומת במנוע";
  if (node?.truthTier === "SOURCE_SUPPORTED") return "נתמך במקור";
  if (node?.truthTier === "FACT") return "עובדה / חישוב";
  if (node?.truthTier === "ENGINE_MISMATCH") return "אי־התאמה";
  return "מועמד מחקר";
}

function pageLabel(sourceRef) {
  const match = String(sourceRef || "").match(/#p(\d+)/i);
  return match ? `PDF · עמוד ${match[1]}` : "מראה־מקום שמור";
}

function pointFor(node) {
  const p = node?.position || { x: 0, y: 0, z: 0 };
  return {
    x: Math.max(6, Math.min(94, 50 + (Number(p.x) || 0) * 6.35)),
    y: Math.max(8, Math.min(91, 50 + (Number(p.z) || 0) * 4.85 - (Number(p.y) || 0) * 3.1)),
    depth: Number(p.y) || 0,
  };
}

function StaticFallback({ nodes }) {
  return <details className="sod29-book-spatial-fallback">
    <summary>פירוט נגיש / סטטי</summary>
    <div className="sod29-list">
      {nodes.map((node) => <div className="sod29-row" key={node.id}>
        <div>
          <strong>{node.label}</strong>
          <small>{[truthLabel(node), node.ref?.sourceRef ? pageLabel(node.ref.sourceRef) : null].filter(Boolean).join(" · ")}</small>
        </div>
      </div>)}
    </div>
  </details>;
}

export default function BookSpatialResearch2029({ book, rows }) {
  const configured = book?.metadata?.projection?.spatial_golden;
  const hasRows = hasBookSpatialProjection(rows);
  const [lens, setLens] = useState("overview");
  const [focusId, setFocusId] = useState(null);

  const scene = useMemo(
    () => compileBookResearchScene(book, rows, { lens, focusId }),
    [book, rows, lens, focusId],
  );

  if (!configured && !hasRows) return null;

  const points = new Map(scene.sceneNodes.map((node) => [node.id, pointFor(node)]));
  const focused = scene.sceneNodes.find((node) => node.id === scene.focusId) || scene.sceneNodes[0];
  const researchNodes = scene.sceneNodes.filter((node) => node.id !== scene.subjectId);

  return <section
    className="sod29-section sod29-book-spatial-section"
    data-experience-capability="book-spatial-research-2_5d"
    aria-labelledby="book-spatial-title"
  >
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">SPATIAL GOLDEN · G3</div>
        <h2 id="book-spatial-title">אותו מחקר, בעומק</h2>
        <div className="sod29-muted">
          זו הקרנה 2.5D של אותם Research Objects. מיקום, עומק וקרבה הם מצב תצוגה בלבד — לא ראיה, לא Edge חדש ולא מערכת אמת נוספת.
        </div>
      </div>
      <div className="sod29-actions">
        <span className="sod29-chip">One Tree</span>
        <span className="sod29-chip">S2/S3 bounded</span>
        <span className="sod29-chip">x/y/z = projection only</span>
      </div>
    </div>

    {!hasRows ? <div className="sod29-state warn">
      שכבת המרחב קיימת לספר הזה, אבל הממצאים עצמם אינם קריאים בהרשאה הנוכחית. לא מרחיבים RLS כדי למלא את הסצנה.
    </div> : <>
      <div className="sod29-book-spatial-toolbar" role="group" aria-label="עומק תצוגה">
        {Object.values(BOOK_SPATIAL_LENSES).map((option) => <button
          key={option.key}
          type="button"
          className={`sod29-action ${lens === option.key ? "primary" : ""}`}
          onClick={() => { setLens(option.key); setFocusId(null); }}
          aria-pressed={lens === option.key}
        >{option.label}</button>)}
      </div>

      <div className="sod29-book-spatial-layout">
        <div className="sod29-book-spatial-canvas" aria-label="מפת מחקר מרחבית">
          <div className="sod29-book-spatial-rings" aria-hidden="true"><i /><i /><i /></div>
          <svg className="sod29-book-spatial-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {scene.sceneRelations.map((relation) => {
              const a = points.get(relation.from);
              const b = points.get(relation.to);
              if (!a || !b) return null;
              return <line key={relation.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
          </svg>
          {scene.sceneNodes.map((node) => {
            const point = points.get(node.id);
            const selected = node.id === scene.focusId;
            return <button
              key={node.id}
              type="button"
              className={`sod29-book-spatial-node ${selected ? "is-focused" : ""} role-${node.sceneRole || node.kind}`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                "--s29-spatial-depth-px": `${Math.max(0, point.depth * 9)}px`,
              }}
              onClick={() => setFocusId(node.id)}
              aria-pressed={selected}
              title={node.subtitle}
            >
              <span className="sod29-book-spatial-glyph" aria-hidden="true">{GLYPH[node.visualHint] || GLYPH.research}</span>
              <strong>{node.label}</strong>
            </button>;
          })}
        </div>

        <aside className="sod29-inspector sod29-book-spatial-inspector" aria-live="polite">
          <div className="sod29-kicker">FOCUS</div>
          <h3>{focused?.label}</h3>
          <p className="sod29-muted">{focused?.subtitle}</p>
          <div className="sod29-book-spatial-meta">
            <span>{truthLabel(focused)}</span>
            {focused?.ref?.sourceRef ? <span>{pageLabel(focused.ref.sourceRef)}</span> : null}
            {focused?.layer ? <span>שכבה: {focused.layer}</span> : null}
          </div>
          <div className="sod29-divider" />
          <p className="sod29-muted">
            {focused?.id === scene.subjectId
              ? "זהות הספר היא המרכז. כל הצמתים האחרים הם הקרנות של Research Objects קיימים."
              : "בחירת צומת משנה רק Focus. ה־Finding, המקור והסטטוס נשארים באותו Research OS."}
          </p>
          <a className="sod29-action" href="#book-research-summary">פתח את המחקר הטקסטואלי ↓</a>
        </aside>
      </div>

      <StaticFallback nodes={researchNodes} />
    </>}
  </section>;
}
