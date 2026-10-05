import React, { useEffect, useMemo, useState } from "react";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import Els2029Representation from "../components/experience2029/Els2029Representation.jsx";
import ElsMatrixProfileSwitch from "../components/experience2029/ElsMatrixProfileSwitch.jsx";
import TzofenEmbed from "../components/TzofenEmbed.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { supabase } from "../lib/supabase.js";
import { buildEls2029ReplayRequest, els2029ReplaySelectionKey, verifyEls2029Selection } from "../lib/research/els2029ReplayClient.js";
import { projectEls2029Result } from "../lib/research/els2029Projection.js";
import { projectEls2029Layers } from "../lib/research/els2029Layers.js";
import { buildElsRazielSurfaceContext } from "../lib/research/elsRazielContext.js";
import { ELS_MATRIX_PROFILE, projectElsMatrixProfile } from "../lib/research/els2029MatrixMode.js";
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


function ElsRazielEntry({ researchContext, projection, layers, ready }) {
  const shell = use2029Shell();
  const surfaceContext = useMemo(
    () => ready
      ? buildElsRazielSurfaceContext({ researchContext, projection, layers })
      : null,
    [ready, researchContext, projection, layers]
  );
  const available = Boolean(surfaceContext?.occurrence?.occurrenceRef);

  return <button
    className={available ? "sod29-action primary" : "sod29-action"}
    type="button"
    disabled={!available}
    data-els-raziel-entry={available ? "context-ready" : "building"}
    onClick={() => {
      if (!available) return;
      shell.openRaziel({
        razielMicroIntent: "explain_els_occurrence",
        elsSurfaceContext: surfaceContext,
      });
    }}
    title={available
      ? "פתח את אותו רזיאל עם context של המופע המאומת"
      : "רזיאל יקבל context רק אחרי exact replay מאומת"}
  >
    {available ? "✦ רזיאל · פתח על הממצא" : "✦ רזיאל · ממתין למופע מאומת"}
  </button>;
}

