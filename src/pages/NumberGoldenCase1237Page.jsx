import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { fetchNumberStatusProjection } from "../lib/research/numberStatusProjection.js";
import { fetchMathDimensions, fetchRealityHintIdSet } from "../lib/research/goldenCase1237Extras.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import EntityHubNumberStatusBoard from "../components/entity/EntityHubNumberStatusBoard.jsx";
import QuickActions from "../components/QuickActions.jsx";
import WatchButton from "../components/WatchButton.jsx";
import "./EntityHubObservatory.css";

// NumberGoldenCase1237Page — UNIVERSAL_NUMBER_HUB_1237_LIVING_NUMBER_OBSERVATORY_V2.
// Composition/experience pass only: every fact still comes from the same existing readers as V1
// (entityHubProjection / numberStatusProjection / gematriaTrace / the sequence adapters /
// getRealityHints) — this file adds no engine, no store, no schema, no truth. What changed is
// hierarchy and interaction language: the number is the interface, not a dashboard with a number
// at the top of it. Reused verbatim: EntityHubNumberStatusBoard (now a secondary/collapsed
// "advanced readers" panel, not the dominant Hero shape), QuickActions, WatchButton,
// ResearchProvider actions, the .entity-hub-observatory / .eh-func dual-theme palette.

const fmt = (v) => (v == null ? "—" : new Intl.NumberFormat("he-IL").format(Number(v)));

