import React, { useEffect } from "react";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import Els2029Representation from "../components/experience2029/Els2029Representation.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import FeatureClosedNotice from "../components/FeatureClosedNotice.jsx";
import { useFeatureState } from "../components/MaintenanceLock.jsx";

const clean = (value) => String(value ?? "").trim();

function StateRow({ label, value, state = "ready" }) {
  return <div className="sod29-state" data-state={state}>
    <small>{label}</small>
    <b>{value}</b>
  </div>;
}

export default function Els2029Page({ layeredProjection = null }) {
  const research = useResearch();
  const elsState = useFeatureState("lock_els");
  const context = research.context || null;
  const subject = context?.subject || null;
  const selection = context?.selection || null;
  const elsSelection = selection?.entityType === "els";
  const locator = elsSelection ? clean(selection?.locator) : "";
  const journey = context?.journey || null;
  const layeredReady = layeredProjection?.contract === "els_2029_layers_v1";

  const exactReplayReady = Boolean(
    elsSelection
    && clean(selection?.corpus)
    && Number.isInteger(Number(selection?.start))
    && Number(selection?.skip) >= 2
    && [-1, 1].includes(Number(selection?.dir))
  );

  useEffect(() => {
    applySeo({ title: "ELS · SOD1820", description: "ELS 2029 · Research Context, exact locus and replay-ready projection", path: "/els" });
    research.updateResearchContext?.({ lens: "els" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (elsState.loading) {
    return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="ONE ELS ENGINE · MANY PROJECTIONS" title="ELS" description="טוען את מצב היכולת הקנוני…">
      <div className="sod29-frame-state state-loading" role="status">טוען מצב ELS…</div>
    </Sod2029Shell>;
  }

  if (elsState.blocked) {
    return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="ONE ELS ENGINE · MANY PROJECTIONS" title="ELS" description="אותו מנוע קנוני, עם מצב פתיחה/סגירה אחד לכל המערכת.">
      <FeatureClosedNotice state={elsState} title="ELS" to="/world" />
    </Sod2029Shell>;
  }

  return <Sod2029Shell
    wide
    surface="els"
    symbol="✦"
    eyebrow="ONE ELS ENGINE · MANY PROJECTIONS"
    title="ELS"
    description="משטח 2029 מקרין Research Context ותוצאות קנוניות. הוא אינו מחשב ELS בעצמו ואינו יורש את ה־Work Area הישן כארכיטקטורה."
  >
    <section className="sod29-focus-stage" data-els-2029-surface="v1">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">CURRENT RESEARCH CONTEXT</div>
          <h2>{subject?.label ? "מחקר ELS סביב " + subject.label : "ELS מחכה להקשר מחקר"}</h2>
          <div className="sod29-muted">
            {subject
              ? "הנושא מגיע מאותו Research Context של World / Number / Heichal / Journey. בחירת מופע אינה יוצרת זהות חדשה."
              : "פתח ELS מתוך Number, World, Heichal, Journey או מקור אחר כדי לשמור רצף מחקר. אין כאן חיפוש חופשי מומצא כשאין Anchor."}
          </div>
        </div>
        <span className="sod29-chip">{subject ? "CONTEXT READY" : "CONTEXT REQUIRED"}</span>
      </div>

      <div className="sod29-els-architecture">
        <div className="sod29-els-matrix-stage">
          <div style={{ width: "100%" }}>
            <div className="sod29-kicker">SEMANTIC LOCUS</div>
            <h3 style={{ marginTop: 6 }}>{elsSelection ? "מופע ELS נבחר" : "טרם נבחר מופע ELS"}</h3>
            <p className="sod29-muted">
              {elsSelection
                ? "הבחירה היא projection על occurrence קיים. המשטח שומר זהות, provenance ו־return context; renderer עתידי יכול להשתנות בלי לשנות את הממצא."
                : "המנוע וה־renderer מופרדים. כשיגיע Result Bundle קנוני, אותו occurrence יוכל להופיע ב־DOM, Matrix, שכבות או 3D בלי חישוב אמת נוסף."}
            </p>

            <div className="sod29-actions" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <span className="sod29-chip">Character Identity</span>
              <span className="sod29-chip">Textual Occurrence</span>
              <span className="sod29-chip">Glyph Representation</span>
              <span className="sod29-chip">Rendering Instance</span>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <StateRow label="Subject / Anchor" value={subject?.label || "נדרש הקשר מחקר"} state={subject ? "ready" : "building"} />
              <StateRow label="Occurrence locator" value={locator || "ממתין לבחירת locus"} state={locator ? "ready" : "building"} />
              <StateRow
                label="Exact replay"
                value={exactReplayReady ? "corpus + start + skip + direction זמינים" : "נדרש Result Bundle עם coordinates מלאים"}
                state={exactReplayReady ? "ready" : "building"}
              />
              <StateRow
                label="2D / 2.5D projection feed"
                value={layeredReady ? "els_2029_layers_v1 מחובר ל־renderer" : "ממתין ל־layered projection קנוני"}
                state={layeredReady ? "ready" : "building"}
              />
              <StateRow
                label="Journey continuity"
                value={journey?.id ? "פעיל · " + (clean(journey.kind) || "journey") : "אותו Research Context מוכן למסלול"}
                state={journey?.id ? "ready" : "building"}
              />
            </div>

            <Els2029Representation layers={layeredProjection} />
          </div>
        </div>

        <aside className="sod29-inspector">
          <div className="sod29-kicker">FOUNDATION → PROJECTION</div>
          <h3 style={{ marginTop: 5 }}>מה המשטח רשאי לעשות</h3>
          <div className="sod29-divider" />
          <div className="sod29-muted">Truth</div><b>לצרוך occurrence קנוני · לא לחשב אותו מחדש</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Context</div><b>לשמור Anchor · selection · Journey · exact return</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Spatial</div><b>Matrix / layers / 3D הם representation בלבד</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Evidence</div><b>קרבה חזותית אינה מעלה Truth או Independence</b>
        </aside>
      </div>

      <section className="sod29-section" aria-label="ELS adaptive action slots" style={{ marginTop: 18 }}>
        <div className="sod29-section-head">
          <div>
            <div className="sod29-kicker">ADAPTIVE ACTION SLOTS</div>
            <h2>אותו ממצא · עומקים שונים</h2>
          </div>
          <span className="sod29-chip">NO EXPENSIVE I/O</span>
        </div>
        <div className="sod29-actions" style={{ flexWrap: "wrap" }}>
          <span className="sod29-chip">Raziel · BUILDING</span>
          <span className="sod29-chip">Neighborhood · BUILDING</span>
          <span className="sod29-chip">Axis Continuation · BUILDING</span>
          <span className="sod29-chip">Spatial · BUILDING</span>
          <span className="sod29-chip">Deep Research · BUILDING</span>
        </div>
        <p className="sod29-muted" style={{ marginTop: 12 }}>
          Neighborhood / Axis Continuation נשמרים כאן כנקודות הרחבה בלבד. חוקי האינטליגנציה שלהם ייקבעו מאוחר יותר מתוך דוגמאות מחקר אמיתיות, בלי לחסום את G3.
        </p>
      </section>
    </section>
  </Sod2029Shell>;
}
