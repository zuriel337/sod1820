import React, { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";
import "./gematriaCard.css";

const EXCEPTION_LABELS = Object.freeze({
  composite: "מורכב",
  equivalent: "שקול",
  derived: "נגזר",
  contextual: "הקשרי",
  candidate: "מועמד",
  unverified: "לא נבדק",
  mismatch: "אי־התאמה",
  unavailable: "לא זמין",
});

const FAMILY_ORDER = Object.freeze(["base", "depth", "composite", "contextual", "other"]);
const COMPACT_METHOD_LIMIT = 4;

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function fmtNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("he-IL") : "—";
}

function methodLabel(method) {
  return method?.publicLabel || method?.methodKey || "שיטה";
}

function relationLabel(summary) {
  const leading = summary?.leadingRelation;
  const from = leading?.from ?? leading?.source ?? leading?.a ?? null;
  const to = leading?.to ?? leading?.target ?? leading?.b ?? null;
  if (from != null && to != null) return `${from} ↔ ${to} · המשך במסע`;

  const count = Number(summary?.count || 0);
  if (count > 0 && summary?.journeyAvailable) return `${count} חיבורים · מסע זמין`;
  if (count > 0) return `${count} חיבורים`;
  if (summary?.journeyAvailable) return "מסע זמין";
  return "";
}

function paletteVars(P) {
  return {
    "--gc-panel": P.card,
    "--gc-panel-soft": P.cardSoft,
    "--gc-panel-grad": P.cardGrad,
    "--gc-line": P.border,
    "--gc-line-strong": P.borderStrong,
    "--gc-ink": P.ink,
    "--gc-muted": P.inkSoft,
    "--gc-accent": P.accent,
    "--gc-accent-text": P.accentText,
    "--gc-accent-dim": P.accentDim,
    "--gc-hero": P.heroNum,
    "--gc-glow": P.glow,
    "--gc-accent-btn": P.accentBtn,
    "--gc-on-accent": P.onAccent,
    "--gc-font-ui": F.ui,
    "--gc-font-body": F.body,
    "--gc-font-numeric": F.numeric,
  };
}

function MethodTile({ method, active, onSelect, compact = false }) {
  const clickable = typeof onSelect === "function" && method?.methodKey;
  return (
    <button
      type="button"
      className={cx(
        compact ? "sod-gematria-card__method-chip" : "sod-gematria-card__method",
        active && "is-active",
      )}
      onClick={clickable ? () => onSelect(method.methodKey) : undefined}
      disabled={!clickable}
      aria-pressed={active || undefined}
      data-method-key={method?.methodKey || ""}
    >
      <span>{methodLabel(method)}</span>
      <strong>{fmtNumber(method?.value)}</strong>
      {!compact && method?.exceptionalState && (
        <small>{EXCEPTION_LABELS[method.exceptionalState] || method.exceptionalState}</small>
      )}
    </button>
  );
}

function EvidenceSummary({ evidence }) {
  if (!evidence?.hasGovernedClassification) return null;
  const independent = Number(evidence.independentMethodCount || 0);
  const dependent = Number(evidence.dependentMethodCount || 0);
  return (
    <div className="sod-gematria-card__evidence" aria-label="סיווג תלות בין השיטות">
      <span><b>{independent}</b> שיטות עצמאיות</span>
      {dependent > 0 && <span>+ {dependent} נגזרות/תלויות</span>}
    </div>
  );
}

function ExpressionDependencySignal({ evidence }) {
  const dependent = Number(evidence?.dependentExpressionPhraseCount);
  if (!evidence?.available || !Number.isSafeInteger(dependent) || dependent <= 0) return null;

  return (
    <span
      className="sod-gematria-card__dependency-signal"
      aria-label={`${dependent} התאמות תלויות אינן מוסיפות משקל ראייתי חדש`}
    >
      <b>{dependent}</b> התאמות תלויות
    </span>
  );
}

