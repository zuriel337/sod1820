import React, { useId, useMemo, useState } from "react";
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

function MethodTile({ method, active, onSelect }) {
  const clickable = typeof onSelect === "function" && method?.methodKey;
  return (
    <button
      type="button"
      className={cx("sod-gematria-card__method", active && "is-active")}
      onClick={clickable ? () => onSelect(method.methodKey) : undefined}
      disabled={!clickable}
      aria-pressed={active || undefined}
      data-method-key={method?.methodKey || ""}
    >
      <span className="sod-gematria-card__method-label">{methodLabel(method)}</span>
      <strong>{fmtNumber(method?.value)}</strong>
      {method?.exceptionalState && (
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

export default function GematriaCard({
  model,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  onMethodSelect,
  onOpenFull,
  onOpenJourney,
  onOpenTrace,
  className = "",
  style = null,
  surface = "default",
}) {
  const P = usePalette();
  const panelId = useId();
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);
  const expanded = typeof controlledExpanded === "boolean" ? controlledExpanded : localExpanded;

  const active = model?.activeMethod || null;
  const focal = model?.focal || {};
  const expression = model?.subject?.expressionRaw || model?.continuity?.expression || null;
  const number = active?.value ?? model?.subject?.numberRoot ?? focal?.secondary ?? null;
  const primaryIsNumber = focal?.primaryType === "number";
  const primary = primaryIsNumber ? (focal?.primary ?? number) : (focal?.primary ?? expression);
  const secondary = primaryIsNumber ? (focal?.secondary ?? expression) : number;
  const relationText = relationLabel(model?.relationsSummary);
  const methods = model?.methods || [];
  const previewMethods = model?.previewMethods || [];
  const remaining = Math.max(0, methods.length - previewMethods.length);
  const exceptional = active?.exceptionalState ? (EXCEPTION_LABELS[active.exceptionalState] || active.exceptionalState) : "";
  const familyGroups = useMemo(() => {
    const groups = [...(model?.familyGroups || [])];
    const rank = (key) => {
      const index = FAMILY_ORDER.indexOf(key);
      return index < 0 ? FAMILY_ORDER.length : index;
    };
    return groups.sort((a, b) => rank(a.key) - rank(b.key));
  }, [model?.familyGroups]);

  if (!model || !active) return null;

  const setExpanded = (next) => {
    if (typeof controlledExpanded !== "boolean") setLocalExpanded(next);
    onExpandedChange?.(next);
    if (!next) setShowAll(false);
  };

  const rootStyle = { ...paletteVars(P), ...(style || {}) };

  return (
    <article
      className={cx("sod-gematria-card", `is-${surface}`, expanded && "is-expanded", className)}
      style={rootStyle}
      data-gematria-card="golden-v1"
      data-focus={model.focusKind || "expression"}
      dir="rtl"
    >
      <div className="sod-gematria-card__summary">
        <button
          type="button"
          className="sod-gematria-card__summary-main"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          <span className="sod-gematria-card__focus">
            <span className={cx("sod-gematria-card__primary", primaryIsNumber && "is-number")}>
              {primary ?? "—"}
            </span>
            <span className="sod-gematria-card__arrow" aria-hidden="true">{primaryIsNumber ? "→" : "←"}</span>
            <strong className={cx("sod-gematria-card__secondary", !primaryIsNumber && "is-number")}>
              {primaryIsNumber ? (secondary || "—") : fmtNumber(secondary)}
            </strong>
          </span>

          <span className="sod-gematria-card__method-active">
            {methodLabel(active)}
            {exceptional && <em>{exceptional}</em>}
          </span>
        </button>

        <div className="sod-gematria-card__summary-tail">
          {relationText && (
            <button
              type="button"
              className="sod-gematria-card__journey-signal"
              onClick={model?.relationsSummary?.journeyAvailable ? onOpenJourney : undefined}
              disabled={!model?.relationsSummary?.journeyAvailable || typeof onOpenJourney !== "function"}
            >
              <span aria-hidden="true">⌘</span>
              {relationText}
            </button>
          )}
          <button
            type="button"
            className="sod-gematria-card__toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "סגור פרטי גימטריה" : "פתח פרטי גימטריה"}
          >
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div id={panelId} className="sod-gematria-card__explorer">
          <header className="sod-gematria-card__explorer-head">
            <div>
              <span>שיטות נוספות</span>
              <strong>{expression || primary || "גימטריה"}</strong>
            </div>
            {methods.length > previewMethods.length && (
              <button type="button" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}>
                {showAll ? "הצג פחות" : `כל ${methods.length} השיטות`}
              </button>
            )}
          </header>

          {!showAll ? (
            <div className="sod-gematria-card__method-grid is-preview">
              {previewMethods.map((method) => (
                <MethodTile
                  key={method.methodKey}
                  method={method}
                  active={method.methodKey === active.methodKey}
                  onSelect={onMethodSelect}
                />
              ))}
              {remaining > 0 && (
                <button type="button" className="sod-gematria-card__more" onClick={() => setShowAll(true)}>
                  <strong>+{remaining}</strong>
                  <span>כל השיטות</span>
                </button>
              )}
            </div>
          ) : (
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
          )}

          <EvidenceSummary evidence={model.evidence} />
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
              <strong>{model?.trace?.available ? "Trace קנוני זמין" : "פירוט החישוב ייפתח בעומק"}</strong>
              <button
                type="button"
                onClick={onOpenTrace}
                disabled={!model?.trace?.available || typeof onOpenTrace !== "function"}
              >
                פתח Trace
              </button>
            </section>
          </div>

          <footer className="sod-gematria-card__footer">
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
        </div>
      )}
    </article>
  );
}