export default function Els2029Page() {
  const research = useResearch();
  const elsState = useFeatureState("lock_els");
  const context = research.context || null;
  const subject = context?.subject || null;
  const selection = context?.selection || null;
  const elsSelection = selection?.entityType === "els";
  const locator = elsSelection ? clean(selection?.locator) : "";
  const journey = context?.journey || null;
  const replayRequest = useMemo(() => buildEls2029ReplayRequest(selection), [selection]);
  const replayKey = useMemo(() => els2029ReplaySelectionKey(selection), [selection]);
  const [replay, setReplay] = useState({
    loading: false,
    state: "CONTEXT_REQUIRED",
    result: null,
    traceId: null,
    error: null,
  });
  const [matrixProfile, setMatrixProfile] = useState(ELS_MATRIX_PROFILE.RESEARCH);
  // Stable entry seed only. Once Classic is live, the canonical tzofen state flows into ResearchProvider
  // and becomes the replayable 2029 selection; do not remount the tool on every context update.
  const [classicSeed] = useState(() => clean(selection?.term || subject?.label || ""));

  useEffect(() => {
    if (elsState.loading || elsState.blocked || !replayKey) {
      setReplay({ loading: false, state: "CONTEXT_REQUIRED", result: null, traceId: null, error: null });
      return undefined;
    }

    let alive = true;
    setReplay({ loading: true, state: "VERIFYING", result: null, traceId: null, error: null });
    verifyEls2029Selection(selection, (body) => supabase.functions.invoke("els-search-bridge", { body }))
      .then((verified) => {
        if (!alive) return;
        setReplay({
          loading: false,
          state: verified.state,
          result: verified.result,
          traceId: verified.traceId,
          error: verified.error,
        });
      })
      .catch((error) => {
        if (!alive) return;
        setReplay({
          loading: false,
          state: "FAILED",
          result: null,
          traceId: null,
          error: String(error?.message || error || "bridge_error"),
        });
      });
    return () => { alive = false; };
  }, [replayKey, elsState.loading, elsState.blocked]); // replayKey fully identifies the bounded request

  const replayProjection = useMemo(
    () => projectEls2029Result(replay.result),
    [replay.result]
  );
  const replayLayers = useMemo(
    () => projectEls2029Layers(replayProjection),
    [replayProjection]
  );
  const exactReplayReady = Boolean(replayRequest);
  const replayMatched = replay.state === "MATCH";
  const layeredReady = replayLayers?.contract === "els_2029_layers_v1"
    && Array.isArray(replayLayers.layers)
    && replayLayers.layers.length > 0;
  const profileModel = useMemo(() => projectElsMatrixProfile({
    profile: matrixProfile,
    replayMatched,
    researchSignal: layeredReady ? "WARM" : "COLD",
    razielAvailable: replayMatched && layeredReady,
  }), [matrixProfile, replayMatched, layeredReady]);
  const researchProfile = profileModel.profile === ELS_MATRIX_PROFILE.RESEARCH;

  useEffect(() => {
    applySeo({ title: "ELS · SOD1820", description: "ELS 2029 · Research Context, exact locus and replay-ready projection", path: "/els" });
    research.updateResearchContext?.({ lens: "els" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (elsState.loading) {
    return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="ONE ELS ENGINE · MANY PROJECTIONS" title="ELS" description="טוען את מצב היכולת הקנוני…">
      <FrameState kind="loading" title="טוען את מצב ELS" progress={{ phase: "בודק את מצב היכולת הקנוני", compact: true }}>המערכת מוודאת שהיכולת זמינה לפני פתיחת סביבת המחקר.</FrameState>
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
          <div className="sod29-kicker">{researchProfile ? "CURRENT RESEARCH CONTEXT" : "CLASSIC 2029 · FULL TOOL"}</div>
          <h2>{researchProfile
            ? (subject?.label ? "מחקר ELS סביב " + subject.label : "ELS מחכה להקשר מחקר")
            : "הצופן הקלאסי · בתוך 2029"}</h2>
          <div className="sod29-muted">
            {researchProfile
              ? (subject
                ? "הנושא מגיע מאותו Research Context של World / Number / Heichal / Journey. בחירת מופע אינה יוצרת זהות חדשה."
                : "פתח ELS מתוך Number, World, Heichal, Journey או מקור אחר כדי לשמור רצף מחקר.")
              : "אותו ממשק עבודה מוכר: חיפוש, מטריצת אותיות, הצלבות, המשך פסוק, סימוני הצבע בצד, שמירות ושיתוף. המעבר למחקר שומר את אותו ממצא בתוך אותו Research Context."}
          </div>
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <ElsMatrixProfileSwitch profile={matrixProfile} onChange={setMatrixProfile} />
          <span className="sod29-chip">{subject ? "CONTEXT READY" : "CONTEXT REQUIRED"}</span>
        </div>
      </div>

      {researchProfile ? <div className="sod29-els-architecture">
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
                label="Exact replay request"
                value={
                  !exactReplayReady ? "נדרש term + corpus + start + skip + direction"
                    : replay.loading ? "מאמת occurrence מול המנוע הקנוני…"
                    : replayMatched ? "MATCH · occurrence אומת בשרת"
                    : replay.state === "CONTEXT_REQUIRED" ? "מוכן לאימות כשיגיע locus מלא"
                    : replay.state + (replay.error ? " · " + replay.error : "")
                }
                state={replayMatched ? "ready" : "building"}
              />
              <StateRow
                label={researchProfile ? "2D / 2.5D projection feed" : "Classic 2D projection"}
                value={layeredReady ? (researchProfile ? "canonical replay → projection → layers → renderer" : "אותו replay מאומת · תצוגה ישירה ללא הרחבת מחקר") : "אין occurrence מאומת להקרנה"}
                state={layeredReady ? "ready" : "building"}
              />
              <StateRow
                label="Journey continuity"
                value={journey?.id ? "פעיל · " + (clean(journey.kind) || "journey") : "אותו Research Context מוכן למסלול"}
                state={journey?.id ? "ready" : "building"}
              />
            </div>

            <Els2029Representation layers={replayLayers} profile={matrixProfile} />
          </div>
        </div>

        {researchProfile ?         <aside className="sod29-inspector">
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
        </aside> : null}
      </div> : null}

      <section
        className="sod29-section"
        aria-label="ELS Classic full workspace"
        data-els-classic-2029="faithful-port-v1"
        aria-hidden={researchProfile}
        style={{ marginTop: 18, display: researchProfile ? "none" : "block", padding: 0, overflow: "hidden" }}
      >
        <div style={{ padding: "16px 18px 0" }}>
          <div className="sod29-section-head">
            <div>
              <div className="sod29-kicker">CLASSIC · FAITHFUL PORT</div>
              <h2>הממשק הקלאסי המלא</h2>
              <div className="sod29-muted">המשך הפסוק · סימוני צבע בצד · חיפוש מוצלב · שמירות · שיתוף · אותה מטריצה. הכלי נשאר mounted גם במעבר למחקר, כדי לא לאבד את מצב העבודה.</div>
            </div>
            <div className="sod29-actions" style={{ flexWrap: "wrap" }}>
              <span className="sod29-chip">ONE ENGINE</span>
              <span className="sod29-chip">SAME STATE</span>
              <span className="sod29-chip">NO LEGACY ROUTE</span>
            </div>
          </div>
        </div>
        {/* Faithful Classic presentation lives inside /els. The canonical tool emits governed state;
            ResearchProvider converts that state to an exact-replay selection for the Research profile. */}
        <div data-els-classic-tool="canonical-tzofen">
          <TzofenEmbed seed={classicSeed || undefined} full />
        </div>
      </section>

      {researchProfile ?       <section className="sod29-section" aria-label="ELS adaptive action slots" style={{ marginTop: 18 }}>
        <div className="sod29-section-head">
          <div>
            <div className="sod29-kicker">ADAPTIVE ACTION SLOTS</div>
            <h2>אותו ממצא · עומקים שונים</h2>
          </div>
          <span className="sod29-chip">NO EXPENSIVE I/O</span>
        </div>
        <div className="sod29-actions" style={{ flexWrap: "wrap" }}>
          <ElsRazielEntry
            researchContext={context}
            projection={replayProjection}
            layers={replayLayers}
            ready={replayMatched && layeredReady}
          />
          <span className="sod29-chip">Neighborhood · BUILDING</span>
          <span className="sod29-chip">Axis Continuation · BUILDING</span>
          <span className="sod29-chip">Spatial · BUILDING</span>
          <span className="sod29-chip">Deep Research · BUILDING</span>
        </div>
        <p className="sod29-muted" style={{ marginTop: 12 }}>
          Neighborhood / Axis Continuation נשמרים כאן כנקודות הרחבה בלבד. חוקי האינטליגנציה שלהם ייקבעו מאוחר יותר מתוך דוגמאות מחקר אמיתיות, בלי לחסום את G3.
        </p>
      </section> : null}
    </section>
  </Sod2029Shell>;
}
