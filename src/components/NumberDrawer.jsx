import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C, F, calcGem } from "../theme.js";
import { getEntityBundle } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { useNumberDrawer, openNumberDrawer, closeNumberDrawer } from "../lib/numberDrawer.js";

// ===== מגירת המספר — פאנל צדדי גלובלי (נשלף מהקיר הימני) =====
// נפתח בכל חיפוש/לחיצה על מספר. מציג: מחשבון גימטריה, גלריות בהקשר (עם הטקסט מתחת),
// מילים שוות, מספרים מקבילים, פוסטים — וקישור לדף הישות המלא. תקף בכל דף באתר.

export default function NumberDrawer() {
  const { open, term } = useNumberDrawer();
  const nav = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calc, setCalc] = useState("");
  const [zoom, setZoom] = useState(null);

  const isNumber = term && /^\d+$/.test(term);
  const value = term ? (isNumber ? Number(term) : calcGem(term)) : null;

  useEffect(() => {
    if (!open || !term) return;
    if (isNumber && value < 10) { setBundle({ tooSmall: true }); return; }
    let alive = true; setLoading(true); setBundle(null);
    getEntityBundle({ term, value, isNumber })
      .then(b => { if (alive) { setBundle(b); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, term, value, isNumber]);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") { setZoom(null); closeNumberDrawer(); } };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function goCalc(e) { e.preventDefault(); const v = calc.trim(); if (v) { setCalc(""); openNumberDrawer(v); } }
  function goTo(to) { closeNumberDrawer(); nav(to); }

  const b = bundle || {};

  return (
    <>
      {/* רקע */}
      <div onClick={() => closeNumberDrawer()} style={{
        position: "fixed", inset: 0, zIndex: 140, background: "rgba(3,2,8,0.5)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s",
      }} />
      {/* פאנל */}
      <aside style={{
        position: "fixed", top: 0, bottom: 0, insetInlineEnd: 0, width: "min(420px, 94vw)", zIndex: 150,
        background: "linear-gradient(160deg, #0d0a18, #070510)", borderInlineStart: `1px solid ${C.borderGold}`,
        boxShadow: "-12px 0 50px rgba(0,0,0,0.6)", direction: "rtl",
        transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform .34s cubic-bezier(.2,.8,.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* כותרת */}
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>מגירת המספר</div>
            {term && <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              {!isNumber && <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>{term}</span>}
              <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value}</span>
            </div>}
          </div>
          <button onClick={() => closeNumberDrawer()} aria-label="סגור" style={{
            background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright,
            fontSize: 20, cursor: "pointer", borderRadius: 8, width: 38, height: 38, lineHeight: 1, flexShrink: 0,
          }}>×</button>
        </div>

        {/* מחשבון גימטריה */}
        <form onSubmit={goCalc} style={{ display: "flex", gap: 6, padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <input value={calc} onChange={e => setCalc(e.target.value)} placeholder="🔢 חשב גימטריה / מספר…"
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "9px 12px", outline: "none" }} />
          <button type="submit" style={{ background: C.gold, color: "#1a0e00", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, padding: "0 14px", cursor: "pointer" }}>←</button>
        </form>

        {/* תוכן */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 40px" }}>
          {b.tooSmall ? (
            <div style={{ textAlign: "center", padding: "30px 10px" }}>
              <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.9 }}>מספר יסוד (ספרה בודדת) — חוקרים אותו בסולמות ההתגלות.</p>
              <button onClick={() => goTo("/sulamot")} style={{ background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, color: "#1a0e00", border: "none", borderRadius: 8, fontWeight: 800, padding: "10px 18px", cursor: "pointer" }}>🪜 לסולמות →</button>
            </div>
          ) : loading ? (
            <div style={{ color: C.muted, textAlign: "center", padding: 30, fontFamily: F.body }}>טוען קשרים…</div>
          ) : !term ? null : (
            <>
              {/* גלריות בהקשר */}
              {b.galleries?.length > 0 && (
                <Section title={`🖼 גלריות (${b.galleriesCount})`}>
                  <div style={{ display: "grid", gap: 14 }}>
                    {b.galleries.map(g => (
                      <div key={g.id}>
                        <button onClick={() => setZoom(g)} style={{ display: "block", width: "100%", padding: 0, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "#000" }}>
                          <img src={g.image_url} alt={g.name || ""} loading="lazy" style={{ width: "100%", display: "block" }} />
                        </button>
                        {(g.name || g.description) && (
                          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginTop: 5, maxHeight: 84, overflow: "hidden" }}>
                            {g.name ? <b style={{ color: C.goldLight }}>{g.name}. </b> : null}{stripHtml(g.description || "").slice(0, 180)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {/* מילים שוות */}
              {b.phrases?.length > 0 && (
                <Section title={`🌳 מילים שוות (${b.phrases.length})`}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {b.phrases.map((p, i) => (
                      <button key={i} onClick={() => openNumberDrawer(p.phrase)} style={chip}>{p.phrase}</button>
                    ))}
                  </div>
                </Section>
              )}
              {/* פוסטים */}
              {b.posts?.length > 0 && (
                <Section title={`📖 פוסטים (${b.postsCount})`}>
                  <div style={{ display: "grid", gap: 6 }}>
                    {b.posts.map(p => (
                      <button key={p.wp_id || p.slug} onClick={() => goTo(`/${p.slug}?n=${isNumber ? value : encodeURIComponent(term)}`)} style={{ ...row }}>
                        {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                      </button>
                    ))}
                  </div>
                </Section>
              )}
              {/* קישור לדף מלא */}
              <button onClick={() => goTo(`/number/${encodeURIComponent(term)}`)} style={{
                width: "100%", marginTop: 8, background: "rgba(20,15,12,0.6)", color: C.goldBright,
                border: `1px solid ${C.borderGold}`, borderRadius: 10, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "11px", cursor: "pointer",
              }}>הדף המלא של {value} →</button>
            </>
          )}
        </div>
      </aside>

      {/* zoom של תמונה בהקשר */}
      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, direction: "rtl" }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "min(760px,96vw)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ textAlign: "left", marginBottom: 8 }}>
              <button onClick={() => setZoom(null)} style={{ background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, fontSize: 22, cursor: "pointer", borderRadius: 8, width: 42, height: 42 }}>×</button>
            </div>
            <img src={zoom.image_url} alt="" style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.borderGold}` }} />
            {(zoom.name || zoom.description) && (
              <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, marginTop: 10, whiteSpace: "pre-wrap" }}>
                {zoom.name ? <b style={{ color: C.goldLight }}>{zoom.name}{"\n"}</b> : null}{stripHtml(zoom.description || "")}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const chip = { cursor: "pointer", color: C.goldLight, fontFamily: F.body, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 999, padding: "5px 12px", background: "rgba(20,15,12,0.5)" };
const row = { cursor: "pointer", textAlign: "right", color: C.goldLight, fontFamily: F.regal, fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, background: "rgba(20,15,12,0.5)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" };

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 15, fontWeight: 700, marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}
