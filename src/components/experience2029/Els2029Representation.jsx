import React, { useMemo } from "react";
import projectEls2029Representation from "../../lib/research/els2029Representation.js";
import "./els2029-representation.css";

const fmt = (value) => value == null || value === "" ? "—" : String(value);

function BandMeta({ band }) {
  return <div className="sod29-els-rep-band-meta">
    <strong>{band.role === "axis" ? "AXIS · PROJECTION ROLE" : "OCCURRENCE"}</strong>
    <span>{fmt(band.occurrenceId)}</span>
    <small>
      skip {fmt(band.skip)} · dir {fmt(band.dir)} · dependency {fmt(band.dependencyGroup)}
    </small>
  </div>;
}

export default function Els2029Representation({ layers = null }) {
  const model = useMemo(() => projectEls2029Representation(layers), [layers]);
  const ready = model.status === "READY" && model.bands.length > 0;

  return <section
    className="sod29-els-representation"
    data-experience-capability="els-2d-2_5d-representation"
    data-els-representation-contract={model.contract}
    data-els-source-contract={model.sourceContract}
    data-els-representation-status={model.status}
    aria-labelledby="els-representation-title"
  >
    <div className="sod29-els-rep-head">
      <div>
        <div className="sod29-kicker">2D / 2.5D REPRESENTATION</div>
        <h3 id="els-representation-title">שכבות מעל אותו occurrence</h3>
        <p className="sod29-muted">
          זהו renderer של coordinates קיימים בלבד. ציר הוא תפקיד תצוגה; קרבה חזותית אינה חוזק ראיה.
        </p>
      </div>
      <span className="sod29-chip">{ready ? "DOM · READY" : "FEED REQUIRED"}</span>
    </div>

    {!ready ? <div className="sod29-els-rep-empty" role="status">
      <strong>ה־renderer מוכן, אבל אין כרגע els_2029_layers_v1 מחובר למשטח.</strong>
      <span>לא נוצרת geometry מקומית, לא מחושב ELS מחדש ולא מומצאות אותיות כדי למלא את הבמה.</span>
    </div> : <>
      <div className="sod29-els-rep-stage" aria-hidden="true" dir="ltr">
        <div className="sod29-els-rep-axis-label">
          CORPUS INDEX · {model.extent?.minCorpusIndex} → {model.extent?.maxCorpusIndex}
        </div>
        {model.bands.map((band) => <div
          key={band.layerId || band.occurrenceId}
          className={"sod29-els-rep-band" + (band.role === "axis" ? " is-axis" : "")}
          data-role={band.role}
          data-occurrence-id={band.occurrenceId}
        >
          <BandMeta band={band} />
          <div className="sod29-els-rep-track">
            <div className="sod29-els-rep-track-line" />
            {band.cells.map((cell) => <span
              key={band.occurrenceId + ":" + cell.corpusIndex + ":" + cell.sequenceIndex}
              className="sod29-els-rep-node"
              style={{ left: "calc(" + (cell.xRatio * 100) + "% - 6px)" }}
              data-corpus-index={cell.corpusIndex}
              data-character-identity-ref={cell.characterIdentityRef || undefined}
              title={"corpus index " + cell.corpusIndex}
            >
              <i />
              <em>{cell.corpusIndex}</em>
            </span>)}
          </div>
        </div>)}
      </div>

      <details className="sod29-els-rep-fallback">
        <summary>פירוט DOM נגיש / סטטי</summary>
        <div className="sod29-els-rep-fallback-list">
          {model.bands.map((band) => <section key={"fallback:" + band.occurrenceId}>
            <h4>{band.role === "axis" ? "ציר תצוגה" : "מופע"} · {band.occurrenceId}</h4>
            <dl>
              <div><dt>Corpus</dt><dd>{fmt(band.corpusId)}</dd></div>
              <div><dt>Skip / dir</dt><dd>{fmt(band.skip)} / {fmt(band.dir)}</dd></div>
              <div><dt>Dependency group</dt><dd>{fmt(band.dependencyGroup)}</dd></div>
              <div><dt>Positions</dt><dd>{band.positions.length ? band.positions.join(" · ") : "—"}</dd></div>
            </dl>
          </section>)}
        </div>
      </details>
    </>}

    <div className="sod29-els-rep-guardrail">
      Character Identity ≠ Textual Occurrence ≠ Glyph Representation ≠ font outline ≠ Rendering Instance
    </div>
  </section>;
}
