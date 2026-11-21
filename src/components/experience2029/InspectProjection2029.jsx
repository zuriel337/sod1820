import React, { useEffect, useState } from "react";
import { FrameState } from "./SystemFrame2029.jsx";
import LearnMark2029 from "./LearnMark2029.jsx";
import { publicContextLabel, contextDisplayTitle, entityTypeNounHe } from "./razielSessionSeam2029.js";
import { buildLearnHelpSeed, emitEntryLearn, getConceptFamiliarity, getLearnFragment, isEntryLearnSurfaceActive, LEARN_LAYER, LEARN_SCOPE, markConceptFamiliarity } from "../../lib/entryLearn2029.js";
const ShareActions = React.lazy(() => import("../ShareActions.jsx"));
const SharePending2029 = () => <div className="sod-share-actions" dir="rtl" aria-hidden="true" data-share-pending="true" style={{ marginTop: 10, display: "flex", visibility: "hidden" }}><button type="button" tabIndex={-1} disabled>·</button></div>;

export default function InspectProjection({ target, context, surface = "system", onSetFocus, onSave, onAddResearch, isSaved = false, inResearch = false, onOpenNumber, onNeedHelp, shareHref = null }) {
  const [commitState, setCommitState] = useState(null);
  const numericFamily = target?.type === "number" || target?.type === "phrase";
  const hasMethodContext = Boolean(target?.expression && target?.method && Number.isSafeInteger(Number(target?.resultValue)));
  const conceptKey = hasMethodContext ? "method" : numericFamily ? "anchor" : null;
  const fragment = conceptKey && isEntryLearnSurfaceActive(surface) ? getLearnFragment(conceptKey) : null;
  const [conceptFamiliarity, setConceptFamiliarity] = useState(() => conceptKey ? getConceptFamiliarity(conceptKey) : null);

  useEffect(() => {
    setConceptFamiliarity(conceptKey ? getConceptFamiliarity(conceptKey) : null);
  }, [conceptKey]);

  if (!target) {
    return <FrameState kind="empty" title="אין כרגע משהו לבדוק">סמן ביטוי או מספר בטקסט, חפש משהו או בחר פריט. המערכת לא ממציאה חיבור שלא קיים.</FrameState>;
  }

  const openLearn = () => {
    if (!conceptKey || !fragment) return;
    const familiarity = markConceptFamiliarity(conceptKey, "seen", fragment.version);
    setConceptFamiliarity(familiarity);
    emitEntryLearn("learn_opened", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.SEE,
      manifestVersion: fragment.version,
    });
    emitEntryLearn("learn_layer", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.EXPLAIN,
      manifestVersion: fragment.version,
    });
  };

  const askForLearnHelp = () => {
    if (!conceptKey || !fragment) return;
    const tried = conceptFamiliarity?.stage === "tried";
    const learnStage = tried ? LEARN_LAYER.TRY : LEARN_LAYER.EXPLAIN;
    const actionTried = tried && numericFamily ? "open_number" : null;
    emitEntryLearn("learn_help_requested", {
      entrySurface: surface,
      conceptKey,
      layer: learnStage,
      actionId: actionTried,
      manifestVersion: fragment.version,
    });
    onNeedHelp?.({
      initialText: buildLearnHelpSeed(conceptKey),
      capability: numericFamily ? "number" : null,
      concept: conceptKey,
      learnStage,
      actionTried,
    });
  };

  const tryLearn = () => {
    if (!conceptKey || !fragment || !numericFamily) return;
    const familiarity = markConceptFamiliarity(conceptKey, hasMethodContext ? "tried" : "seen", fragment.version);
    setConceptFamiliarity(familiarity);
    emitEntryLearn(hasMethodContext ? "method_tried" : "example_tried", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.TRY,
      actionId: "open_number",
      targetSurface: "number",
      manifestVersion: fragment.version,
    });
    emitEntryLearn("continued_to_research", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.EXPLORE,
      actionId: "open_number",
      targetSurface: "number",
      manifestVersion: fragment.version,
    });
    onOpenNumber?.(target);
  };

  return (
    <>
      <section className="sod29-inspect-identity">
        <div className="sod29-kicker">{target.source === "selection" ? "בחירה זמנית" : "מוקד נוכחי"}</div>
        <strong>{publicContextLabel(target.label) || entityTypeNounHe(target.type)}</strong>
        <span>{entityTypeNounHe(target.type)}</span>
      </section>

      {target.excerpt ? <section className="sod29-inspect-excerpt" data-inspect-excerpt style={{ display: "grid", gap: 2 }}>
        {target.stateLabel ? <small>{target.stateLabel}</small> : null}
        {target.attribution ? <small>{target.attribution}</small> : null}
        <p style={{ whiteSpace: "pre-wrap", margin: "8px 0 0" }}>{target.excerpt}</p>
      </section> : null}

      {hasMethodContext ? <div className="sod29-surface-context-expression"><span>{target.expression}</span><small>{target.methodLabel || target.method}</small><b>{Number(target.resultValue)}</b></div> : null}

      {numericFamily ? (
        <FrameState title="מספר / ביטוי · בדיקה מהירה">
          הבדיקה שומרת את המקום וההקשר. אפשר לפתוח את החישוב בלי לצאת למסך אחר ובלי לאבד את הדרך חזרה.
        </FrameState>
      ) : (
        <FrameState title="בדיקה מהירה">אותה בדיקה יכולה להיפתח גם על ספר, מקור, אדם, אירוע או גילוי כשהחיבור קיים במערכת.</FrameState>
      )}

      {fragment ? <LearnMark2029
        scope={LEARN_SCOPE.CONCEPT}
        label={fragment.label}
        compact={Number(conceptFamiliarity?.v) === Number(fragment.version)}
        onOpen={openLearn}
        onStillUnclear={askForLearnHelp}
        actions={numericFamily ? <button type="button" onClick={tryLearn}>{hasMethodContext ? "ראה את החישוב" : "פתח בדף המספר"}</button> : null}
      >
        <p>{fragment.explain}</p>
        {hasMethodContext ? <p><strong>{target.expression}</strong> מוצג במוקד הפעיל בשיטה <strong>{target.method}</strong> עם תוצאה <strong>{target.resultValue}</strong>. ההסבר אינו מקור חישוב נוסף.</p> : null}
      </LearnMark2029> : null}

      <div className="sod29-panel-actions-grid">
        <button className="sod29-action primary" type="button" onClick={() => onSetFocus(target)}>⌖ התמקד בזה</button>
        <button className="sod29-action" type="button" data-inspect-action="save" aria-pressed={isSaved} onClick={() => setCommitState({ kind: "save", ok: Boolean(onSave?.(target)) })}>{isSaved ? "✓ שמור" : "＋ שמור"}</button>
        <button className="sod29-action" type="button" data-inspect-action="research" aria-pressed={inResearch} onClick={() => setCommitState({ kind: "research", ok: Boolean(onAddResearch?.(target)) })}>{inResearch ? "✓ במחקר" : "◎ למחקר"}</button>
        <button className="sod29-action" type="button" disabled title="המעקב המלא יחובר בהמשך">♢ עקוב</button>
      </div>

      {commitState && !commitState.ok ? <FrameState kind="error" title="הפעולה לא נשמרה">{commitState.kind === "save" ? "השמירה לא הושלמה" : "ההוספה למחקר לא הושלמה"} — נסה שוב.</FrameState> : null}

      {/* The same public page link as "עוד → שיתוף" (framePublicShareHref: account paths, claim/dm and return addresses never travel), with the
          page's own title (ShareActions); on a page with no public link there is nothing to share here. */}
      {shareHref ? <div className="sod29-canonical-share" data-share-owner="ShareActions">
        <React.Suspense fallback={<SharePending2029 />}>
          <ShareActions
            type={target.type || "page"}
            url={shareHref}
            channels={["native", "copy"]}
            compact
            force
            style={{ marginTop: 10 }}
          />
        </React.Suspense>
      </div> : null}

      <div className="sod29-panel-context-card">
        <b>ההקשר שלך</b>
        <span>{context?.subject ? contextDisplayTitle(context) || "ההקשר הנוכחי" : "אין מוקד פעיל"}</span>
        <small>בחירה זמנית אינה הופכת חיבור לעובדה.</small>
      </div>
    </>
  );
}
