import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { C, F, calcGem } from "../theme.js";
import { getEntityBundle } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { useNumberDrawer, openNumberDrawer, closeNumberDrawer, toggleNumberDrawer } from "../lib/numberDrawer.js";

// ===== מגירת המספר — פאנל צף גלובלי =====
// צף באוויר בצד ימין, נשאר פתוח גם בניווט, עם בועה צפה לפתיחה וחוט שמצביע
// למיקום המספר בתוך הפוסט. גלריות חדשות (לפי תאריך) למעלה.

const PW = () => Math.min(380, (typeof window !== "undefined" ? window.innerWidth : 380) * 0.92);

export default function NumberDrawer() {
  const { open, term } = useNumberDrawer();
  const nav = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calc, setCalc] = useState("");
  const [zoom, setZoom] = useState(null);
  const [thread, setThread] = useState(null);

  const isNumber = term && /^\d+$/.test(term);
  const value = term ? (isNumber ? Number(term) : calcGem(term)) : null;

  useEffect(() => {
    if (!open || !term) { if (!term) setBundle(null); return; }
    if (isNumber && value < 10) { setBundle({ tooSmall: true }); return; }
    let alive = true; setLoading(true); setBundle(null);
    getEntityBundle({ term, value, isNumber })
      .then(b => { if (alive) { setBundle(b); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, term, value, isNumber]);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") { if (zoom) setZoom(null); else closeNumberDrawer(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom]);

  // חוט אל המספר המודגש בפוסט
  useEffect(() => {
    if (!open) { setThread(null); return; }
    const tick = () => {
      const mark = document.querySelector(".sod-hl");
      if (!mark) { setThread(null); return; }
      const r = mark.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) { setThread(null); return; }
      const w = PW(); const ax = window.innerWidth - 16 - w + 10; const ay = 150;
      setThread({ ax, ay, bx: r.left + r.width / 2, by: r.top + r.height / 2 });
    };
    tick();
    const iv = setInterval(tick, 180);
    window.addEventListener("scroll", tick, true);
    window.addEventListener("resize", tick);
    return () => { clearInterval(iv); window.removeEventListener("scroll", tick, true); window.removeEventListener("resize", tick); };
  }, [open]);

  function goCalc(e) { e.preventDefault(); const v = calc.trim(); if (v) { setCalc(""); openNumberDrawer(v); } }
  function goTo(to) { nav(to); }   // לא סוגר — הפאנל צף ונשאר

  const b = bundle || {};

  return (
    <>
      {/* בועה צפה — פותחת/סוגרת */}
      <button onClick={() => toggleNumberDrawer()} aria-label="מגירת המספר" style={{
        position: "fixed", insetInlineEnd: open ? "calc(min(380px,92vw) + 26px)" : "20px", bottom: 22, zIndex: 160,
        width: 56, height: 56, borderRadius: "50%", cursor: "pointer", border: `1px solid ${C.goldBright}`,
        background: "radial-gradient(circle at 38% 32%, #fff6d8, #d4af37 60%, #1a0e00)", color: "#241500",
        fontSize: 24, fontWeight: 800, boxShadow: `0 0 24px ${C.gold}aa, 0 6px 24px rgba(0,0,0,0.5)`,
        transition: "inset-inline-end .34s cubic-bezier(.2,.8,.2,1)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>🔢</button>

      {/* חוט אל הפוסט */}
      {open && thread && (
        <svg style={{ position: "fixed", inset: 0, zIndex: 149, pointerEvents: "none" }}>
          <path d={`M ${thread.ax} ${thread.ay} Q ${(thread.ax + thread.bx) / 2} ${thread.ay}, ${thread.bx} ${thread.by}`}
            fill="none" stroke={C.goldBright} strokeWidth="2" strokeDasharray="6 6" opacity="0.85" />
          <circle cx={thread.bx} cy={thread.by} r="7" fill="none" stroke={C.goldBright} strokeWidth="2">
            <animate attributeName="r" values="6;11;6" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </svg>
      )}

      {/* הפאנל הצף */}
      <aside style={{
        position: "fixed", top: 72, bottom: 16, insetInlineEnd: 16, width: "min(380px, 92vw)", zIndex: 150,
        background: "linear-gradient(160deg, rgba(13,10,24,0.97), rgba(7,5,16,0.97))", backdropFilter: "blur(10px)",
        border: `1px solid ${C.borderGold}`, borderRadius: 18, boxShadow: `0 18px 60px rgba(0,0,0,0.7), 0 0 30px ${C.gold}22`,
        direction: "rtl", display: "flex", flexDirection: "column", overflow: "hidden",
        transform: open ? "translateX(0)" : "translateX(calc(100% + 26px))",
        opacity: open ? 1 : 0, transition: "transform .34s cubic-bezier(.2,.8,.2,1), opacity .3s",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>מגירת המספר</div>
            {term && <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              {!isNumber && <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>{term}</span>}
              <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</span>
            </div>}
          </div>
          <button onClick={() => closeNumberDrawer()} aria-label="סגור" style={{ background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, fontSize: 19, cursor: "pointer", borderRadius: 8, width: 36, height: 36, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        <form onSubmit={goCalc} style={{ display: "flex", gap: 6, padding: "11px 13px", borderBottom: `1px solid ${C.border}` }}>
          <input value={calc} onChange={e => setCalc(e.target.value)} placeholder="🔢 חשב גימטריה / מספר…"
            style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "9px 12px", outline: "none" }} />
          <button type="submit" style={{ background: C.gold, color: "#1a0e00", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, padding: "0 14px", cursor: "pointer" }}>←</button>
        </form>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 15px 36px" }}>
          {!term ? (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, marginTop: 4 }}>הקלידו מספר או מילה למעלה, או היכנסו לאחד מהמרחבים:</p>
              <button onClick={() => goTo("/numbers")} style={bigLink}>🌳 כל המספרים (העץ)</button>
              <button onClick={() => goTo("/archive")} style={bigLink}>🖼 גלריית רמזי הגאולה</button>
              <button onClick={() => goTo("/sulamot")} style={bigLink}>🪜 סולמות ההתגלות</button>
            </div>
          ) : b.tooSmall ? (
            <div style={{ textAlign: "center", padding: "26px 8px" }}>
              <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.9 }}>מספר יסוד (ספרה בודדת) — בסולמות ההתגלות.</p>
              <button onClick={() => goTo("/sulamot")} style={bigLink}>🪜 לסולמות →</button>
            </div>
          ) : loading ? (
            <div style={{ color: C.muted, textAlign: "center", padding: 28, fontFamily: F.body }}>טוען קשרים…</div>
          ) : (
            <>
              {b.galleries?.length > 0 && (
                <Section title={`🖼 גלריות · חדשות למעלה (${b.galleriesCount})`}>
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
              {b.phrases?.length > 0 && (
                <Section title={`🌳 מילים שוות (${b.phrases.length})`}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {b.phrases.map((p, i) => <button key={i} onClick={() => openNumberDrawer(p.phrase)} style={chip}>{p.phrase}</button>)}
                  </div>
                </Section>
              )}
              {b.posts?.length > 0 && (
                <Section title={`📖 פוסטים (${b.postsCount})`}>
                  <div style={{ display: "grid", gap: 6 }}>
                    {b.posts.map(p => (
                      <button key={p.wp_id || p.slug} onClick={() => goTo(`/${p.slug}?n=${isNumber ? value : encodeURIComponent(term)}`)} style={row}>
                        {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                      </button>
                    ))}
                  </div>
                </Section>
              )}
              <button onClick={() => goTo(`/number/${encodeURIComponent(term)}`)} style={{ ...bigLink, marginTop: 6 }}>הדף המלא של {value} →</button>
            </>
          )}
        </div>
      </aside>

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
const bigLink = { width: "100%", cursor: "pointer", textAlign: "center", background: "rgba(20,15,12,0.6)", color: C.goldBright, border: `1px solid ${C.borderGold}`, borderRadius: 10, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "12px" };

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 15, fontWeight: 700, marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}