function ExpressionEvidenceSummary({ evidence }) {
  if (!evidence?.available) return null;

  const raw = Number.isSafeInteger(Number(evidence.rawPhraseCount))
    ? Number(evidence.rawPhraseCount)
    : null;
  const independent = Number.isSafeInteger(Number(evidence.independentPhraseCount))
    ? Number(evidence.independentPhraseCount)
    : null;
  const dependent = Number.isSafeInteger(Number(evidence.dependentExpressionPhraseCount))
    ? Number(evidence.dependentExpressionPhraseCount)
    : null;

  if (raw == null && independent == null && dependent == null) return null;

  return (
    <div className="sod-gematria-card__expression-evidence" aria-label="נרמול אמינות בין ביטויים">
      <div>
        <span>משקל מחקרי מנורמל</span>
        <strong>
          {independent != null
            ? `${independent} קבוצות ביטוי עצמאיות`
            : raw != null
              ? `${raw} ביטויים`
              : "נרמול זמין"}
        </strong>
      </div>
      <div className="sod-gematria-card__expression-evidence-counts">
        {raw != null && <span><b>{raw}</b> ביטויים נמצאו</span>}
        {dependent != null && dependent > 0 && (
          <span><b>{dependent}</b> לא מוסיפים משקל חדש</span>
        )}
      </div>
    </div>
  );
}

function PeerExpressions({ peers = [], compact = false }) {
  const verified = peers.filter((peer) => peer?.verified === true);
  if (!verified.length) return null;

  if (compact) {
    return (
      <div className="sod-gematria-card__peer-strip" aria-label="ביטויים באותו ערך">
        <span className="sod-gematria-card__peer-strip-label">≡ {verified.length} ביטויים · אותו ערך</span>
        <div>
          {verified.map((peer) => <b key={peer.expression}>{peer.expression}</b>)}
        </div>
      </div>
    );
  }

  return (
    <section className="sod-gematria-card__peers" aria-label="ביטויים באותו ערך">
      <div className="sod-gematria-card__peers-head">
        <span>ביטויים באותו ערך</span>
        <strong>{verified.length} ביטויים מאומתים</strong>
      </div>
      <div className="sod-gematria-card__peer-list">
        {verified.map((peer) => (
          <span key={`${peer.expression}:${peer.methodKey || ""}:${peer.value ?? ""}`}>
            <b>{peer.expression}</b>
            <small>{peer.methodKey || "שיטה"} · {fmtNumber(peer.value)}</small>
          </span>
        ))}
      </div>
    </section>
  );
}

function SameValueNote({ model }) {
  const active = model?.activeMethod;
  if (!active || active.value == null) return null;
  const group = (model?.valueGroups || []).find((item) => item?.value === active.value);
  if (!group?.hasMultipleMethods) return null;

  const others = (group.methods || []).filter((method) => method.methodKey !== active.methodKey);
  if (!others.length) return null;

  return (
    <div className="sod-gematria-card__same-value">
      <span>אותו ערך מתקבל גם ב:</span>
      <strong>{others.map(methodLabel).join(" · ")}</strong>
    </div>
  );
}

function FamilyMethods({ group, activeMethodKey, onMethodSelect }) {
  if (!group?.methods?.length) return null;
  return (
    <section className="sod-gematria-card__family" aria-label={group.label}>
      <h4>{group.label}</h4>
      <div className="sod-gematria-card__method-grid">
        {group.methods.map((method) => (
          <MethodTile
            key={method.methodKey}
            method={method}
            active={method.methodKey === activeMethodKey}
            onSelect={onMethodSelect}
          />
        ))}
      </div>
    </section>
  );
}

