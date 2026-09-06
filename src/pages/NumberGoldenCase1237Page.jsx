import React, { useEffect, useState } from "react";
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

// NumberGoldenCase1237Page — UNIVERSAL_NUMBER_HUB_1237_GOLDEN_CASE_VISUAL_BUILD_V1.
// Preview-only Number Observatory composition. Every fact rendered here comes from an existing
// canonical reader (entityHubProjection / numberStatusProjection / gematriaTrace / the sequence
// adapters / getRealityHints) — this file adds no engine, no store, no schema, no truth.
// Reuses (verbatim, unmodified): EntityHubNumberStatusBoard, QuickActions, WatchButton,
// ResearchProvider actions, and the .entity-hub-observatory / .eh-func palette (already
// dual-theme per city_background_dual_theme_law — see EntityHubObservatory.css).

const fmt = (v) => (v == null ? "—" : new Intl.NumberFormat("he-IL").format(Number(v)));

function Loading({ value }) {
  // The number is the star even while live data is still arriving: show it immediately from the
  // URL param (no computation, no guess) rather than a blank loading screen.
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

// ---------------------------------------------------------------------------
// 1+2. Hero: giant number + central entity (only if live data supports it) + Zero control + dashboard + actions
// ---------------------------------------------------------------------------
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

function HeroSection({ data, entity, statusData }) {
  const number = Number(data.identity.label);
  // Only show a central-entity line when the live projection itself already resolved this
  // number's identity to a phrase (methodBridge is the Entity→Number side; for a number node we
  // instead look at whether any shown "מסתתר" phrase equals a phrase the Hub already links as an
  // entity — i.e. it exists as a real node, not a guess).
  const misratarFamily = (data.gematria.families || []).find((g) => g.method === "מסתתר");
  const linkedCentral = misratarFamily?.phrases?.find((p) => data.gematria.phraseEntities?.[p.phrase]) || null;

  return (
    <section className="obs-hero" style={{ marginTop: 8 }}>
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
        {linkedCentral && (
          <h1 style={{ marginTop: 2 }}>
            <Link to={data.gematria.phraseEntities[linkedCentral.phrase]?.href || `/number/${encodeURIComponent(linkedCentral.phrase)}`} style={{ color: "inherit", textDecoration: "none" }}>
              מסתתר · {linkedCentral.phrase}
            </Link>
          </h1>
        )}
        <p>מספר חי במערכת — כל הנתונים בעמוד זה נקראים ישירות מהמנוע והמאגר, בזמן אמת.</p>

        <div style={{ width: "min(760px,92%)", margin: "22px auto 0", textAlign: "start" }}>
          <EntityHubNumberStatusBoard data={data} relationGroups={Object.entries(groupRelations(data.graph.relations))} />
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
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

function groupRelations(relations) {
  const groups = {};
  for (const r of relations || []) {
    const name = r?.relationName || r?.kind || "קשר";
    (groups[name] ||= []).push(r);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// 3. Regular / SEO gematria summary
// ---------------------------------------------------------------------------
function PhraseLink({ phrase, world, ragil, tags, href }) {
  return (
    <Link to={href} style={{ textDecoration: "none", color: "inherit" }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--obs-line)",
        background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "8px 12px", fontSize: 13.5, fontWeight: 700,
      }}>
        {phrase}
        {world ? <span style={{ fontSize: 10, fontWeight: 800, color: "var(--obs-gold)", border: "1px solid rgba(231,199,107,.35)", borderRadius: 999, padding: "1px 6px" }}>{world}</span> : null}
        {ragil != null ? <span style={{ fontSize: 10, color: "var(--obs-muted)" }}>רגיל={ragil}</span> : null}
        {Array.isArray(tags) && tags[0] ? <span style={{ fontSize: 10, color: "var(--obs-muted)" }}>#{tags[0]}</span> : null}
      </span>
    </Link>
  );
}

function RegularGematriaSection({ families, phraseEntities, label }) {
  const [expanded, setExpanded] = useState(false);
  const regular = (families || []).find((g) => g.method === "רגיל");
  const phrases = regular?.phrases || [];
  const shown = expanded ? phrases : phrases.slice(0, 8);
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 19, margin: "0 0 4px" }}>ביטויים השווים ל־{label} · גימטריה רגילה</h2>
      <p style={{ fontSize: 11.5, color: "var(--obs-muted)", margin: "0 0 12px" }}>
        עובדת-מנוע (Regular gematria) — מוצג בלבד כשקיים ערך מאומת. פרשנות/רמז מופרדים תמיד מהעובדה עצמה.
      </p>
      {phrases.length ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {shown.map((p, i) => (
              <PhraseLink key={`${p.phrase}-${i}`} phrase={p.phrase} world={p.world} ragil={p.ragil} tags={p.tags}
                href={phraseEntities?.[p.phrase]?.href || `/number/${encodeURIComponent(p.phrase)}`} />
            ))}
          </div>
          {phrases.length > 8 && (
            <button type="button" onClick={() => setExpanded((e) => !e)} style={{
              marginTop: 10, border: 0, background: "transparent", color: "var(--obs-blue)", fontWeight: 800,
              fontSize: 12.5, cursor: "pointer", font: "inherit",
            }}>{expanded ? "הצג פחות ▲" : `הצג עוד (${phrases.length - 8}) ▼`}</button>
          )}
        </>
      ) : <div style={{ color: "var(--obs-muted)", fontSize: 12.5 }}>אין ביטוי מאומת בגימטריה רגילה עבור מספר זה כרגע.</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. Fixed Method Panel — tabs derived from the live registry, not hardcoded
// ---------------------------------------------------------------------------
function MethodTraceInline({ methodKey, phrase }) {
  const [state, setState] = useState({ loading: false, finding: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, finding: null, error: null });
    fetchGematriaMethodTrace(methodKey, phrase)
      .then((finding) => { if (alive) setState({ loading: false, finding, error: finding ? null : "no-trace" }); })
      .catch((e) => { if (alive) setState({ loading: false, finding: null, error: String(e?.message || e) }); });
    return () => { alive = false; };
  }, [methodKey, phrase]);
  if (state.loading) return <div style={{ fontSize: 11, color: "var(--obs-muted)" }}>טוען Trace…</div>;
  const trace = state.finding?.projection?.dimensions?.trace;
  if (!trace) return <div style={{ fontSize: 11, color: "var(--obs-muted)" }}>אין Trace זמין למנוע עבור צירוף זה כרגע.</div>;
  return (
    <div style={{ fontSize: 11.5, lineHeight: 1.6 }}>
      <div><b style={{ color: "var(--obs-gold)" }}>ערך מנוע:</b> {trace.value} · {trace.trace_kind || methodKey}</div>
      {Array.isArray(trace.steps) && trace.steps.length ? (
        <div style={{ color: "var(--obs-muted)", marginTop: 4 }}>{trace.steps.map((s, i) => (
          <div key={i}>· {typeof s === "string" ? s : JSON.stringify(s)}</div>
        ))}</div>
      ) : null}
      <div style={{ fontSize: 9.5, color: "var(--obs-muted)", marginTop: 6 }}>מקור: gematria_method_trace (engine-verified)</div>
    </div>
  );
}

function MethodPanel({ families }) {
  const [active, setActive] = useState(() => families?.[0]?.method || null);
  const [openPhrase, setOpenPhrase] = useState(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); setOpenPhrase(null); }, [active]);
  if (!families?.length) return null;
  const group = families.find((g) => g.method === active) || families[0];
  const phrases = group?.phrases || [];
  const shown = expanded ? phrases : phrases.slice(0, 10);
  return (
    <section style={{ marginTop: 26, border: "1px solid var(--obs-line)", borderRadius: 20, background: "rgba(255,255,255,.03)", padding: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.4, color: "var(--obs-gold)", marginBottom: 8 }}>שיטת גימטריה — פאנל קבוע</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--obs-line)", paddingBottom: 10, marginBottom: 12 }}>
        {families.map((g) => (
          <button key={g.method} type="button" onClick={() => setActive(g.method)} style={{
            border: `1px solid ${g.method === active ? "var(--obs-gold)" : "var(--obs-line)"}`,
            background: g.method === active ? "rgba(231,199,107,.16)" : "transparent",
            color: g.method === active ? "var(--obs-gold)" : "var(--obs-ink)",
            borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", font: "inherit",
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
                  <span style={{ fontSize: 11, color: "var(--obs-muted)" }}>{openPhrase === p.phrase ? "סגור ▲" : "פרוט ▾"}</span>
                </button>
                {openPhrase === p.phrase && (
                  <div style={{ padding: "8px 12px", border: "1px dashed var(--obs-line)", borderTop: 0, borderRadius: "0 0 12px 12px" }}>
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
            <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--obs-muted)" }}>שיטה זו מוצגת כהיסטורית/לא-מושלת (governed=false) — עדיין ל-Rank, Don't Hide, אך אינה זהה-סמנטית לתוצאה מושלת.</div>
          )}
        </>
      ) : <div style={{ color: "var(--obs-muted)", fontSize: 12.5 }}>אין ביטויים בשיטה זו עבור מספר זה כרגע.</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. Mathematical / structural dimensions — only real, verified facts
// ---------------------------------------------------------------------------
function MathDimensionsSection({ math, number }) {
  const fib = math?.fibonacci;
  const pi = math?.pi;
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 19, margin: "0 0 10px" }}>מבנה מתמטי / מספרי</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <div style={{ border: "1px solid var(--obs-line)", borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: "var(--obs-gold)" }}>פיבונאצ׳י</div>
          {!math ? <div style={{ color: "var(--obs-muted)", fontSize: 12, marginTop: 6 }}>מחשב…</div> : fib?.status === "ok" ? (
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {fib.result.found
                ? <>‏{number} הוא איבר מספר <b>{fib.result.first_position}</b> בסדרת פיבונאצ׳י.</>
                : <>‏{number} <b>אינו</b> איבר בסדרת פיבונאצ׳י (נבדק עד {fib.search_depth.toLocaleString()} איברים).</>}
              <div style={{ fontSize: 9.5, color: "var(--obs-muted)", marginTop: 6 }}>fibonacciSequenceAdapter · deterministic_computation</div>
            </div>
          ) : <div style={{ color: "var(--obs-muted)", fontSize: 12, marginTop: 6 }}>אין תוצאה זמינה.</div>}
        </div>
        <div style={{ border: "1px solid var(--obs-line)", borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: "var(--obs-gold)" }}>π (פאי)</div>
          {!math ? <div style={{ color: "var(--obs-muted)", fontSize: 12, marginTop: 6 }}>מחשב…</div> : pi?.status === "ok" ? (
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {pi.result.found
                ? <>הרצף «{number}» מופיע לראשונה במקום הספרה <b>{pi.result.first_position}</b> אחרי הנקודה בפאי.</>
                : <>הרצף «{number}» לא נמצא ב־{pi.search_depth.toLocaleString()} הספרות הראשונות של פאי.</>}
              <div style={{ fontSize: 9.5, color: "var(--obs-muted)", marginTop: 6 }}>piSequenceAdapter (Chudnovsky) · deterministic_computation</div>
            </div>
          ) : <div style={{ color: "var(--obs-muted)", fontSize: 12, marginTop: 6 }}>אין תוצאה זמינה.</div>}
        </div>
        <div style={{ border: "1px dashed var(--obs-line)", borderRadius: 16, padding: 14, opacity: 0.7 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: "var(--obs-muted)" }}>ראשוניים · יחסים · מבנה ספרות</div>
          <div style={{ fontSize: 12, marginTop: 6, color: "var(--obs-muted)" }}>נקודת-הרחבה עתידית — ממתין לקורא/מנוע קנוני מאומת לפני הצגת נתון. לא ממציאים קשר.</div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. Reality / Gallery images — full frame, never cropped; hint vs ordinary
// ---------------------------------------------------------------------------
function GalleryTile({ img, isHint, onOpen }) {
  const src = img.image_url || img.thumb_url;
  if (!src) return null;
  const content = (
    <div style={{
      position: "relative", aspectRatio: "4/3", borderRadius: 14, overflow: "hidden",
      background: "#050403", border: "1px solid var(--obs-line)",
    }}>
      <img src={src} alt={img.name || img.description || "תמונה"} loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      {isHint && (
        <span style={{
          position: "absolute", top: 8, insetInlineStart: 8, fontSize: 9.5, fontWeight: 900,
          background: "rgba(231,199,107,.92)", color: "#1a1305", borderRadius: 999, padding: "3px 8px",
        }}>🌊 רמז מציאות</span>
      )}
    </div>
  );
  return isHint
    ? <Link to="/archive" title="פתח בזרם המציאות (הקשר מקורי)" style={{ textDecoration: "none" }}>{content}</Link>
    : <button type="button" onClick={onOpen} style={{ border: 0, background: "transparent", padding: 0, cursor: "zoom-in" }}>{content}</button>;
}

function RealityGallerySection({ surface, hintIds }) {
  const [lightbox, setLightbox] = useState(null);
  const images = (surface?.galleries || []).slice(0, 12);
  const total = surface?.galleriesCount ?? images.length;
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 19, margin: "0 0 4px" }}>מציאות · תמונות מחוברות</h2>
      <p style={{ fontSize: 11.5, color: "var(--obs-muted)", margin: "0 0 12px" }}>
        התמונה המלאה תמיד נשמרת (object-fit: contain) — אין חיתוך ראיה. תמונות-רמז מפנות לזרם המציאות (ההקשר המקורי נשאר שם).
      </p>
      {images.length ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
            {images.map((img) => (
              <GalleryTile key={img.id} img={img} isHint={hintIds?.has(img.id)} onOpen={() => setLightbox(img)} />
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
// 7. Universal Lenses — entry architecture only, real counts, no fake numbers, no Zero here
// ---------------------------------------------------------------------------
function LensTile({ icon, label, value, to }) {
  const inner = (
    <div style={{
      border: "1px solid var(--obs-line)", borderRadius: 14, padding: "12px 10px", textAlign: "center",
      background: to ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.015)", opacity: to ? 1 : 0.55,
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: "var(--obs-gold)", marginTop: 2 }}>{value}</div>
      {!to && <div style={{ fontSize: 9, color: "var(--obs-muted)", marginTop: 2 }}>תצוגה בלבד · בקרוב</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link> : inner;
}

function UniversalLensesSection({ data, statusStatus }) {
  const topSlug = data.topics?.rows?.[0]?.slug || null;
  const postCount = statusStatus?.counts?.strictPosts;
  const postValue = statusStatus?.counts?.strictPostsCapped && postCount != null ? `${fmt(postCount)}+` : fmt(postCount);
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 19, margin: "0 0 10px" }}>עדשות היקום · Universal Lenses</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
        <LensTile icon="🖼" label="מציאות/תמונות" value={fmt(data.surface?.galleriesCount ?? data.surface?.galleries?.length)} to="/archive" />
        <LensTile icon="📖" label="פוסטים" value={postValue} to={null} />
        <LensTile icon="🧩" label="התכנסויות" value={fmt(data.topics?.rows?.length)} to={topSlug ? `/topic/${encodeURIComponent(topSlug)}` : null} />
        <LensTile icon="🕸" label="Graph" value={fmt(statusStatus?.counts?.graphEdges)} to={null} />
        <LensTile icon="📚" label="מקורות" value={fmt(data.sources?.length)} to={null} />
        <LensTile icon="🧭" label="מסעות" value={data.journeys?.numberKnowledgeJourney ? "1" : "0"} to={null} />
        <LensTile icon="🔠" label="ELS" value={fmt(statusStatus?.counts?.ciphers)} to="/code" />
        <LensTile icon="⏱" label="ציר זמן" value={data.timeline?.length ? fmt(data.timeline.length) : "0"} to={null} />
        <LensTile icon="🔀" label="הצלבה" value="כלי" to="/cross" />
        <LensTile icon="🔬" label="מחקר" value={fmt(data.research?.rows?.length)} to="/research" />
      </div>
      <div style={{ fontSize: 9.5, color: "var(--obs-muted)", marginTop: 8 }}>מציג ארכיטקטורת-כניסה ראשונית בלבד. אריחים ללא יעד קיים מוצגים כתצוגה-בלבד ולא כקישור מזויף.</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 8. Spatial / 2D / 3D extension point — contract space only, nothing implemented
// ---------------------------------------------------------------------------
function SpatialExtensionSection() {
  return (
    <section style={{ marginTop: 26, marginBottom: 10, border: "1px dashed var(--obs-line)", borderRadius: 16, padding: 14, textAlign: "center", opacity: 0.75 }}>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", fontSize: 12.5, fontWeight: 800, color: "var(--obs-muted)" }}>
        <span>2D</span><span>|</span><span>Layers</span><span>|</span><span>3D</span>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--obs-muted)", marginTop: 6 }}>
        נקודת-הרחבה עתידית: אותו Reality Graph יוצג מרחבית מעל אותם Methods/Worlds/Topics/מקורות/מסעות — לא מיושם ב-V1 זה.
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

  return (
    <div className="entity-hub-observatory">
      <div className="obs-shell eh-func" style={{ paddingBottom: 60 }}>
        <HeroSection data={data} entity={entity} statusData={statusStatus} />
        <RegularGematriaSection families={data.gematria.families} phraseEntities={data.gematria.phraseEntities} label={data.identity.label} />
        <MethodPanel families={data.gematria.families} />
        <MathDimensionsSection math={math} number={number} />
        <RealityGallerySection surface={data.surface} hintIds={hintIds} />
        <UniversalLensesSection data={data} statusStatus={statusStatus} />
        <SpatialExtensionSection />
      </div>
    </div>
  );
}
