import React, { useState, useEffect, useRef } from "react";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { emit, EVENTS } from "../lib/research/eventBus.js";
import { taggedShareUrl, landingKey } from "../lib/propagation.js";
import { shareOrCopy } from "../lib/share.js";
import { track } from "../lib/tracking.js";
import { semanticControlVars, usePalette } from "../lib/palette.js";

// ⚡ Quick Actions — פס-הפעולות האחיד ליד כל ישות (Reality Graph Law · Zero-Duplicate).
// היררכיה: ➕ הוסף למחקר = primary · ⭐/🔗 = secondary · ⋯ = ghost/menu.
// canonical_colors_law v2: אותו רכיב צורך semantic roles בעצמו; משטח רשאי לשנות layout, לא להמציא palette.
export default function QuickActions({ entity, onShare, onAnalyze, extra, style, hideAnalyze }) {
  const { addToResearch, saveItem, togglePin, isPinned } = useResearch();
  const P = usePalette();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = e => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [moreOpen]);
  if (!entity) return null;
  const pinned = isPinned?.(entity.id);

  const share = () => {
    emit(EVENTS.ITEM_SHARE, entity);
    if (onShare) return onShare();
    const url = typeof window !== "undefined" ? taggedShareUrl(window.location.href, "copy") : "https://sod1820.co.il";
    try {
      const slug = typeof window !== "undefined" ? landingKey(window.location.pathname) : null;
      track("share", slug, "share", { platform: "copy", content_type: entity.type || entity.kind || null, content_id: entity.id ?? null });
    } catch { /* noop */ }
    shareOrCopy({ title: entity.title || "סוד 1820", url });
  };
  const copy = () => { emit(EVENTS.ITEM_COPY, entity); try { navigator.clipboard?.writeText(entity.title); } catch { /* noop */ } };

  const themeVars = {
    ...semanticControlVars(P),
    "--qa-card": P.card,
    "--qa-line": P.borderStrong || P.border,
    "--qa-ink": P.ink,
    "--qa-muted": P.inkSoft,
    "--qa-chip": P.cardSoft,
    "--qa-selected-bg": P.glow,
    "--qa-selected-fg": P.accentText,
    "--qa-selected-border": P.accent,
  };

  return (
    <div className="rw-qa" style={{ ...themeVars, ...style }}>
      <style>{QA_CSS}</style>
      <button className="qa-primary" onClick={() => addToResearch?.(entity)}>➕ הוסף למחקר</button>
      <button onClick={() => saveItem?.(entity)}>⭐ שמור</button>
      <button onClick={share}>🔗 שתף</button>
      {!hideAnalyze && (onAnalyze
        ? <button onClick={() => { emit(EVENTS.AI_ANALYZE, entity); onAnalyze(); }} title="🤖 ניתוח AI — מבוסס עובדות המנוע">🤖 נתח ב-AI</button>
        : <button className="soon" disabled title="🤖 ניתוח AI — בבנייה, ייפתח בקרוב לכל החוקרים">🤖 AI · בבנייה</button>)}
      <div className="qa-more" ref={moreRef}>
        <button className="qa-moretog" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-label="עוד פעולות" title="עוד פעולות">⋯</button>
        {moreOpen && (
          <div className="qa-menu" onClick={() => setMoreOpen(false)}>
            <button className={pinned ? "on" : ""} onClick={() => togglePin?.(entity)} title="הצמד למחקר — יישאר זמין בכל המעבדה">
              {pinned ? "📌 מוצמד" : "📌 הצמד"}
            </button>
            <button onClick={copy}>📋 העתק</button>
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}

const QA_CSS = `
.rw-qa{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:center;align-items:center}
.rw-qa button{font-family:inherit;border:1px solid var(--control-secondary-border);background:var(--control-secondary-bg);border-radius:999px;padding:9px 16px;font-size:13.5px;font-weight:700;color:var(--control-secondary-fg);min-height:44px;cursor:pointer;transition:transform .1s ease,background .15s ease,color .15s ease,border-color .15s ease,box-shadow .15s ease}
.rw-qa button:hover:not(:disabled){background:var(--control-secondary-hover-bg);color:var(--control-secondary-hover-fg)}
.rw-qa button:focus-visible{outline:none;box-shadow:0 0 0 3px var(--control-secondary-focus)}
.rw-qa button:active{transform:scale(.96)}
.rw-qa .qa-primary{background:var(--control-primary-bg);border-color:var(--control-primary-border);color:var(--control-primary-fg)}
.rw-qa .qa-primary:hover{background:var(--control-primary-hover-bg);color:var(--control-primary-hover-fg)}
.rw-qa .qa-primary:focus-visible{box-shadow:0 0 0 3px var(--control-primary-focus)}
.rw-qa button.on{background:var(--qa-selected-bg);border-color:var(--qa-selected-border);color:var(--qa-selected-fg)}
.rw-qa button.soon,.rw-qa button:disabled{background:var(--control-disabled-bg);border-color:var(--control-disabled-border);color:var(--control-disabled-fg);cursor:default;opacity:1}
.rw-qa button.soon:active,.rw-qa button:disabled:active{transform:none}
.rw-qa .qa-more{position:relative;display:inline-flex}
.rw-qa .qa-moretog{min-width:46px;padding:9px 14px;font-size:20px;line-height:.7;letter-spacing:1px;background:var(--control-ghost-bg);border-color:transparent;color:var(--control-ghost-fg)}
.rw-qa .qa-moretog:hover:not(:disabled){background:var(--control-ghost-hover-bg)}
.rw-qa .qa-menu{position:absolute;top:calc(100% + 6px);inset-inline-end:0;z-index:60;display:flex;flex-direction:column;gap:4px;background:var(--qa-card);border:1px solid var(--qa-line);border-radius:14px;padding:7px;min-width:172px;box-shadow:0 14px 36px rgba(0,0,0,.18)}
.rw-qa .qa-menu button,.rw-qa .qa-menu a{width:100%;justify-content:flex-start;text-align:start;min-height:40px;border-radius:9px;text-decoration:none}
.rw-qa .qa-menu a>button{width:100%}
.rw-qa .qa-menu button:hover{background:var(--qa-chip)}
`;
