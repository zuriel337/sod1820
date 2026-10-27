import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import Els2029Representation from "../components/experience2029/Els2029Representation.jsx";
import ElsMatrixProfileSwitch from "../components/experience2029/ElsMatrixProfileSwitch.jsx";
import ElsNativeClassic2029 from "../components/experience2029/ElsNativeClassic2029.jsx";
import ElsResearchBar2029 from "../components/experience2029/ElsResearchBar2029.jsx";
import ElsAdvancedSearch2029 from "../components/experience2029/ElsAdvancedSearch2029.jsx";
import ElsGuidedDiscovery2029 from "../components/experience2029/ElsGuidedDiscovery2029.jsx";
import "../components/experience2029/els2029-research.css";
import ElsSavedLibrary2029, { ElsRecentCiphers2029 } from "../components/experience2029/ElsSavedLibrary2029.jsx";
import { getMatrixBySlug, getMatrixById } from "../lib/elsMatrices.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { hasExactSavedMatrix, savedMatrixWorkspaceHref } from "../lib/elsSavedMatrix.js";
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
import { useElsJourneyReopen } from "../lib/research/useElsJourneyReopen.js";
import { useOptionalRazielSession2029 } from "../components/experience2029/RazielSessionMount2029.jsx";

const clean = (value) => String(value ?? "").trim();
const ELS_DESCRIPTION = "חפשו דילוגי אותיות, קראו את המקור ושמרו ממצאים להמשך מחקר.";

function StateRow({ label, value, state = "ready" }) {
  return <div className="sod29-state" data-state={state}>
    <small>{label}</small>
    <b>{value}</b>
  </div>;
}


function ElsRazielEntry({ researchContext, projection, layers, planSummary, ready }) {
  const shell = use2029Shell();
  const surfaceContext = useMemo(
    () => ready
      ? buildElsRazielSurfaceContext({ researchContext, projection, layers, planSummary })
      : null,
    [ready, researchContext, projection, layers, planSummary]
  );
  const available = Boolean(surfaceContext?.occurrence?.occurrenceRef);

  return <button
    className={available && !shell.razielLocked ? "sod29-action primary" : "sod29-action"}
    type="button"
    disabled={!available || shell.razielLocked}
    data-els-raziel-entry={shell.razielLocked ? "locked" : available ? "context-ready" : "building"}
    onClick={() => {
      if (!available) return;
      shell.openRaziel({
        razielMicroIntent: "explain_els_occurrence",
        elsSurfaceContext: surfaceContext,
      });
    }}
    title={shell.razielLocked ? "רזיאל נעול עד השלמת ההגדרה והאימות" : available
      ? "פתח את אותו רזיאל עם context של המופע המאומת"
      : "רזיאל יקבל context רק אחרי exact replay מאומת"}
  >
    {shell.razielLocked ? "✦ רזיאל · נעול" : available ? "✦ רזיאל · פתח על הממצא" : "✦ רזיאל · ממתין למופע מאומת"}
  </button>;
}

function ElsResearchBarConnected({ researchContext, projection, layers, planSummary, replay, ready, subject, locator, onLibrary, profileSwitch }) {
  const shell = use2029Shell();
  const surfaceContext = useMemo(
    () => ready ? buildElsRazielSurfaceContext({ researchContext, projection, layers, planSummary }) : null,
    [ready, researchContext, projection, layers, planSummary]
  );
  const available = Boolean(surfaceContext?.occurrence?.occurrenceRef);
  return <ElsResearchBar2029
    subjectLabel={subject?.label}
    locator={locator}
    replay={replay}
    razielAvailable={available}
    onRaziel={() => shell.openRaziel({ razielMicroIntent: "explain_els_occurrence", elsSurfaceContext: surfaceContext })}
    onLibrary={() => onLibrary("public")}
    onMine={() => onLibrary("mine")}
    profileSwitch={profileSwitch}
  />;
}

