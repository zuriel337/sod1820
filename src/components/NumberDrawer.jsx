import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { C, F, calcGem } from "../theme.js";
import { getEntityBundle } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { useNumberDrawer, openNumberDrawer, closeNumberDrawer, toggleNumberDrawer } from "../lib/numberDrawer.js";
import { METHODS } from "../lib/gematria.js";

const M3 = METHODS.filter(m => ["רגיל", "מסתתר", "מילוי"].includes(m.key));

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
  const [webs, setWebs] = useState([]);     // חוטים פנימיים: מהמספר אל כל גלריה במגירה
  const asideRef = useRef(null);
  const headRef = useRef(null);
  const scrollRef = useRef(null);

  const isNumber = term && /^\d+$/.test(term);
  const value = term ? (isNumber ? Number(term) : calcGem(term)) : null;
  const threeVals = (term && !isNumber) ? M3.map(m => ({ key: m.key, v: m.fn(term) })) : null;

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

  // חוטים אל המספר המסומן בעמוד (פוסט / גלריה) — תומך בכמה יעדים בו-זמנית.
  useEffect(() => {
    if (!open) { setThread(null); return; }
    const tick = () => {
      const marks = document.querySelectorAll(".sod-hl, .sod-thread-target");
      const w = PW(); const ax = window.innerWidth - 16 - w + 10; const ay = 150;
      const out = [];
      marks.forEach(m => {
        const r = m.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) return;
        out.push({ ax, ay, bx: r.left + r.width / 2, by: r.top + r.height / 2 });
      });
      setThread(out.slice(0, 8));
    };
    tick();
    const iv = setInterval(tick, 180);
    window.addEventListener("scroll", tick, true);
    window.addEventListener("resize", tick);
    return () => { clearInterval(iv); window.removeEventListener("scroll", tick, true); window.removeEventListener("resize", tick); };
  }, [open]);

  // חוטים פנימיים במגירה — מהמספר (בכותרת) אל כל פריט מחובר (גלריה/מילה/פוסט). כך החוטים תמיד נראים.
  useEffect(() => {
    if (!open || !term) { setWebs([]); return; }
    const tick = () => {
      const aside = asideRef.current, head = headRef.current, scroll = scrollRef.current;
      if (!aside || !head || !scroll) { setWebs([]); return; }
      const ar = aside.getBoundingClientRect();
      const hr = head.getBoundingClientRect();
      const sr = scroll.getBoundingClientRect();
      // מקור החוטים — תחת המספר, בראש אזור התוצאות (כדי לא לחצות את המחשבון)
      const sx = hr.left + hr.width / 2 - ar.left, sy = sr.top - ar.top + 6;
      const nodes = scroll.querySelectorAll(".nd-node");
      const out = [];
      nodes.forEach(n => {
        const r = n.getBoundingClientRect();
        if (r.bottom < sr.top + 4 || r.top > sr.bottom - 2 || r.width === 0) return;   // רק מה שגלוי באזור הנגלל
        out.push({ x1: sx, y1: sy, x2: r.right - ar.left - 4, y2: r.top - ar.top + Math.min(r.height / 2, 26) });
      });
      setWebs(out.slice(0, 14));
    };
    tick();
    const iv = setInterval(tick, 200);
    const sc = scrollRef.current;
    sc && sc.addEventListener("scroll", tick);
    window.addEventListener("resize", tick);
    return () => { clearInterval(iv); sc && sc.removeEventListener("scroll", tick); window.removeEventListener("resize", tick); };
  }, [open, term, bundle]);

  function goCalc(e) { e.preventDefault(); const v = calc.trim(); if (v) { setCalc(""); openNumberDrawer(v); } }
  function goTo(to) { nav(to); }   // לא סוגר — הפאנל צף ונשאר

  const b = bundle || {};

  // הסרגל הצף נפתח רק בהקשר (לחיצה על מספר בפוסט/גלריה) — אין בועה גלובלית קבועה.
  return (
    <>

      {/* חוטים אל המספר בעמוד (פוסט / גלריה) */}
      {open && thread?.length > 0 && (
        <svg style={{ position: "fixed", inset: 0, zIndex: 149, pointerEvents: "none" }}>
          {thread.map((t, i) => (
            <g key={i}>
              <path d={`M ${t.ax} ${t.ay} Q ${(t.ax + t.bx) / 2} ${t.ay}, ${t.bx} ${t.by}`}
                fill="none" stroke={C.goldBright} strokeWidth="2" strokeDasharray="6 6" opacity="0.85" />
              <circle cx={t.bx} cy={t.by} r="7" fill="none" stroke={C.goldBright} strokeWidth="2">
                <animate attributeName="r" values="6;11;6" dur="1.4s" repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>
      )}

      {/* הפאנל הצף */}
      <aside ref={asideRef} style={{
        position: "fixed", top: 72, bottom: 16, right: 16, width: "min(380px, 92vw)", zIndex: 150,
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
              <span ref={headRef} style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</span>
            </div>}
          </div>
          <button onClick={() => closeNumberDrawer()} aria-label="סגור" style={{ background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, fontSize: 19, cursor: "pointer", borderRadius: 8, width: 36, height: 36, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        <form onSubmit={goCalc} style={{ padding: "10px 13px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>🧮 מחשבון גימטריה</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={calc} onChange={e => setCalc(e.target.value)} placeholder="הקלידו מילה או מספר…"
              style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "9px 12px", outline: "none" }} />
            <button type="submit" style={{ background: C.gold, color: "#1a0e00", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, padding: "0 14px", cursor: "pointer" }}>←</button>
          </div>
          {calc.trim() && !/^\d+$/.test(calc.trim()) && (
            <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 13, marginTop: 6 }}>
              {calc.trim()} = <b>{calcGem(calc.trim())}</b>
            </div>
          )}
        </form>

        {/* מיני-מחשבון: 3 שיטות + מעבר למחשבון המלא בבית המדרש */}
        {threeVals && (
          <div style={{ padding: "11px 13px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 8 }}>
              {threeVals.map(t => (
                <div key={t.key} style={{ flex: 1, textAlign: "center", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 4px" }}>
                  <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, fontWeight: 700 }}>{t.key}</div>
                  <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 19, fontWeight: 800, lineHeight: 1.1 }}>{t.v}</div>
                </div>
              ))}
            </div>
            <button onClick={() => goTo(`/beit-midrash?w=${encodeURIComponent(term)}`)} style={{
              width: "100%", marginTop: 9, cursor: "pointer", background: "none",
              border: `1px solid ${C.borderGold}`, borderRadius: 9, color: C.goldBright,
              fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, padding: "8px 6px",
            }}>✨ למחשבון המלא ולרשימת הגימטריות המלאה בבית המדרש ←</button>
          </div>
        )}

        {/* חוטים פנימיים — מהמספר אל כל פריט מחובר (רשת הקשרים) */}
        {open && webs.length > 0 && (
          <svg style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
            {/* מקור החוטים — נקודה זוהרת מתחת למספר */}
            <circle cx={webs[0].x1} cy={webs[0].y1} r="4.5" fill={C.goldBright} />
            {webs.map((w, i) => (
              <g key={i}>
                <path d={`M ${w.x1} ${w.y1} C ${w.x1} ${(w.y1 + w.y2) / 2}, ${w.x2 + 44} ${w.y2}, ${w.x2} ${w.y2}`}
                  fill="none" stroke={C.goldBright} strokeWidth="2" strokeDasharray="5 6" opacity="0.8">
                  <animate attributeName="stroke-dashoffset" values="22;0" dur="0.9s" repeatCount="indefinite" />
                </path>
                <circle cx={w.x2} cy={w.y2} r="4.5" fill={C.gold}>
                  <animate attributeName="r" values="3.5;6;3.5" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </svg>
        )}

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 15px 36px", position: "relative" }}>
          {!term ? (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, marginTop: 4 }}>הקלידו מספר או מילה למעלה, או היכנסו לאחד מהמרחבים:</p>
              <div style={{ ...bigLink, opacity: 0.5, cursor: "default" }}>🌳 כל המספרים (העץ) · 🔒 בקרוב</div>
              <button onClick={() => goTo("/archive")} style={bigLink}>🖼 גלריית רמזי הגאולה</button>
              <div style={{ ...bigLink, opacity: 0.5, cursor: "default" }}>🪜 סולמות ההתגלות · 🔒 בקרוב</div>
            </div>
          ) : b.tooSmall ? (
            <div style={{ textAlign: "center", padding: "26px 8px" }}>
              <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.9 }}>מספר יסוד (ספרה בודדת) — סולמות ההתגלות בקרוב.</p>
              <div style={{ ...bigLink, opacity: 0.5, cursor: "default" }}>🪜 סולמות ההתגלות · 🔒 בקרוב</div>
            </div>
          ) : loading ? (
            <div style={{ color: C.muted, textAlign: "center", padding: 28, fontFamily: F.body }}>טוען קשרים…</div>
          ) : (
            <>
              {b.galleries?.length > 0 && (
                <Section title={`🖼 גלריות · חדשות למעלה (${b.galleriesCount})`}>
                  <div style={{ display: "grid", gap: 14 }}>
                    {b.galleries.map(g => (
                      <div key={g.id} className="nd-node">
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
                    {b.phrases.map((p, i) => <button key={i} className="nd-node" onClick={() => openNumberDrawer(p.phrase)} style={chip}>{p.phrase}</button>)}
                  </div>
                </Section>
              )}
              {b.posts?.length > 0 && (
                <Section title={`📖 פוסטים (${b.postsCount})`}>
                  <div style={{ display: "grid", gap: 6 }}>
                    {b.posts.map(p => (
                      <button key={p.wp_id || p.slug} className="nd-node" onClick={() => goTo(`/${p.slug}?n=${isNumber ? value : encodeURIComponent(term)}`)} style={row}>
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