function ExplorerDialog({
  open,
  panelId,
  titleId,
  expression,
  model,
  active,
  familyGroups,
  methods,
  onClose,
  onMethodSelect,
  onOpenJourney,
  onOpenTrace,
  onOpenFull,
  styleVars,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const relationText = relationLabel(model?.relationsSummary);

  return createPortal(
    <div className="sod-gematria-card__explorer-backdrop" style={styleVars} onMouseDown={onClose}>
      <section
        id={panelId}
        className="sod-gematria-card__explorer-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <header className="sod-gematria-card__explorer-head">
          <div>
            <span>METHOD EXPLORER</span>
            <strong id={titleId}>{expression || "כל השיטות"}</strong>
            <small>{methods.length} שיטות זמינות בתצוגה הנוכחית</small>
          </div>
          <button type="button" onClick={onClose} aria-label="סגור את כל השיטות">×</button>
        </header>

        <div className="sod-gematria-card__families">
          {familyGroups.map((group) => (
            <FamilyMethods
              key={group.key}
              group={group}
              activeMethodKey={active.methodKey}
              onMethodSelect={onMethodSelect}
            />
          ))}
        </div>

        <EvidenceSummary evidence={model.evidence} />
        <ExpressionEvidenceSummary evidence={model.expressionEvidence} />
        <PeerExpressions peers={model.peerExpressions} />
        <SameValueNote model={model} />

        {model?.normalization?.visibleNoticeNeeded && (
          <div className="sod-gematria-card__notice">
            <span>נרמול חישוב</span>
            <strong>{model.normalization.raw} → {model.normalization.normalized}</strong>
          </div>
        )}

        <div className="sod-gematria-card__deep-grid">
          {relationText && (
            <section>
              <span>חיבורים ומסע</span>
              <strong>{relationText}</strong>
              {model?.relationsSummary?.journeyAvailable && (
                <button
                  type="button"
                  onClick={onOpenJourney}
                  disabled={typeof onOpenJourney !== "function"}
                >
                  המשך במסע
                </button>
              )}
            </section>
          )}

          <section>
            <span>איך מחשבים?</span>
            <strong>{model?.trace?.available ? "Trace קנוני זמין" : "פירוט החישוב זמין בעומק"}</strong>
            <button
              type="button"
              onClick={onOpenTrace}
              disabled={!model?.trace?.available || typeof onOpenTrace !== "function"}
            >
              פתח Trace
            </button>
          </section>
        </div>

        <footer className="sod-gematria-card__explorer-footer">
          <div>
            <span>{methodLabel(active)}</span>
            <strong>{fmtNumber(active.value)}</strong>
          </div>
          <button
            type="button"
            className="is-primary"
            onClick={onOpenFull}
            disabled={typeof onOpenFull !== "function"}
          >
            פתח בדף המלא
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export default function GematriaCard({
  model,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  onMethodSelect,
  onOpenFull,
  onOpenJourney,
  onOpenTrace,
  onLearn,
  onRaziel,
  className = "",
  style = null,
  surface = "default",
}) {
  const P = usePalette();
  const panelId = useId();
  const titleId = useId();
  const [localExplorerOpen, setLocalExplorerOpen] = useState(defaultExpanded);
  const explorerOpen = typeof controlledExpanded === "boolean"
    ? controlledExpanded
    : localExplorerOpen;

  const active = model?.activeMethod || null;
  const focal = model?.focal || {};
  const expression = model?.subject?.expressionRaw || model?.continuity?.expression || null;
  const number = active?.value ?? model?.subject?.numberRoot ?? focal?.secondary ?? null;
  const primaryIsNumber = focal?.primaryType === "number";
  const primary = primaryIsNumber ? (focal?.primary ?? number) : (focal?.primary ?? expression);
  const secondary = primaryIsNumber ? (focal?.secondary ?? expression) : number;
  const methods = model?.methods || [];
  const previewMethods = model?.previewMethods || [];
  const compactMethods = previewMethods.slice(0, COMPACT_METHOD_LIMIT);
  const exceptional = active?.exceptionalState
    ? (EXCEPTION_LABELS[active.exceptionalState] || active.exceptionalState)
    : "";
  const familyGroups = useMemo(() => {
    const groups = [...(model?.familyGroups || [])];
    const rank = (key) => {
      const index = FAMILY_ORDER.indexOf(key);
      return index < 0 ? FAMILY_ORDER.length : index;
    };
    return groups.sort((a, b) => rank(a.key) - rank(b.key));
  }, [model?.familyGroups]);

  if (!model || !active) return null;

  const setExplorerOpen = (next) => {
    if (typeof controlledExpanded !== "boolean") setLocalExplorerOpen(next);
    onExpandedChange?.(next);
  };

  const rootStyle = { ...paletteVars(P), ...(style || {}) };
  const hasMiniActions = Boolean(
    (model?.trace?.available && typeof onOpenTrace === "function")
      || typeof onLearn === "function"
      || typeof onRaziel === "function"
      || typeof onOpenFull === "function",
  );

  return (
    <>
      <article
        className={cx("sod-gematria-card", `is-${surface}`, className)}
        style={rootStyle}
        data-gematria-card="golden-v1"
        data-focus={model.focusKind || "expression"}
        dir="rtl"
      >
        <header className="sod-gematria-card__summary">
          <div className="sod-gematria-card__focus">
            <span className={cx("sod-gematria-card__primary", primaryIsNumber && "is-number")}>
              {primary ?? "—"}
            </span>
            <span className="sod-gematria-card__arrow" aria-hidden="true">{primaryIsNumber ? "→" : "←"}</span>
            <strong className={cx("sod-gematria-card__secondary", !primaryIsNumber && "is-number")}>
              {primaryIsNumber ? (secondary || "—") : fmtNumber(secondary)}
            </strong>
          </div>

          <span className="sod-gematria-card__method-active">
            {methodLabel(active)}
            {exceptional && <em>{exceptional}</em>}
          </span>
        </header>

        <div className="sod-gematria-card__compact-methods" aria-label="שיטות גימטריה מהירות">
          {compactMethods.map((method) => (
            <MethodTile
              key={method.methodKey}
              method={method}
              compact
              active={method.methodKey === active.methodKey}
              onSelect={onMethodSelect}
            />
          ))}
        </div>

        <PeerExpressions peers={model.peerExpressions} compact />

        <section className="sod-gematria-card__method-lens" aria-label="השיטה הפעילה">
          <div>
            <span>השיטה הפעילה</span>
            <strong>{methodLabel(active)} <em>·</em> {fmtNumber(active.value)}</strong>
            {active.derivedFrom?.length > 0 && (
              <small>נגזרת מ־{active.derivedFrom.join(" + ")}</small>
            )}
          </div>

          <ExpressionDependencySignal evidence={model?.expressionEvidence} />

          {hasMiniActions && (
            <nav className="sod-gematria-card__mini-actions" aria-label="פעולות גימטריה">
              {model?.trace?.available && typeof onOpenTrace === "function" && (
                <button type="button" onClick={onOpenTrace}>חשב</button>
              )}
              {typeof onLearn === "function" && <button type="button" onClick={onLearn}>למד</button>}
              {typeof onRaziel === "function" && <button type="button" onClick={onRaziel}>רזיאל</button>}
              {typeof onOpenFull === "function" && <button type="button" onClick={onOpenFull}>פתח מספר</button>}
            </nav>
          )}
        </section>

        <footer className="sod-gematria-card__compact-footer">
          <button
            type="button"
            className="sod-gematria-card__explorer-trigger"
            onClick={() => setExplorerOpen(true)}
            aria-expanded={explorerOpen}
            aria-controls={panelId}
          >
            כל השיטות <span>({methods.length})</span>
          </button>

          {model?.relationsSummary?.journeyAvailable && (
            <button
              type="button"
              className="sod-gematria-card__journey-compact"
              onClick={onOpenJourney}
              disabled={typeof onOpenJourney !== "function"}
            >
              המשך במסע
            </button>
          )}
        </footer>
      </article>

      <ExplorerDialog
        open={explorerOpen}
        panelId={panelId}
        titleId={titleId}
        expression={expression}
        model={model}
        active={active}
        familyGroups={familyGroups}
        methods={methods}
        onClose={() => setExplorerOpen(false)}
        onMethodSelect={onMethodSelect}
        onOpenJourney={onOpenJourney}
        onOpenTrace={onOpenTrace}
        onOpenFull={onOpenFull}
        styleVars={rootStyle}
      />
    </>
  );
}
