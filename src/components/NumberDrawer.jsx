import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { F, calcGem } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getEntityBundle, getTopicCards } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { useNumberDrawer, openNumberDrawer, closeNumberDrawer, toggleNumberDrawer } from "../lib/numberDrawer.js";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import ConvergenceMeter from "./ConvergenceMeter.jsx";
import ZeroScaleLinks from "./ZeroScaleLinks.jsx";

const MINI = METHODS.filter(m => ["רגיל", "מסתתר", "מילוי", "אתבש", "גדול", "קדמי", "הנעלם"].includes(m.key));

// ===== מגירת המספר — פאנל צף גלובלי =====
// צף באוויר בצד ימין, נשאר פתוח גם בניווט, עם בועה צפה לפתיחה וחוט שמצביע
// למיקום המספר בתוך הפוסט. גלריות חדשות (לפי תאריך) למעלה.

const PW = () => Math.min(380, (typeof window !== "undefined" ? window.innerWidth : 380) * 0.92);

export default function NumberDrawer() {
  const P = usePalette();
  const dark = P.mode === "dark";
  // הפאנל הצף — אטום מספיק לרחף מעל התוכן. כהה = הזהב-על-שחור המקורי; בהיר = קלף נקי.
  const panelBg = dark
    ? "linear-gradient(160deg, rgba(13,10,24,0.97), rgba(7,5,16,0.97))"
    : "linear-gradient(160deg, #ffffff, #f7f2e6)";
  const chip = { cursor: "pointer", color: P.ink, fontFamily: F.body, fontSize: 14.5, border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 13px", background: P.cardSoft };
  const row = { cursor: "pointer", textAlign: "right", color: P.ink, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700, lineHeight: 1.5, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "11px 12px" };
  const bigLink = { width: "100%", cursor: "pointer", textAlign: "center", background: P.cardSoft, color: P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 10, fontFamily: F.heading, fontSize: 15, fontWeight: 700, padding: "13px" };
  const { open, term } = useNumberDrawer();
  const nav = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");           // שדה עריכה חי — מקלידים מילה/מספר ורואים בזמן אמת
  const [topics, setTopics] = useState([]); // כרטיסי התכנסות (גשר לציר ההתכנסות)
  const [zoom, setZoom] = useState(null);
  const [thread, setThread] = useState(null);
  const [webs, setWebs] = useState([]);     // חוטים פנימיים: מהמספר אל כל גלריה במגירה
  const [depthOpen, setDepthOpen] = useState(false); // 🔬 מנועי עומק — מתקפל (סגור כברירת מחדל)
  const asideRef = useRef(null);
  const headRef = useRef(null);
  const scrollRef = useRef(null);

  // סנכרון: כשנפתחת המגירה עם ביטוי חדש — טוענים אותו לשדה העריכה
  useEffect(() => { setQ(term || ""); }, [term]);

  // כרטיסי התכנסות — נטענים פעם אחת (גשר לציר ההתכנסות של מרכז הנושאים)
  useEffect(() => { if (open && !topics.length) getTopicCards({ approvedOnly: true }).then(setTopics).catch(() => {}); }, [open]); // eslint-disable-line

  const eff = (q || "").trim();             // הביטוי הפעיל (מהשדה החי)
  const isNumber = eff !== "" && /^\d+$/.test(eff);
  const value = eff ? (isNumber ? Number(eff) : calcGem(eff)) : null;
  const methodVals = (eff && !isNumber) ? MINI.map(m => ({ key: m.key, v: m.fn(eff), sub: m.sub })) : null;
  const depthVals = (eff && !isNumber) ? DEPTH_METHODS.map(m => ({ key: m.key, v: m.fn(eff) })) : null;

  // טעינת הקשרים — מתעדכנת חי לפי השדה (עם השהיה קצרה כדי לא להעמיס)
  useEffect(() => {
    if (!open || !eff) { if (!eff) setBundle(null); return; }
    if (isNumber && value < 10) { setBundle({ tooSmall: true }); return; }
    let alive = true; setLoading(true);
    const id = setTimeout(() => {
      getEntityBundle({ term: eff, value, isNumber })
        .then(b => { if (alive) { setBundle(b); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
    }, 300);
    return () => { alive = false; clearTimeout(id); };
  }, [open, eff, value, isNumber]);

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
    if (!open || !eff) { setWebs([]); return; }
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
  }, [open, eff, bundle]);

  function goTo(to) { nav(to); }   // לא סוגר — הפאנל צף ונשאר

  const b = bundle || {};

  // הסרגל הצף נפתח בהקשר (לחיצה על מספר) או דרך הבועה הצפה הגלובלית שזמינה בכל דף.
  return (
    <>

      {/* בועה צפה גלובלית — פותחת את מגירת המספר מכל מקום באתר (כולל דף הצ'אט) */}
      {!open && (
        <button onClick={() => openNumberDrawer()} aria-label="פתח את מגירת המספר — מחשבון גימטריה"
          title="מחשבון הגימטריה — פתחו מכל מקום" className="nd-launcher">
          🧮
        </button>
      )}

      {/* חוטים אל המספר בעמוד (פוסט / גלריה) */}
      {open && thread?.length > 0 && (
        <svg style={{ position: "fixed", inset: 0, zIndex: 149, pointerEvents: "none" }}>
          {thread.map((t, i) => (
            <g key={i}>
              <path d={`M ${t.ax} ${t.ay} Q ${(t.ax + t.bx) / 2} ${t.ay}, ${t.bx} ${t.by}`}
                fill="none" stroke={P.accentText} strokeWidth="2" strokeDasharray="6 6" opacity="0.85" />
              <circle cx={t.bx} cy={t.by} r="7" fill="none" stroke={P.accentText} strokeWidth="2">
                <animate attributeName="r" values="6;11;6" dur="1.4s" repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>
      )}

      {/* הפאנל הצף */}
      <aside ref={asideRef} style={{
        position: "fixed", top: 72, bottom: 16, right: 16, width: "min(380px, 92vw)", zIndex: 150,
        background: panelBg, backdropFilter: "blur(10px)",
        border: `1px solid ${P.borderStrong}`, borderRadius: 18, boxShadow: `0 18px 60px rgba(0,0,0,0.7), 0 0 30px ${P.glow}`,
        direction: "rtl", display: "flex", flexDirection: "column", overflow: "hidden",
        transform: open ? "translateX(0)" : "translateX(calc(100% + 26px))",
        opacity: open ? 1 : 0, transition: "transform .34s cubic-bezier(.2,.8,.2,1), opacity .3s",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, letterSpacing: 3, textTransform: "uppercase", marginBottom: 7 }}>🧮 מגירת המספר · מחשבון חי</div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלידו מילה או מספר…" dir="rtl"
                style={{ flex: 1, minWidth: 0, background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 8, color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, padding: "8px 12px", outline: "none" }} />
              {value != null && <span ref={headRef} style={{ color: P.accentText, fontFamily: F.mono, fontSize: 26, fontWeight: 800, lineHeight: 1, flexShrink: 0 }}>{value}</span>}
            </div>
          </div>
          <button onClick={() => closeNumberDrawer()} aria-label="סגור" style={{ background: "none", border: `1px solid ${P.borderStrong}`, color: P.accentText, fontSize: 19, cursor: "pointer", borderRadius: 8, width: 36, height: 36, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {/* מיני-מחשבון: 6 שיטות (מתעדכן חי) + מעבר למחשבון המלא בבית המדרש */}
        {methodVals && (
          <div style={{ padding: "11px 13px", borderBottom: `1px solid ${P.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
              {methodVals.map(t => (
                <button key={t.key} onClick={() => goTo(`/number/${t.v}`)} title={`פתח את דף המספר ${t.v} (${t.key})`}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = P.borderStrong)} onMouseLeave={e => (e.currentTarget.style.borderColor = P.border)}
                  style={{ cursor: "pointer", textAlign: "center", background: P.card, border: `1px solid ${P.border}`, borderRadius: 9, padding: "6px 4px", transition: "border-color .15s" }}>
                  <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>{t.key}</div>
                  <div style={{ color: P.accentText, fontFamily: F.mono, fontSize: 18.5, fontWeight: 800, lineHeight: 1.15 }}><span style={{ color: P.accentDim, fontWeight: 700 }}>= </span>{t.v}</div>
                  {t.sub && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 8.5, lineHeight: 1.3, marginTop: 2, opacity: 0.85 }}>{t.sub}</div>}
                </button>
              ))}
            </div>
            <button onClick={() => goTo(`/beit-midrash?w=${encodeURIComponent(eff)}`)} style={{
              width: "100%", marginTop: 9, cursor: "pointer", background: "none",
              border: `1px solid ${P.borderStrong}`, borderRadius: 9, color: P.accentText,
              fontFamily: F.heading, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, padding: "9px 6px",
            }}>✨ למחשבון המלא ולרשימת הגימטריות המלאה בבית המדרש ←</button>
          </div>
        )}

        {/* 🔬 מנועי עומק — 4 שיטות מתקדמות (לביטוי הנוכחי) */}
        {depthVals && (
          <div style={{ padding: "10px 13px", borderBottom: `1px solid ${P.border}` }}>
            <button onClick={() => setDepthOpen(o => !o)} aria-expanded={depthOpen}
              style={{ width: "100%", cursor: "pointer", background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 6, color: P.accentDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: depthOpen ? 7 : 0 }}>
              <span>🔬 מנועי עומק</span>
              <span style={{ color: P.border, fontWeight: 700 }}>({depthVals.length})</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: P.accentDim }}>{depthOpen ? "▴" : "▾"}</span>
            </button>
            {depthOpen && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              {depthVals.map(t => (
                <button key={t.key} onClick={() => goTo(`/number/${t.v}`)} title={`פתח את דף המספר ${t.v} (${t.key})`}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = P.borderStrong)} onMouseLeave={e => (e.currentTarget.style.borderColor = P.border)}
                  style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 6, background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, padding: "5px 9px", transition: "border-color .15s", textAlign: "right" }}>
                  <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.key}>{t.key}</span>
                  <span style={{ color: P.accentText, fontFamily: F.mono, fontSize: 15.5, fontWeight: 800, flexShrink: 0 }}>{t.v}</span>
                </button>
              ))}
            </div>
            )}
          </div>
        )}

        {/* 🔗 זיקת האפסים (חוק zero_scale_law) — אותו שורש בסדר גודל אחר */}
        {value != null && value >= 10 && (
          <div style={{ padding: "10px 13px", borderBottom: `1px solid ${P.border}` }}>
            <ZeroScaleLinks value={value} compact />
          </div>
        )}

        {/* 🧬 מד ההתכנסות — כמה שכבות מסכימות על הערך */}
        {value != null && value >= 10 && <ConvergenceMeter value={value} />}

        {/* 🧠 גשר לציר ההתכנסות — כרטיסי הנושא שמכילים את המספר */}
        {(() => {
          const mt = value != null ? topics.filter(t => (t.numbers || []).includes(value)) : [];
          if (!mt.length) return null;
          return (
            <div style={{ padding: "11px 13px", borderBottom: `1px solid ${P.border}` }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>🧠 התכנסויות שמכילות את {value}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {mt.map(t => (
                  <button key={t.id} onClick={() => goTo(`/topic/${encodeURIComponent(t.slug)}`)} style={{ cursor: "pointer", textAlign: "right", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 9, padding: "8px 11px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, color: P.ink, fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>{t.title}</span>
                    <span style={{ color: P.accent, fontSize: 9.5, letterSpacing: 1, flexShrink: 0 }}>{"★".repeat(Math.max(0, Math.min(5, Math.round((t.quality || 0) / 2))))}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* חוטים פנימיים — מהמספר אל כל פריט מחובר (רשת הקשרים) */}
        {open && webs.length > 0 && (
          <svg style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
            {/* מקור החוטים — נקודה זוהרת מתחת למספר */}
            <circle cx={webs[0].x1} cy={webs[0].y1} r="4.5" fill={P.accentText} />
            {webs.map((w, i) => (
              <g key={i}>
                <path d={`M ${w.x1} ${w.y1} C ${w.x1} ${(w.y1 + w.y2) / 2}, ${w.x2 + 44} ${w.y2}, ${w.x2} ${w.y2}`}
                  fill="none" stroke={P.accentText} strokeWidth="2" strokeDasharray="5 6" opacity="0.8">
                  <animate attributeName="stroke-dashoffset" values="22;0" dur="0.9s" repeatCount="indefinite" />
                </path>
                <circle cx={w.x2} cy={w.y2} r="4.5" fill={P.accent}>
                  <animate attributeName="r" values="3.5;6;3.5" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </svg>
        )}

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 15px 36px", position: "relative" }}>
          {!eff ? (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, marginTop: 4 }}>הקלידו מספר או מילה למעלה, או היכנסו לאחד מהמרחבים:</p>
              <div style={{ ...bigLink, opacity: 0.5, cursor: "default" }}>🌳 כל המספרים (העץ) · 🔒 בקרוב</div>
              <button onClick={() => goTo("/archive")} style={bigLink}>🖼 גלריית רמזי הגאולה</button>
              <div style={{ ...bigLink, opacity: 0.5, cursor: "default" }}>🪜 סולמות ההתגלות · 🔒 בקרוב</div>
            </div>
          ) : b.tooSmall ? (
            <div style={{ textAlign: "center", padding: "26px 8px" }}>
              <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.9 }}>מספר יסוד (ספרה בודדת) — סולמות ההתגלות בקרוב.</p>
              <div style={{ ...bigLink, opacity: 0.5, cursor: "default" }}>🪜 סולמות ההתגלות · 🔒 בקרוב</div>
            </div>
          ) : loading ? (
            <div style={{ color: P.inkSoft, textAlign: "center", padding: 28, fontFamily: F.body }}>טוען קשרים…</div>
          ) : (
            <>
              {b.galleries?.length > 0 && (
                <Section title={`🖼 גלריות · חדשות למעלה (${b.galleriesCount})`}>
                  <div style={{ display: "grid", gap: 14 }}>
                    {b.galleries.map(g => (
                      <div key={g.id} className="nd-node">
                        <button onClick={() => setZoom(g)} style={{ display: "block", width: "100%", padding: 0, border: `1px solid ${P.border}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "#000" }}>
                          <img src={g.image_url} alt={g.name || ""} loading="lazy" style={{ width: "100%", display: "block" }} />
                        </button>
                        {(g.name || g.description) && (
                          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.75, marginTop: 5, maxHeight: 92, overflow: "hidden" }}>
                            {g.name ? <b style={{ color: P.ink }}>{g.name}. </b> : null}{stripHtml(g.description || "").slice(0, 180)}
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
                      <button key={p.wp_id || p.slug} className="nd-node" onClick={() => goTo(`/${p.slug}?n=${isNumber ? value : encodeURIComponent(eff)}`)} style={row}>
                        {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                      </button>
                    ))}
                  </div>
                </Section>
              )}
              {b.insights?.length > 0 && (
                <Section title={`🤖 חידושים (${b.insightsCount ?? b.insights.length})`}>
                  <div style={{ display: "grid", gap: 8 }}>
                    {b.insights.map(it => (
                      <div key={it.id} style={{ border: `1px solid ${P.border}`, borderRadius: 10, padding: "10px 12px", background: P.cardSoft }}>
                        <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{stripHtml(it.title || "חידוש")}</div>
                        {it.body && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8 }}>{stripHtml(it.body).slice(0, 260)}</div>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              <button onClick={() => goTo(`/number/${encodeURIComponent(eff)}`)} style={{ ...bigLink, marginTop: 6 }}>הדף המלא של {value} →</button>
            </>
          )}
        </div>
      </aside>

      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, direction: "rtl" }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "min(760px,96vw)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ textAlign: "left", marginBottom: 8 }}>
              {/* תיבת ההגדלה — רקע כהה תמיד; צבעי טקסט בהירים קבועים לקריאוּת מעל השחור */}
              <button onClick={() => setZoom(null)} style={{ background: "none", border: "1px solid rgba(212,175,55,0.38)", color: "#f6e27a", fontSize: 22, cursor: "pointer", borderRadius: 8, width: 42, height: 42 }}>×</button>
            </div>
            <img src={zoom.image_url} alt="" style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(212,175,55,0.38)" }} />
            {(zoom.name || zoom.description) && (
              <div style={{ color: "#cfc9d6", fontFamily: F.body, fontSize: 15.5, lineHeight: 1.95, marginTop: 10, whiteSpace: "pre-wrap" }}>
                {zoom.name ? <b style={{ color: "#e8c840" }}>{zoom.name}{"\n"}</b> : null}{stripHtml(zoom.description || "")}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .nd-launcher {
          position: fixed; right: 18px; bottom: 18px; z-index: 140;
          width: 52px; height: 52px; border-radius: 999px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; font-size: 24px; line-height: 1;
          background: ${dark ? "linear-gradient(160deg, rgba(20,15,5,0.96), rgba(8,5,2,0.96))" : "linear-gradient(160deg, #fffdf6, #f1e8cf)"};
          border: 1px solid ${P.borderStrong}; color: ${P.accentText};
          box-shadow: 0 10px 30px rgba(0,0,0,0.55), 0 0 18px ${P.glow};
          transition: transform .16s, box-shadow .16s, border-color .16s;
        }
        .nd-launcher:hover {
          transform: translateY(-2px) scale(1.04); border-color: ${P.accent};
          box-shadow: 0 14px 36px rgba(0,0,0,0.6), 0 0 26px ${P.glow};
        }
        .nd-launcher::after {
          content: "מחשבון"; position: absolute; bottom: -16px; right: 50%; transform: translateX(50%);
          font-family: ${F.heading}; font-size: 9.5px; letter-spacing: 1px; color: ${P.accentDim}; white-space: nowrap;
        }
        @media (max-width: 560px) { .nd-launcher { width: 46px; height: 46px; font-size: 21px; right: 12px; bottom: 12px; } }
      `}</style>
    </>
  );
}

function Section({ title, children }) {
  const P = usePalette();
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16.5, fontWeight: 700, marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}
