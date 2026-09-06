import React from "react";
import { Link } from "react-router-dom";

// 📐 EqualityMethodSection — the ONE shared renderer for "phrase = value (method)" equality rows.
// UNIVERSAL_CONVERGENCE_PROJECTION_1111_V1 (work_log dispatch 91662527-ce5e-4dbf-bc46-0e3dc8612588).
//
// Extracted verbatim (behavior-preserving) from the GEMATRIA LENS block that already lived inline
// in EntityHubPreviewPageFunctional.jsx, so today's mount stays pixel-identical while the markup
// becomes importable by any other surface (Topic, Cross) that wants the same registry-driven
// equality rows — mirrors TopicConvergenceContent.jsx's "one thin renderer, many hosts" pattern.
//
// Truth discipline: this component NEVER computes a gematria value and NEVER invents a method.
// It only renders whatever registry-enriched `families` the host already fetched (typically via
// getValueFamilies()/enrichGematriaFamilies() in entityHubProjection.js, itself backed by the
// canonical fn_number_lookup + v_method_states — the FULL method set, not a hardcoded list, but
// NOT a blanket "engine-verified" set either: fn_number_lookup deliberately keeps historical and
// ungoverned methods alongside governed ones (Rank, Don't Hide), each family carrying its own
// governed / methodEngineVerified / methodActive / methodScannable flags. This renderer displays
// those flags as given; it does not collapse them into a single verification claim.
//
// Props:
//   subjectLabel   the value common to every row (e.g. "1111")
//   families       registry-enriched groups: {method, count, phrases:[{phrase,...}], registry, ...}
//   phraseEntities phrase -> existing entity node link ({nodeId, identityKey, href}), optional
//   onOpenMethod   (group) => void — opens a Method Inspector, optional
//   onLeave        (lens, selection) => void — Research Context bridge, optional
//   linkFor        (phrase) => href override, optional (default: entity link, else /number/:phrase)
//   theme          style tokens; defaults reuse the --eh-* CSS vars (EntityHubObservatory.css) so
//                  mounting inside EntityHubPreviewPageFunctional needs no visual change
//   maxPhrasesPerFamily  phrases shown per family card (default 7, matches existing behavior)
//   eyebrow / title / subtitle  section header text, optional

const DEFAULT_THEME = {
  ink: "var(--eh-ink)",
  soft: "var(--eh-muted)",
  line: "var(--eh-line)",
  panel: "var(--eh-panel)",
  gold: "var(--eh-gold)",
  gold2: "var(--eh-gold2)",
  softBg: "var(--eh-soft)",
  goldBg: "var(--eh-goldbg)",
};

const buttonReset = { border: 0, font: "inherit" };

function chipStyle(theme, tone = "gold") {
  const map = {
    gold: [theme.goldBg, theme.gold],
    neutral: [theme.softBg, theme.soft],
  };
  const [background, color] = map[tone] || map.neutral;
  return { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800, background, color };
}

function phraseOf(item) {
  if (typeof item === "string") return item;
  return item?.phrase || item?.label || "";
}

function Empty({ theme, children }) {
  return <div style={{ color: theme.soft, fontSize: 13.5, lineHeight: 1.65, padding: "8px 0" }}>{children}</div>;
}

export default function EqualityMethodSection({
  subjectLabel,
  families = [],
  phraseEntities = {},
  onOpenMethod,
  onLeave,
  linkFor,
  theme: themeOverride,
  maxPhrasesPerFamily = 7,
  emptyText = "אין מידע בשכבה הזאת כרגע.",
  eyebrow = "GEMATRIA LENS",
  title,
  subtitle = "הביטוי הוא הישות הלחיצה הראשית (🔹 = יש לו מרכז ישות קנוני משלו); השיטה היא עדשה נפרדת עם Identity והגדרה משלה. לחיצה על שם השיטה פותחת Inspector (Registry + trace).",
}) {
  const theme = { ...DEFAULT_THEME, ...themeOverride };
  const heading = title ?? `איך  ${subjectLabel}  מופיע בגימטריה`;
  const leave = (lens, selection) => { if (typeof onLeave === "function") onLeave(lens, selection); };
  const resolveHref = (phrase, entity) => {
    if (typeof linkFor === "function") return linkFor(phrase, entity);
    return entity ? entity.href : `/number/${encodeURIComponent(phrase)}`;
  };

  return (
    <section data-testid="equality-method-section">
      {eyebrow ? <div style={{ color: theme.gold, fontSize: 10.5, letterSpacing: 1.8, fontWeight: 900, marginBottom: 4 }}>{eyebrow}</div> : null}
      <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.25, color: theme.ink }}>{heading}</h2>
      {subtitle ? <div style={{ color: theme.soft, fontSize: 13.5, lineHeight: 1.65, marginTop: 5, maxWidth: 820 }}>{subtitle}</div> : null}

      {families.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 12, marginTop: 15 }}>
        {families.map(group => {
          const r = group.registry || {};
          const list = (group.phrases || []).slice(0, maxPhrasesPerFamily);
          const regular = group.method === "רגיל";
          return <article key={group.method} style={{ border: `1px solid ${regular ? theme.gold2 : theme.line}`, background: regular ? theme.goldBg : theme.panel, borderRadius: 15, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <button
                onClick={() => onOpenMethod?.({ ...group, value: subjectLabel, phraseEntities })}
                disabled={!onOpenMethod}
                style={{ ...buttonReset, cursor: onOpenMethod ? "pointer" : "default", background: "none", padding: 0, color: theme.ink, textAlign: "right", flex: 1 }}>
                <div style={{ fontWeight: 950, fontSize: 17 }}>{r.display_label || group.method} {onOpenMethod ? <span style={{ color: theme.gold, fontSize: 12 }}>↗</span> : null}</div>
                <div style={{ color: theme.soft, fontSize: 13.5, marginTop: 3 }}>{r.sub || "שיטת גימטריה רשומה"}</div>
              </button>
              <span style={chipStyle(theme, regular ? "gold" : "neutral")}>{group.count ?? group.phrases?.length ?? 0}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {list.map((item, i) => {
                const phrase = phraseOf(item);
                if (!phrase) return null;
                const ent = phraseEntities[phrase] || null;
                // NUMBER → ENTITY: a phrase with a canonical entity node opens its own hub (data-derived, not hardcoded).
                return <Link key={`${group.method}-${phrase}-${i}`} to={resolveHref(phrase, ent)}
                  onClick={() => leave(ent ? "entity" : "number", { entityId: ent ? ent.nodeId : phrase, entityType: ent ? "entity" : "phrase" })}
                  data-entity-node={ent ? ent.nodeId : undefined}
                  style={{ color: theme.ink, textDecoration: "none", background: theme.softBg, border: `1px solid ${ent ? theme.gold2 : theme.line}`, borderRadius: 999, padding: "5px 9px", fontSize: 12.5 }}>{ent ? "🔹 " : ""}{phrase} <b style={{ color: theme.gold }}>· {r.display_label || group.method} = {subjectLabel}</b></Link>;
              })}
            </div>
          </article>;
        })}
      </div> : <Empty theme={theme}>{emptyText}</Empty>}
    </section>
  );
}