export default function Els2029Page({ previewAdvanced = false }) {
  const research = useResearch();
  const razielSession = useOptionalRazielSession2029();
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const library = params.get("library");
  const [workspaceVisited, setWorkspaceVisited] = useState(!library);
  const [searchRevision, setSearchRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [openRevision, setOpenRevision] = useState(0);
  useEffect(() => { if (!library) setWorkspaceVisited(true); }, [library]);
  const showLibrary = view => setParams(current => { const next = new URLSearchParams(current);next.set("library", view);return next; });
  const closeLibrary = () => setParams(current => { const next = new URLSearchParams(current);next.delete("library");return next; });
  const openCipher = row => { setOpenRevision(value => value + 1);setParams(new URLSearchParams(savedMatrixWorkspaceHref(row).split("?")[1])); };
  const cipherSlug = params.get("cipher");
  const recordId = params.get("record");
  const directSavedOpen = Boolean(cipherSlug || recordId);
  const findingId = params.get("finding") || "";
  const { journeyLoad: findingJourneyLoad, status: findingStatus } = useElsJourneyReopen(findingId);
  const [findingNotice, setFindingNotice] = useState("");
  useEffect(() => {
    setFindingNotice("");
    if (!findingId || ["none", "ok", "not-els"].includes(findingStatus)) return undefined;
    const timer = setTimeout(() => setFindingNotice(findingStatus === "not-found"
      ? "הממצא לא נמצא בסביבת המחקר שלך."
      : "לא נשמר מיקום מדויק לממצא הזה — אפשר לחפש את המונח מחדש."), 1200);
    return () => clearTimeout(timer);
  }, [findingId, findingStatus]);
  const recordKey = `${authLoading ? "loading" : user?.id || "guest"}|${cipherSlug || ""}|${recordId || ""}|${openRevision}`;
  const [recordState, setSavedRecord] = useState({ key: null, row: null, error: false });
  // Hide the previous account/URL's record during the render that precedes the next fetch.
  const savedRecord = recordState.key === recordKey ? recordState
    : { loading: Boolean(cipherSlug || recordId), row: null, error: false };
  useEffect(() => {
    let alive = true;
    if (!cipherSlug && !recordId) { setSavedRecord({ key: recordKey, loading: false, row: null, error: false });return; }
    setSavedRecord({ key: recordKey, loading: true, row: null, error: false });
    if (authLoading) return;
    (cipherSlug ? getMatrixBySlug(cipherSlug) : getMatrixById(recordId))
      .then(row => { if (alive) setSavedRecord({ key: recordKey, loading: false, row, error: !row }); })
      .catch(() => { if (alive) setSavedRecord({ key: recordKey, loading: false, row: null, error: true }); });
    return () => { alive = false; };
  }, [recordKey]);
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
  // Three projections share the same mounted engine. Entering or switching a mode never
  // starts a scan or an AI call; Guided starts only on its explicit submit.
  const [matrixProfile, setMatrixProfile] = useState(() => {
    const requested = clean(params.get("mode")).toLowerCase();
    if (requested === "classic" || directSavedOpen) return ELS_MATRIX_PROFILE.CLASSIC;
    if (requested === "research" || previewAdvanced) return ELS_MATRIX_PROFILE.RESEARCH;
    return ELS_MATRIX_PROFILE.GUIDED;
  });
  useEffect(() => {
    if (directSavedOpen) setMatrixProfile(ELS_MATRIX_PROFILE.CLASSIC);
  }, [directSavedOpen]);
  const [researchLoad, setResearchLoad] = useState(null);
  const [researchProbe, setResearchProbe] = useState(null);
  const [exactStatus, setExactStatus] = useState("idle");
  const [automaticSummary, setAutomaticSummary] = useState(null);
  const pendingProbeRef = useRef(null);
  const [formsPreviewRequest, setFormsPreviewRequest] = useState(null);
  const formsRequestSeq = useRef(0);
  const pendingFormsRef = useRef(new Map());
  useEffect(() => () => {
    for (const pending of pendingFormsRef.current.values()) { clearTimeout(pending.timer); pending.reject(new Error("forms_preview_cancelled")); }
    pendingFormsRef.current.clear();
  }, []);
  const deriveCanonicalForms = expressions => new Promise((resolve, reject) => {
    const requestId = ++formsRequestSeq.current;
    const timer = setTimeout(() => {
      pendingFormsRef.current.delete(requestId);
      setFormsPreviewRequest(current => current?.requestId === requestId ? null : current);
      reject(new Error("forms_preview_timeout"));
    }, 6000);
    pendingFormsRef.current.set(requestId, { resolve, reject, timer });
    setFormsPreviewRequest({ requestId, expressions });
  });
  const receiveFormsPreview = result => {
    const pending = pendingFormsRef.current.get(result?.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingFormsRef.current.delete(result.requestId);
    setFormsPreviewRequest(null);
    pending.resolve(Array.isArray(result.rows) ? result.rows : []);
  };
  useEffect(() => { setResearchLoad(null); setResearchProbe(null); setExactStatus("idle"); setAutomaticSummary(null); pendingProbeRef.current = null; }, [cipherSlug, recordId]);
  const requestExactSkip = request => {
    pendingProbeRef.current = request.requestId;
    setExactStatus("probing");
    setResearchProbe(request);
  };
  const receiveExactSkip = result => {
    if (result.requestId !== pendingProbeRef.current) return;
    pendingProbeRef.current = null;
    setResearchProbe(null);
    if (!result.ok || !Number.isSafeInteger(result.start) || ![1, -1].includes(result.dir) || !result.corpusId) {
      setExactStatus("failed"); return;
    }
    setExactStatus("verified");
    setResearchLoad({ term: result.term, scope: result.scope, skip: result.skip, dir: result.dir,
      start: result.start, hitId: result.hitId, corpusId: result.corpusId, words: [], researchNonce: result.requestId });
  };
  // Stable entry seed only. Once Classic is live, the canonical tzofen state flows into ResearchProvider
  // and becomes the replayable 2029 selection; do not remount the tool on every context update.
  const [classicSeed] = useState(() => clean(params.get("term") || params.get("q") || selection?.term || subject?.label || ""));
  const legacySkip = Number(params.get("skip"));
  const legacyMatrix = classicSeed && Number.isSafeInteger(legacySkip) && Math.abs(legacySkip) >= 2
    ? { search_term: classicSeed, skip_distance: legacySkip, scope: params.get("scope") === "tanakh" ? "tanakh" : "torah", positions: null }
    : null;

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
  const guidedProfile = profileModel.profile === ELS_MATRIX_PROFILE.GUIDED;
  const advancedResearchProfile = profileModel.profile === ELS_MATRIX_PROFILE.RESEARCH;
  const researchProfile = profileModel.profile !== ELS_MATRIX_PROFILE.CLASSIC;
  const guidedRunActive = guidedProfile && researchLoad?.guidedDiscovery === true;

  useEffect(() => {
    applySeo({ title: "ELS · SOD1820", description: "חיפוש צפנים בתנ״ך, מטריצות וממצאים שמורים", path: "/code" });
    research.updateResearchContext?.({ lens: "els" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (elsState.loading) {
    return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="הצופן התנ״כי · חיפוש ומחקר" title="ELS" description={ELS_DESCRIPTION}>
      <FrameState kind="loading" title="טוען את מצב ELS" progress={{ phase: "בודק את מצב היכולת הקנוני", compact: true }}>המערכת מוודאת שהיכולת זמינה לפני פתיחת סביבת המחקר.</FrameState>
    </Sod2029Shell>;
  }

  if (elsState.blocked) {
    return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="הצופן התנ״כי · חיפוש ומחקר" title="ELS" description={ELS_DESCRIPTION}>
      <FeatureClosedNotice state={elsState} title="ELS" to="/world" />
    </Sod2029Shell>;
  }

  return <Sod2029Shell
    introVariant={library ? "none" : "compact"}
    wide
    surface="els"
    symbol="✦"
    eyebrow="הצופן התנ״כי · חיפוש ומחקר"
    title="ELS"
    description={ELS_DESCRIPTION}
  >
    {library ? <ElsSavedLibrary2029 view={library === "mine" ? "mine" : "public"}
      onView={showLibrary} onClose={closeLibrary} onOpen={openCipher} /> : null}
    {workspaceVisited && (!library || !savedRecord.error) ? savedRecord.loading ? <FrameState kind="loading" title="טוען את הצופן השמור">הממצאים והגדרות המטריצה נטענים.</FrameState>
      : savedRecord.error ? <FrameState kind="error" title="הצופן אינו זמין">ייתכן שהקישור אינו נכון או שנדרשת התחברות לחשבון ששמר אותו. <button type="button" className="sod29-action" onClick={() => showLibrary("mine")}>הצפנים שלי</button></FrameState>
      : <div hidden={!!library}>
    {findingNotice ? <p role="status">{findingNotice}</p> : null}
    <nav className="els29-mode-selector" aria-label="מצבי הצופן התנ״כי">
      <div><small>סביבת עבודה</small><strong>{guidedProfile ? "גילוי מודרך" : advancedResearchProfile ? "מחקר" : "קלאסי"}</strong></div>
      <ElsMatrixProfileSwitch profile={matrixProfile} onChange={setMatrixProfile} />
      {savedRecord.row ? <button className="sod29-action" type="button" onClick={() => { setMatrixProfile(ELS_MATRIX_PROFILE.GUIDED);setParams({}); }}>חיפוש חדש</button> : null}
    </nav>
    {savedRecord.row ? <section className="els29-saved-record" aria-label="פרטי הצופן השמור">
      <h2>{savedRecord.row.title || savedRecord.row.search_term}</h2>
      {savedRecord.row.description ? <p>{savedRecord.row.description}</p> : null}
      {!hasExactSavedMatrix(savedRecord.row) ? <>
        <p role="status">צופן ותיק: המיקום המקורי לא נשמר במלואו. המטריצה מחפשת מחדש לפי המונח והדילוג; היא אינה שחזור מדויק של התמונה הישנה.</p>
        {savedRecord.row.image_url ? <details><summary>התמונה המקורית שנשמרה</summary><img src={savedRecord.row.image_url} alt="התמונה המקורית של הצופן השמור" /></details> : null}
      </> : null}
    </section> : null}
    {!guidedProfile ? <ElsRecentCiphers2029 onOpen={openCipher} onLibrary={showLibrary} collapseSignal={searchRevision} revision={savedRevision} enabled={!library} /> : null}
    <div className="els29-guided-workspace" data-els-guided-workspace="separate-v1" data-run-state={guidedRunActive ? "active" : "entry"}
      data-els-guided-tools="single-window-v1" hidden={!guidedProfile || directSavedOpen}>
      <ElsGuidedDiscovery2029 onPlanSummary={setAutomaticSummary}
        onPlan={({ story, scope }) => razielSession?.submitElsGuidedPlan
          ? razielSession.submitElsGuidedPlan({ story, scope })
          : Promise.resolve({ ok: false, error: "raziel_session_unavailable" })}
        onReset={() => setResearchLoad(current => current?.guidedDiscovery === true ? null : current)}
        onLoad={item => { pendingProbeRef.current = null; setResearchProbe(null); setExactStatus("idle"); setResearchLoad(item); }} />
      <aside className="els29-guided-promise" aria-label="מה יחזור מהגילוי" hidden={guidedRunActive}>
        <article><span>א</span><div><strong>ציר מדויק</strong><small>מופעים שאומתו — לא השערה.</small></div></article>
        <article><span>ב</span><div><strong>חיבורים חזקים</strong><small>קרבה, הקבלה וחזרה לפני רעש.</small></div></article>
        <article><span>ג</span><div><strong>מקור ופסוקים</strong><small>פתיחה וחזרה לאותו ממצא בדיוק.</small></div></article>
      </aside>
    </div>
    <div data-els-research-tools="brief-visible-v1" hidden={!advancedResearchProfile || directSavedOpen}><ElsAdvancedSearch2029 exactStatus={exactStatus} onExactSkip={requestExactSkip} deriveCanonicalForms={deriveCanonicalForms} onPlanSummary={setAutomaticSummary} onLoad={item => { pendingProbeRef.current = null; setResearchProbe(null); setExactStatus("idle"); setResearchLoad(item); }} /></div>
    <section className={`sod29-focus-stage${guidedProfile ? " els29-guided-result-stage" : ""}`} data-els-2029-surface="v1"
      hidden={guidedProfile && !directSavedOpen && researchLoad?.guidedDiscovery !== true}
      {...(researchProfile ? { "data-els-research-composition": "v1" } : {})}
      {...(guidedProfile ? { "data-els-guided-composition": "v1" } : {})}>
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">{guidedProfile ? "גילוי מודרך" : advancedResearchProfile ? "סביבת המחקר" : "כלי המחקר הקלאסי"}</div>
          <h2>{researchProfile
            ? guidedProfile ? "חבילת הגילוי" : (subject?.label ? "מחקר ELS סביב " + subject.label : "מחקר דילוגי אותיות")
            : "הצופן הקלאסי"}</h2>
          <div className="sod29-muted">
            {guidedProfile
              ? "הציר, המופעים והחיבורים המאומתים נאספים כאן. המטריצה נשארת כלי בדיקה שנפתח רק לפי בקשה."
              : advancedResearchProfile ? (subject
                ? "חפשו מונח או הצלבה, עיינו במקור ושמרו את הממצאים להמשך."
                : "התחילו בחיפוש. המטריצה, הצבעים והבחירות נשמרים במעבר בין מחקר לקלאסי.")
              : "חיפוש ישיר וסימוני צבע על טקסט התורה. הממצאים נשמרים להמשך עבודה."}
          </div>
        </div>
        <span className="sod29-chip">{subject ? "הקשר מחקר פעיל" : "מוכן לחיפוש"}</span>
      </div>

      <section
        className="sod29-section els29-engine-surface"
        aria-label={guidedProfile ? "תוצאות הגילוי המודרך" : "סביבת המחקר של הצופן"}
        data-els-classic-2029="native-v1"
      >
        {/* Native Classic consumes only governed state emitted by the one canonical Tzofen engine.
            The same iframe instance remains mounted as an engine-only bridge and can be revealed
            as the parity fallback for capabilities that have not yet been ported to 2029. */}
        <ElsNativeClassic2029 initialSeed={savedRecord.row || legacyMatrix ? "" : classicSeed} matrix={savedRecord.row || legacyMatrix}
          active={!library && (!guidedProfile || researchLoad?.guidedDiscovery === true || directSavedOpen)}
          researchProfile={researchProfile} guidedProfile={guidedProfile} researchLoad={researchLoad || (savedRecord.row ? null : findingJourneyLoad)} researchProbe={researchProbe} onResearchProbeResult={receiveExactSkip} onResearchLoadError={() => setExactStatus("failed")}
          formsPreviewRequest={formsPreviewRequest} onFormsPreviewResult={receiveFormsPreview}
          onSearchStart={() => setSearchRevision(value => value + 1)} onSaved={row => {
            setSavedRevision(value => value + 1);
            if (row?.id === savedRecord.row?.id) setSavedRecord(current => ({ ...current, row }));
          }} />
      </section>

      {researchProfile && (!guidedProfile || researchLoad?.guidedDiscovery === true || savedRecord.row) ? <ElsResearchBarConnected
        researchContext={context}
        projection={replayProjection}
        layers={replayLayers}
        planSummary={automaticSummary}
        replay={replay}
        ready={replayMatched && layeredReady}
        subject={subject}
        locator={locator}
        onLibrary={showLibrary}
      /> : null}


      <details className="sod29-els-research-details" hidden={!advancedResearchProfile}>
        <summary>פרטי מחקר מתקדמים · חלק מהפעולות עדיין לא פעילות</summary>
      {advancedResearchProfile ? <div className="sod29-els-architecture">
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

        {advancedResearchProfile ?         <aside className="sod29-inspector">
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


      {advancedResearchProfile ?       <section className="sod29-section" aria-label="ELS adaptive action slots" style={{ marginTop: 18 }}>
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
            planSummary={automaticSummary}
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
      </details>
    </section>
    </div> : null}
  </Sod2029Shell>;
}