function Loading({ value }) {
  return (
    <div className="entity-hub-observatory">
      <div className="obs-shell">
        <section className="obs-hero">
          <div className="obs-orbits" aria-hidden>
            <div className="obs-orbit obs-o1" /><div className="obs-orbit obs-o2" /><div className="obs-orbit obs-o3" />
          </div>
          <div className="obs-hero-content" style={{ minHeight: "auto", paddingBottom: 30 }}>
            <div className="obs-eyebrow">NUMBER OBSERVATORY · GOLDEN CASE</div>
            <div className="obs-number">{value}</div>
            <p>טוען Readers חיים מהמנוע והמאגר…</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function NotFound({ value }) {
  return (
    <div className="entity-hub-observatory">
      <div className="obs-shell" style={{ padding: "60px 0", textAlign: "center" }}>
        <h1>לא נמצא מספר חי בשם {value}</h1>
        <p style={{ color: "var(--obs-muted)" }}>Golden Case זה בנוי ומאומת עבור 1237 בלבד.</p>
      </div>
    </div>
  );
}

function groupRelations(relations) {
  const groups = {};
  for (const r of relations || []) {
    const name = r?.relationName || r?.kind || "קשר";
    (groups[name] ||= []).push(r);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// 1. NUMBER CORE / ORBIT — the number is the interface. 4-7 strongest live signals float around
// it as satellites (not a rectangular dashboard underneath). Desktop: a soft scattered arc.
// Mobile: the same satellites become a compact wrapped stack (no forced desktop geometry).
// ---------------------------------------------------------------------------
const ORBIT_CSS = `
.core-orbit{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;max-width:640px;margin:22px auto 0}
.core-sat{border:1px solid var(--obs-line);background:rgba(255,255,255,.045);border-radius:16px;padding:9px 14px;text-align:center;text-decoration:none;color:inherit;transition:transform .15s ease}
.core-sat:hover{transform:translateY(-2px)}
.core-sat b{display:block;font-size:17px;color:var(--obs-gold);line-height:1.1}
.core-sat span{display:block;font-size:10px;color:var(--obs-muted);margin-top:2px;white-space:nowrap}
.core-sat.lg{padding:12px 18px}
.core-sat.lg b{font-size:23px}
.core-sat.sm{padding:7px 11px;opacity:.85}
.core-sat.sm b{font-size:14px}
@media (min-width:760px){
  .core-orbit{max-width:820px}
  .core-orbit .core-sat:nth-child(1){transform:translateY(-6px)}
  .core-orbit .core-sat:nth-child(2){transform:translateY(10px)}
  .core-orbit .core-sat:nth-child(3){transform:translateY(-12px)}
  .core-orbit .core-sat:nth-child(4){transform:translateY(6px)}
  .core-orbit .core-sat:nth-child(5){transform:translateY(-4px)}
  .core-orbit .core-sat:nth-child(6){transform:translateY(12px)}
  .core-orbit .core-sat:nth-child(7){transform:translateY(-8px)}
  .core-orbit .core-sat:hover{transform:translateY(-4px) scale(1.03)}
}
`;

function ZeroControl({ zero, number }) {
  const [open, setOpen] = useState(false);
  if (!zero?.applicable) {
    return <span title="fn_zero_scale: אין סדרת-אפס ישימה למספר הזה" style={{ opacity: 0.35, fontSize: 20, cursor: "default" }}>ⓞ</span>;
  }
  const chain = Array.isArray(zero.scale_chain) ? zero.scale_chain : [];
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="סדרת האפס — צורות-סקאלה קנוניות של אותו ציר מספר"
        style={{
          font: "inherit", fontSize: 20, lineHeight: 1, cursor: "pointer", border: "1px solid var(--obs-line)",
          background: open ? "rgba(231,199,107,.16)" : "rgba(255,255,255,.05)", color: "var(--obs-gold)",
          borderRadius: 999, width: 34, height: 34, display: "inline-grid", placeItems: "center",
        }}
      >ⓞ</button>
      {open && (
        <div style={{
          position: "absolute", insetInlineStart: 0, top: "calc(100% + 8px)", zIndex: 30, minWidth: 220,
          background: "var(--eh-panel,#0f1a2b)", border: "1px solid var(--obs-line)", borderRadius: 14,
          padding: 12, boxShadow: "0 18px 40px rgba(0,0,0,.35)", textAlign: "start",
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1, color: "var(--obs-gold)", marginBottom: 6 }}>
            סדרת האפס · שורש {zero.core_root ?? "—"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {chain.length ? chain.map((v) => (
              <Link key={v} to={`/number/${v}`} style={{ textDecoration: "none" }}>
                <span style={{
                  display: "inline-block", padding: "5px 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 800,
                  border: `1px solid ${Number(v) === number ? "var(--obs-gold)" : "var(--obs-line)"}`,
                  background: Number(v) === number ? "rgba(231,199,107,.18)" : "rgba(255,255,255,.04)",
                  color: Number(v) === number ? "var(--obs-gold)" : "var(--obs-ink)",
                }}>{v}</span>
              </Link>
            )) : <span style={{ color: "var(--obs-muted)", fontSize: 12 }}>אין שרשרת זמינה.</span>}
          </div>
          <div style={{ fontSize: 9.5, color: "var(--obs-muted)", marginTop: 8 }}>מקור: fn_zero_scale ({zero.source_of_truth || "canonical"})</div>
        </div>
      )}
    </span>
  );
}

function Satellite({ to, value, label, size }) {
  const cls = `core-sat${size === "lg" ? " lg" : size === "sm" ? " sm" : ""}`;
  const inner = <><b>{value}</b><span>{label}</span></>;
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

function NumberCore({ data, statusData, entity, onFacet }) {
  const number = Number(data.identity.label);
  const misratarFamily = (data.gematria.families || []).find((g) => g.method === "מסתתר");
  const linkedCentral = misratarFamily?.phrases?.find((p) => data.gematria.phraseEntities?.[p.phrase]) || null;
  const worlds = Array.isArray(data.numberWorlds) ? data.numberWorlds : [];
  const score = statusData?.meter?.score;

  const satellites = useMemo(() => {
    const list = [];
    if (score != null) list.push({ key: "pulse", value: fmt(score), label: "דופק · convergence", size: "lg" });
    if (linkedCentral) list.push({ key: "central", value: linkedCentral.phrase, label: "מסתתר · ישות מרכזית", size: "lg", to: data.gematria.phraseEntities[linkedCentral.phrase]?.href || `/number/${encodeURIComponent(linkedCentral.phrase)}` });
    if (statusData?.analytics?.viewsAll != null) list.push({ key: "views", value: fmt(statusData.analytics.viewsAll), label: "צפיות" });
    if (statusData?.analytics?.searches != null) list.push({ key: "searches", value: fmt(statusData.analytics.searches), label: "חיפושים" });
    if (worlds.length) list.push({ key: "worlds", value: fmt(worlds.length), label: "עולמות" });
    if (statusData?.counts?.graphEdges != null) list.push({ key: "graph", value: fmt(statusData.counts.graphEdges), label: "קשרי Graph", to: null });
    const galleries = data.surface?.galleriesCount ?? data.surface?.galleries?.length;
    if (galleries != null) list.push({ key: "images", value: fmt(galleries), label: "תמונות", to: "/archive" });
    return list.slice(0, 7);
  }, [score, linkedCentral, statusData, worlds.length, data]);

  return (
    <section className="obs-hero" style={{ marginTop: 8 }}>
      <style>{ORBIT_CSS}</style>
      <div className="obs-orbits" aria-hidden>
        <div className="obs-orbit obs-o1" /><div className="obs-orbit obs-o2" /><div className="obs-orbit obs-o3" />
        <div className="obs-dot obs-d1" /><div className="obs-dot obs-d2" /><div className="obs-dot obs-d3" />
      </div>
      <div className="obs-hero-content" style={{ minHeight: "auto", paddingBottom: 26 }}>
        <div className="obs-eyebrow">NUMBER OBSERVATORY · GOLDEN CASE</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="obs-number">{data.identity.label}</div>
          <ZeroControl zero={data.zeroScale} number={number} />
        </div>
        <p>מרכז-הכובד של המספר — הישויות, השיטות, המציאות והמחקר מסתדרים סביבו.</p>

        <div className="core-orbit">
          {satellites.map((s) => <Satellite key={s.key} to={s.to} value={s.value} label={s.label} size={s.size} />)}
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <QuickActions entity={entity} hideAnalyze hidePin
            extra={<WatchButton topic={`number:${data.identity.label}`} source="golden-case-1237" label="עקוב" compact noPush />} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Link to="/cross" style={{
            display: "inline-block", padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 800,
            border: "1px solid var(--obs-line)", color: "var(--obs-blue)", textDecoration: "none",
          }}>🔀 מצא הצלבה ←</Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Advanced readers — the full EntityHubNumberStatusBoard, reused verbatim, unmodified, but
// downstream and collapsed by default so it doesn't compete with the Core for visual dominance.
// Same data, same component — zero duplicated metric truth.
// ---------------------------------------------------------------------------
function AdvancedReadersPanel({ data, relationGroups }) {
  const [open, setOpen] = useState(false);
  return (
    <section style={{ marginTop: 22 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        border: "1px solid var(--obs-line)", background: "rgba(255,255,255,.02)", borderRadius: 14,
        padding: "10px 14px", cursor: "pointer", font: "inherit", color: "var(--obs-ink)",
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 800 }}>🛰 Readers מתקדמים · לוח-המצב המלא</span>
        <span style={{ fontSize: 11, color: "var(--obs-muted)" }}>{open ? "סגור ▲" : "פתח ▾"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <EntityHubNumberStatusBoard data={data} relationGroups={relationGroups} />
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. ZERO AXIS — the same zeroScale.scale_chain, upgraded from a chip row into a centered axis.
// ---------------------------------------------------------------------------
function ZeroAxisSection({ zero, number }) {
  const chain = Array.isArray(zero?.scale_chain) ? zero.scale_chain : [];
  return (
    <section style={{ marginTop: 30, textAlign: "center" }}>
      <h2 style={{ fontSize: 13, margin: "0 0 10px", color: "var(--obs-gold)", letterSpacing: 1, fontWeight: 900 }}>ציר האפס · ZERO AXIS</h2>
      {zero?.applicable && chain.length ? (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          {chain.map((v, i) => {
            const isCurrent = Number(v) === number;
            return (
              <React.Fragment key={v}>
                {i > 0 && <span aria-hidden style={{ color: "var(--obs-muted)", fontSize: 14 }}>·</span>}
                <Link to={`/number/${v}`} style={{
                  textDecoration: "none", fontWeight: 900,
                  fontSize: isCurrent ? 34 : 18,
                  color: isCurrent ? "var(--obs-gold)" : "var(--obs-blue)",
                  textShadow: isCurrent ? "0 0 24px rgba(231,199,107,.35)" : "none",
                }}>{v}</Link>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--obs-muted)" }}>אין סדרת-אפס ישימה למספר {number} לפי fn_zero_scale.</div>
      )}
      <div style={{ fontSize: 9.5, color: "var(--obs-muted)", marginTop: 8 }}>אותה זהות מספרית, בסקאלה אחרת · מקור: fn_zero_scale · שורש {zero?.core_root ?? "—"}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. EQUIVALENCE FIELD — same regular-gematria phrases, visual hierarchy instead of a flat chip
// list. Every phrase stays a real semantic <Link>; sizing/opacity only, never canvas-only.
// ---------------------------------------------------------------------------
function fieldTier(p) {
  if (p.world) return "lg";
  if (Array.isArray(p.tags) && p.tags.length) return "md";
  return "sm";
}
const FIELD_SIZE = { lg: 17, md: 14, sm: 12 };
const FIELD_OPACITY = { lg: 1, md: 0.85, sm: 0.65 };

function FieldPhrase({ phrase, world, ragil, tags, href, tier }) {
  return (
    <Link to={href} style={{ textDecoration: "none", color: "inherit" }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: FIELD_SIZE[tier], fontWeight: tier === "lg" ? 900 : 700,
        opacity: FIELD_OPACITY[tier],
        color: tier === "lg" ? "var(--obs-gold)" : "var(--obs-ink)",
        padding: tier === "lg" ? "8px 14px" : "6px 10px",
        border: `1px solid ${tier === "lg" ? "rgba(231,199,107,.4)" : "var(--obs-line)"}`,
        borderRadius: 999, background: tier === "lg" ? "rgba(231,199,107,.08)" : "transparent",
      }}>
        {phrase}
        {world ? <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--obs-gold)" }}>{world}</span> : null}
        {ragil != null && tier !== "sm" ? <span style={{ fontSize: 9.5, color: "var(--obs-muted)" }}>={ragil}</span> : null}
        {Array.isArray(tags) && tags[0] && tier === "lg" ? <span style={{ fontSize: 9.5, color: "var(--obs-muted)" }}>#{tags[0]}</span> : null}
      </span>
    </Link>
  );
}

function EquivalenceField({ families, phraseEntities, label }) {
  const [expanded, setExpanded] = useState(false);
  const regular = (families || []).find((g) => g.method === "רגיל");
  const phrases = regular?.phrases || [];
  const shown = expanded ? phrases : phrases.slice(0, 10);
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ fontSize: 19, margin: "0 0 4px", textAlign: "center" }}>הקבוצה הסמנטית של {label} · גימטריה רגילה</h2>
      <p style={{ fontSize: 11, color: "var(--obs-muted)", margin: "0 0 14px", textAlign: "center" }}>
        עובדת-מנוע בלבד — מוצג כשקיים ערך מאומת. פרשנות/רמז נשארים מופרדים מהעובדה.
      </p>
      {phrases.length ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 760, margin: "0 auto" }}>
            {shown.map((p, i) => (
              <FieldPhrase key={`${p.phrase}-${i}`} phrase={p.phrase} world={p.world} ragil={p.ragil} tags={p.tags} tier={fieldTier(p)}
                href={phraseEntities?.[p.phrase]?.href || `/number/${encodeURIComponent(p.phrase)}`} />
            ))}
          </div>
          {phrases.length > 10 && (
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={() => setExpanded((e) => !e)} style={{
                marginTop: 12, border: 0, background: "transparent", color: "var(--obs-blue)", fontWeight: 800,
                fontSize: 12.5, cursor: "pointer", font: "inherit",
              }}>{expanded ? "הצג פחות ▲" : `הצג עוד (${phrases.length - 10}) ▼`}</button>
            </div>
          )}
        </>
      ) : <div style={{ color: "var(--obs-muted)", fontSize: 12.5, textAlign: "center" }}>אין ביטוי מאומת בגימטריה רגילה עבור מספר זה כרגע.</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. METHOD EXPLORER — registry-derived lens selector + a real visual Trace ladder
// (INPUT → step → step → final), built only from whatever gematria_method_trace returns.
// ---------------------------------------------------------------------------
function TraceLadder({ phrase, methodKey, finding }) {
  const trace = finding?.projection?.dimensions?.trace;
  if (!trace) return <div style={{ fontSize: 11, color: "var(--obs-muted)" }}>אין Trace זמין למנוע עבור צירוף זה כרגע.</div>;
  const steps = Array.isArray(trace.steps) ? trace.steps : [];
  const nodes = [
    { label: "קלט", value: phrase },
    ...steps.map((s, i) => ({ label: typeof s === "object" && s?.label ? s.label : `שלב ${i + 1}`, value: typeof s === "string" ? s : (s?.value ?? JSON.stringify(s)) })),
    { label: trace.trace_kind || methodKey, value: trace.value, final: true },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {nodes.map((n, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden style={{ color: "var(--obs-muted)", fontSize: 13 }}>←</span>}
          <div style={{
            border: `1px solid ${n.final ? "var(--obs-gold)" : "var(--obs-line)"}`,
            background: n.final ? "rgba(231,199,107,.14)" : "rgba(255,255,255,.03)",
            borderRadius: 12, padding: "7px 11px", textAlign: "center", minWidth: 56,
          }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: n.final ? "var(--obs-gold)" : "var(--obs-ink)" }}>{String(n.value)}</div>
            <div style={{ fontSize: 8.5, color: "var(--obs-muted)", marginTop: 2 }}>{n.label}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function MethodTraceInline({ methodKey, phrase }) {
  const [state, setState] = useState({ loading: false, finding: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, finding: null });
    fetchGematriaMethodTrace(methodKey, phrase)
      .then((finding) => { if (alive) setState({ loading: false, finding }); })
      .catch(() => { if (alive) setState({ loading: false, finding: null }); });
    return () => { alive = false; };
  }, [methodKey, phrase]);
  if (state.loading) return <div style={{ fontSize: 11, color: "var(--obs-muted)" }}>טוען Trace…</div>;
  return (
    <div>
      <TraceLadder phrase={phrase} methodKey={methodKey} finding={state.finding} />
      <div style={{ fontSize: 9, color: "var(--obs-muted)", marginTop: 8 }}>מקור: gematria_method_trace (engine-verified) · Trace ≠ Finding ≠ Claim</div>
    </div>
  );
}

function MethodExplorer({ families }) {
  const [active, setActive] = useState(() => families?.[0]?.method || null);
  const [openPhrase, setOpenPhrase] = useState(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); setOpenPhrase(null); }, [active]);
  if (!families?.length) return null;
  const group = families.find((g) => g.method === active) || families[0];
  const phrases = group?.phrases || [];
  const shown = expanded ? phrases : phrases.slice(0, 10);
  return (
    <section style={{ marginTop: 30, border: "1px solid var(--obs-line)", borderRadius: 22, background: "rgba(255,255,255,.025)", padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.4, color: "var(--obs-gold)", marginBottom: 10 }}>🔭 מכשיר-מחקר · Method Explorer</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--obs-line)", paddingBottom: 12, marginBottom: 14 }}>
        {families.map((g) => (
          <button key={g.method} type="button" onClick={() => setActive(g.method)} style={{
            border: 0, borderBottom: `2px solid ${g.method === active ? "var(--obs-gold)" : "transparent"}`,
            background: "transparent",
            color: g.method === active ? "var(--obs-gold)" : "var(--obs-muted)",
            borderRadius: 0, padding: "6px 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", font: "inherit",
          }}>{g.registry?.display_label || g.method} <span style={{ opacity: 0.6, fontSize: 10.5 }}>· {g.count}</span></button>
        ))}
      </div>
      {phrases.length ? (
        <>
          <div style={{ display: "grid", gap: 6 }}>
            {shown.map((p, i) => (
              <div key={`${p.phrase}-${i}`}>
                <button type="button" onClick={() => setOpenPhrase(openPhrase === p.phrase ? null : p.phrase)} style={{
                  width: "100%", textAlign: "start", display: "flex", justifyContent: "space-between", gap: 8,
                  border: "1px solid var(--obs-line)", background: "rgba(255,255,255,.02)", borderRadius: 12,
                  padding: "9px 12px", cursor: "pointer", font: "inherit", color: "var(--obs-ink)",
                }}>
                  <span>{p.phrase} {p.world ? <span style={{ fontSize: 10, color: "var(--obs-gold)" }}>· {p.world}</span> : null}</span>
                  <span style={{ fontSize: 11, color: "var(--obs-muted)" }}>{openPhrase === p.phrase ? "סגור ▲" : "Trace ▾"}</span>
                </button>
                {openPhrase === p.phrase && (
                  <div style={{ padding: "10px 12px", border: "1px dashed var(--obs-line)", borderTop: 0, borderRadius: "0 0 12px 12px" }}>
                    <MethodTraceInline methodKey={group.method} phrase={p.phrase} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {phrases.length > 10 && (
            <button type="button" onClick={() => setExpanded((e) => !e)} style={{
              marginTop: 10, border: 0, background: "transparent", color: "var(--obs-blue)", fontWeight: 800,
              fontSize: 12.5, cursor: "pointer", font: "inherit",
            }}>{expanded ? "הצג פחות ▲" : `הצג עוד (${phrases.length - 10}) ▼`}</button>
          )}
          {!group.governed && (
            <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--obs-muted)" }}>שיטה זו מוצגת כהיסטורית/לא-מושלת (governed=false) — Rank, Don't Hide, אך אינה זהה-סמנטית לתוצאה מושלת.</div>
          )}
        </>
      ) : <div style={{ color: "var(--obs-muted)", fontSize: 12.5 }}>אין ביטויים בשיטה זו עבור מספר זה כרגע.</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. NUMBER DNA — unified mathematical identity (pi/Fibonacci data unchanged; Digit DNA is just
// the number's own digits split out, not a new claim).
// ---------------------------------------------------------------------------
function NumberDnaSection({ math, number }) {
  const fib = math?.fibonacci;
  const pi = math?.pi;
  const digits = String(number).split("");
  return (
    <section style={{ marginTop: 30, textAlign: "center" }}>
      <h2 style={{ fontSize: 13, margin: "0 0 14px", color: "var(--obs-gold)", letterSpacing: 1, fontWeight: 900 }}>{number} בתוך המתמטיקה · NUMBER DNA</h2>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 18 }}>
        {digits.map((d, i) => (
          <span key={i} style={{
            display: "inline-grid", placeItems: "center", width: 34, height: 34, borderRadius: 10,
            border: "1px solid var(--obs-line)", fontWeight: 900, fontSize: 16, color: "var(--obs-blue)",
          }}>{d}</span>
        ))}
      </div>
      <div style={{ display: "grid", gap: 10, maxWidth: 520, margin: "0 auto", textAlign: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid var(--obs-line)", paddingBottom: 8 }}>
          <b style={{ fontSize: 12.5, color: "var(--obs-gold)" }}>π</b>
          <span style={{ fontSize: 12.5, color: "var(--obs-muted)" }}>
            {!math ? "מחשב…" : pi?.status === "ok" ? (pi.result.found ? `מיקום ראשון: ספרה ${pi.result.first_position}` : `לא נמצא ב-${pi.search_depth.toLocaleString()} הספרות`) : "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid var(--obs-line)", paddingBottom: 8 }}>
          <b style={{ fontSize: 12.5, color: "var(--obs-gold)" }}>פיבונאצ׳י</b>
          <span style={{ fontSize: 12.5, color: "var(--obs-muted)" }}>
            {!math ? "מחשב…" : fib?.status === "ok" ? (fib.result.found ? `איבר מספר ${fib.result.first_position}` : "אינו איבר בסדרה") : "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, opacity: 0.55 }}>
          <b style={{ fontSize: 11.5 }}>ראשוניים · יחסים · גיאומטריה</b>
          <span style={{ fontSize: 11 }}>נקודת-הרחבה — ממתין לקורא קנוני מאומת</span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: "var(--obs-muted)", marginTop: 10 }}>fibonacciSequenceAdapter + piSequenceAdapter (Chudnovsky) · deterministic_computation · שום קשר לא-מומצא</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. EVIDENCE WALL — first item featured/larger (existing order, no invented score), rest
// secondary. Always full-frame object-fit:contain. Hint images keep the existing
// /archive?tab=pool&nums=<number> deep-link (audited — no per-image route exists).
// ---------------------------------------------------------------------------
function fmtDate(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "short", day: "numeric" }); } catch { return null; }
}

function EvidenceTile({ img, isHint, deepLink, onOpen, featured }) {
  const src = img.image_url || img.thumb_url;
  if (!src) return null;
  const date = fmtDate(img.occurred_at || img.created_at);
  const relatedNums = Array.isArray(img.all_values) ? img.all_values.filter((v) => String(v) !== String(img.primary_value)).slice(0, 3) : [];
  // Grid item sizing (gridColumn/gridRow) must live on the element that is the DIRECT child of the
  // grid container (the <Link> or <button> below) — putting it on a nested div silently no-ops.
  const gridStyle = featured ? { gridColumn: "span 2", gridRow: "span 2" } : undefined;
  const content = (
    <div style={{
      position: "relative", width: "100%", height: "100%", aspectRatio: featured ? "16/10" : "4/3",
      borderRadius: 14, overflow: "hidden", background: "#050403", border: "1px solid var(--obs-line)",
    }}>
      <img src={src} alt={img.name || img.description || "תמונה"} loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      {(isHint || date || relatedNums.length) && (
        <div style={{
          position: "absolute", insetInline: 0, bottom: 0, padding: "6px 8px 7px",
          background: "linear-gradient(0deg, rgba(0,0,0,.72), transparent)",
          display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center",
        }}>
          {isHint && <span style={{ fontSize: 9, fontWeight: 900, background: "rgba(231,199,107,.92)", color: "#1a1305", borderRadius: 999, padding: "2px 7px" }}>🌊 רמז מציאות</span>}
          {date && <span style={{ fontSize: 9, color: "#e8e8ea" }}>{date}</span>}
          {relatedNums.map((n) => <span key={n} style={{ fontSize: 9, color: "#c9d9e9" }}>#{n}</span>)}
        </div>
      )}
    </div>
  );
  return isHint
    ? <Link to={deepLink} title="פתח בזרם המציאות — מסונן לאותו מספר (הקשר מקורי)" style={{ textDecoration: "none", display: "block", ...gridStyle }}>{content}</Link>
    : <button type="button" onClick={onOpen} style={{ border: 0, background: "transparent", padding: 0, cursor: "zoom-in", display: "block", width: "100%", ...gridStyle }}>{content}</button>;
}

function EvidenceWall({ surface, hintIds, number }) {
  const [lightbox, setLightbox] = useState(null);
  const images = (surface?.galleries || []).slice(0, 12);
  const total = surface?.galleriesCount ?? images.length;
  const hintDeepLink = Number.isFinite(number) ? `/archive?tab=pool&nums=${encodeURIComponent(number)}` : "/archive";
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ fontSize: 19, margin: "0 0 4px" }}>קיר-הראיות · Evidence Wall</h2>
      <p style={{ fontSize: 11.5, color: "var(--obs-muted)", margin: "0 0 12px" }}>
        התמונה המלאה תמיד נשמרת (object-fit: contain) — אין חיתוך ראיה. תמונות-רמז מפנות לזרם המציאות, מסונן לאותו מספר.
      </p>
      {images.length ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gridAutoFlow: "dense", gap: 10 }}>
            {images.map((img, i) => (
              <EvidenceTile key={img.id} img={img} isHint={hintIds?.has(img.id)} deepLink={hintDeepLink} onOpen={() => setLightbox(img)} featured={i === 0} />
            ))}
          </div>
          {total > images.length && <div style={{ fontSize: 11, color: "var(--obs-muted)", marginTop: 8 }}>זהו חלון ראשון מתוך {fmt(total)} תמונות מחוברות.</div>}
        </>
      ) : <div style={{ color: "var(--obs-muted)", fontSize: 12.5 }}>אין תמונה מחוברת למספר זה כרגע.</div>}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, background: "rgba(2,4,8,.92)", zIndex: 200,
          display: "grid", placeItems: "center", padding: 24, cursor: "zoom-out",
        }}>
          <img src={lightbox.image_url || lightbox.thumb_url} alt={lightbox.name || ""}
            style={{ maxWidth: "94vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 10 }} />
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 7. REALITY PULSE / TIME — only rendered if the already-fetched gallery rows carry real dated
// evidence across at least 2 distinct years. No invented chronology, no separate Timeline system.
// ---------------------------------------------------------------------------
function RealityPulseStrip({ surface }) {
  const byYear = useMemo(() => {
    const rows = surface?.galleries || [];
    const counts = new Map();
    for (const row of rows) {
      const iso = row?.occurred_at || row?.created_at;
      if (!iso) continue;
      const year = new Date(iso).getFullYear();
      if (!Number.isFinite(year)) continue;
      counts.set(year, (counts.get(year) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]);
  }, [surface]);
  if (byYear.length < 2) return null;
  const max = Math.max(...byYear.map(([, c]) => c));
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ fontSize: 13, margin: "0 0 12px", color: "var(--obs-gold)", letterSpacing: 1, fontWeight: 900, textAlign: "center" }}>1237 לאורך זמן · Reality Pulse</h2>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, justifyContent: "center", height: 64, maxWidth: 640, margin: "0 auto" }}>
        {byYear.map(([year, count]) => (
          <div key={year} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 34 }}>
            <div style={{ width: 20, height: Math.max(6, (count / max) * 48), background: "linear-gradient(180deg,var(--obs-gold),transparent)", borderRadius: 4 }} title={`${count} תמונות`} />
            <span style={{ fontSize: 9.5, color: "var(--obs-muted)" }}>{year}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: "var(--obs-muted)", marginTop: 8, textAlign: "center" }}>לפי occurred_at/created_at של תמונות מחוברות — לא ציר-כרונולוגי נפרד, לא נתון-מומצא.</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 8. UNIVERSAL LENSES — ranked by real data strength, not a uniform grid. Zero stays out.
// ---------------------------------------------------------------------------
function rankTier(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "sm";
  if (n >= 10) return "lg";
  return "md";
}

function LensTile({ icon, label, value, to, rawValue }) {
  const tier = rankTier(rawValue);
  const inner = (
    <div style={{
      border: "1px solid var(--obs-line)", borderRadius: 14,
      padding: tier === "lg" ? "16px 12px" : tier === "md" ? "12px 10px" : "9px 8px",
      textAlign: "center", background: to ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.012)",
      opacity: to ? (tier === "sm" ? 0.55 : 1) : 0.45,
      gridColumn: tier === "lg" ? "span 2" : undefined,
    }}>
      <div style={{ fontSize: tier === "lg" ? 26 : tier === "md" ? 20 : 15 }}>{icon}</div>
      <div style={{ fontSize: tier === "lg" ? 13 : 10.5, fontWeight: 800, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: tier === "lg" ? 17 : 13, fontWeight: 900, color: "var(--obs-gold)", marginTop: 2 }}>{value}</div>
      {!to && <div style={{ fontSize: 8.5, color: "var(--obs-muted)", marginTop: 2 }}>תצוגה בלבד</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link> : inner;
}

function RankedLenses({ data, statusStatus }) {
  const topSlug = data.topics?.rows?.[0]?.slug || null;
  const postCount = statusStatus?.counts?.strictPosts;
  const postValue = statusStatus?.counts?.strictPostsCapped && postCount != null ? `${fmt(postCount)}+` : fmt(postCount);
  const items = [
    { icon: "🖼", label: "מציאות/תמונות", value: fmt(data.surface?.galleriesCount ?? data.surface?.galleries?.length), rawValue: data.surface?.galleriesCount ?? data.surface?.galleries?.length, to: "/archive" },
    { icon: "📖", label: "פוסטים", value: postValue, rawValue: postCount, to: null },
    { icon: "🧩", label: "התכנסויות", value: fmt(data.topics?.rows?.length), rawValue: data.topics?.rows?.length, to: topSlug ? `/topic/${encodeURIComponent(topSlug)}` : null },
    { icon: "🕸", label: "Graph", value: fmt(statusStatus?.counts?.graphEdges), rawValue: statusStatus?.counts?.graphEdges, to: null },
    { icon: "📚", label: "מקורות", value: fmt(data.sources?.length), rawValue: data.sources?.length, to: null },
    { icon: "🧭", label: "מסעות", value: data.journeys?.numberKnowledgeJourney ? "1" : "0", rawValue: data.journeys?.numberKnowledgeJourney ? 1 : 0, to: null },
    { icon: "🔠", label: "ELS", value: fmt(statusStatus?.counts?.ciphers), rawValue: statusStatus?.counts?.ciphers, to: "/code" },
    { icon: "⏱", label: "ציר זמן", value: data.timeline?.length ? fmt(data.timeline.length) : "0", rawValue: data.timeline?.length, to: null },
    { icon: "🔀", label: "הצלבה", value: "כלי", rawValue: 1, to: "/cross" },
    { icon: "🔬", label: "מחקר", value: fmt(data.research?.rows?.length), rawValue: data.research?.rows?.length, to: "/research" },
  ];
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ fontSize: 19, margin: "0 0 10px" }}>עדשות היקום · Universal Lenses</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
        {items.map((it) => <LensTile key={it.label} {...it} />)}
      </div>
      <div style={{ fontSize: 9.5, color: "var(--obs-muted)", marginTop: 8 }}>גודל-האריח נגזר מעוצמת-נתון אמיתית. אריחים ללא יעד קיים מוצגים כתצוגה-בלבד, לא כקישור מזויף.</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 9. Future 2D / Layers / 3D extension contract — subtle marker, no implementation.
// ---------------------------------------------------------------------------
function SpatialExtensionSection() {
  return (
    <section style={{ marginTop: 26, marginBottom: 6, textAlign: "center", opacity: 0.5 }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: 10.5, fontWeight: 800, color: "var(--obs-muted)", letterSpacing: 0.5 }}>
        <span>2D</span><span>·</span><span>Layers</span><span>·</span><span>3D</span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
export default function NumberGoldenCase1237Page() {
  const { value: rawValue } = useParams();
  const value = rawValue || "1237";
  const number = Number(value);

  const [data, setData] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [math, setMath] = useState(null);
  const [hintIds, setHintIds] = useState(null);
  const [statusStatus, setStatusStatus] = useState(null);
  const { setResearchContext, clearResearchContext } = useResearch();

  useEffect(() => {
    document.title = `${value} · Number Observatory (Golden Case Preview)`;
  }, [value]);

  useEffect(() => {
    let alive = true;
    setLoadState("loading");
    setData(null);
    fetchEntityHubProjection({ type: "number", key: value, relationLimit: 120, researchLimit: 60, topicLimit: 16 })
      .then((next) => {
        if (!alive) return;
        if (!next) { setLoadState("notfound"); return; }
        setData(next);
        setLoadState("ready");
      })
      .catch(() => { if (alive) setLoadState("error"); });
    return () => { alive = false; };
  }, [value]);

  useEffect(() => {
    if (!Number.isFinite(number) || number < 1) return;
    let alive = true;
    fetchMathDimensions(number).then((next) => { if (alive) setMath(next); });
    fetchRealityHintIdSet(number).then((next) => { if (alive) setHintIds(next); });
    return () => { alive = false; };
  }, [number]);

  useEffect(() => {
    if (!data?.identity?.nodeId) return;
    let alive = true;
    fetchNumberStatusProjection({ number, nodeId: data.identity.nodeId }).then((next) => { if (alive) setStatusStatus(next); });
    return () => { alive = false; };
  }, [data?.identity?.nodeId, number]);

  useEffect(() => {
    if (!data) return;
    setResearchContext({
      subject: { type: "number", key: value, label: data.identity.label },
      lens: "golden-case-1237",
      returnTo: typeof window !== "undefined" ? window.location.pathname : null,
    });
    return () => clearResearchContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loadState === "loading") return <Loading value={value} />;
  if (loadState !== "ready" || !data) return <NotFound value={value} />;

  const entity = {
    id: `number:${data.identity.label}`,
    type: "number",
    title: data.identity.label,
    link: `/number/${data.identity.label}`,
    metadata: { source: "golden-case-1237", node_id: data.identity.nodeId },
  };
  const relationGroups = Object.entries(groupRelations(data.graph.relations));

  return (
    <div className="entity-hub-observatory">
      <div className="obs-shell eh-func" style={{ paddingBottom: 60 }}>
        <NumberCore data={data} statusData={statusStatus} entity={entity} />
        <ZeroAxisSection zero={data.zeroScale} number={number} />
        <EquivalenceField families={data.gematria.families} phraseEntities={data.gematria.phraseEntities} label={data.identity.label} />
        <MethodExplorer families={data.gematria.families} />
        <NumberDnaSection math={math} number={number} />
        <EvidenceWall surface={data.surface} hintIds={hintIds} number={number} />
        <RealityPulseStrip surface={data.surface} />
        <RankedLenses data={data} statusStatus={statusStatus} />
        <AdvancedReadersPanel data={data} relationGroups={relationGroups} />
        <SpatialExtensionSection />
      </div>
    </div>
  );
}
