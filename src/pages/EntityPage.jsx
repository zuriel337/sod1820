import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { C, F, calcGem, KEY_NUMBERS } from "../theme.js";
import { getEntityBundle, supabase, logSearch, getHarvestedPosts } from "../lib/supabase.js";
import { useGold, sortGoldFirst } from "../lib/goldTier.js";
import { stripHtml } from "../lib/format.js";
import ConvergenceMeter from "../components/ConvergenceMeter.jsx";
import NumberDNA from "../components/NumberDNA.jsx";
import ZeroScaleLinks from "../components/ZeroScaleLinks.jsx";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import { SITE_URL } from "../lib/seo.js";
import { buildNumberCard, shareNumberCard, downloadNumberCard, shareNumberSmart } from "../lib/numberCard.js";
import { buildMessages } from "../lib/numberMessage.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode, toggleTheme } from "../lib/themeMode.js";

const ANCHOR_SET = new Set([1820, 776, 358, 424, 604, 26, 86, 314, 543, 91, 13, 1237, 541, 137, 248, 611, 1202, 318]);
const BASE8 = METHODS.filter(m => ["רגיל", "מילוי", "מסתתר", "קדמי", "גדול", "סידורי", "אתבש", "אלבם"].includes(m.key));
const ALL14 = [...METHODS, ...DEPTH_METHODS];   // כל השיטות — לשכבת השורשים

// מתג תמה — שמש/ירח (נשמר ב-localStorage, משפיע על דפי התוכן המעוצבים)
function ThemeToggle() {
  const mode = useThemeMode();
  const P = usePalette();
  return (
    <button onClick={toggleTheme} title="החלפת תמה — בהיר/כהה" aria-label="החלפת תמה"
      style={{ cursor: "pointer", width: 38, height: 38, borderRadius: 999, border: `1px solid ${P.borderStrong}`,
        background: P.cardSoft, color: P.accentText, fontSize: 17, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {mode === "light" ? "🌙" : "☀️"}
    </button>
  );
}

// 🧬 פאנל ההתכנסות (יושב בתוך "מעבדה" כהה) — לביטוי: ערכי-שיטות (העוגן נבחר אוטומטית); למספר: ישר המד.
function EntityConvergence({ term, isNumber, ragil }) {
  let vals = isNumber ? null : BASE8.map(m => ({ key: m.key, v: m.fn(term), sub: m.sub }));
  // חוק method_hierarchy: גדול הוא שיטה נפרדת לסופיות. אין סופיות → גדול ≡ רגיל; לא מציגים פעמיים.
  if (vals) {
    const ragilV = vals.find(x => x.key === "רגיל")?.v;
    vals = vals.filter(x => !(x.key === "גדול" && x.v === ragilV));
  }
  const anchorHit = vals && vals.find(x => ANCHOR_SET.has(x.v));
  const [sel, setSel] = useState(isNumber ? ragil : (anchorHit ? anchorHit.v : ragil));
  useEffect(() => { setSel(isNumber ? ragil : (anchorHit ? anchorHit.v : ragil)); }, [term, isNumber, ragil]); // eslint-disable-line

  return (
    <div className="em-panel" style={{ marginBottom: 14, borderRadius: 14, border: `1px solid ${C.border}`, background: "rgba(8,5,2,0.4)", overflow: "hidden" }}>
      {vals && (
        <div style={{ padding: "12px 14px 4px" }}>
          <div className="em-eyebrow" style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginBottom: 9 }}>כמה דרכים לקרוא את הביטוי — בחרו, והעוגן הקדוש מודגש</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {vals.map(x => {
              const on = x.v === sel; const anc = ANCHOR_SET.has(x.v);
              return (
                <button key={x.key} onClick={() => setSel(x.v)} title={anc ? "עוגן קדוש" : ""} style={{
                  cursor: "pointer", borderRadius: 10, padding: "5px 10px", textAlign: "center",
                  border: `1px solid ${on ? C.gold : anc ? C.borderGold : C.border}`,
                  background: on ? "rgba(212,175,55,0.18)" : anc ? "rgba(212,175,55,0.07)" : "rgba(20,15,12,0.6)",
                }}>
                  <div className="em-key" style={{ color: anc ? C.goldBright : C.goldDim, fontFamily: F.heading, fontSize: 9.5, fontWeight: 700 }}>{anc ? "✨ " : ""}{x.key}</div>
                  <div className="em-val" style={{ color: on ? C.goldBright : C.goldLight, fontFamily: F.mono, fontSize: 15, fontWeight: 800 }}><span style={{ color: C.goldDim, fontWeight: 700 }}>= </span>{x.v}</div>
                  {x.sub && <div className="em-sub" style={{ color: C.goldDim, fontFamily: F.body, fontSize: 8.5, lineHeight: 1.25, marginTop: 2, maxWidth: 96, opacity: 0.85 }}>{x.sub}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <ConvergenceMeter value={sel} />
      <NumberDNA value={sel} />
      <style>{`
        @media (min-width: 900px) {
          .em-panel .em-eyebrow { font-size: 13px !important; }
          .em-panel .em-key { font-size: 12px !important; }
          .em-panel .em-val { font-size: 21px !important; }
          .em-panel .cm { padding: 16px 20px !important; }
          .em-panel .cm-title { font-size: 13px !important; letter-spacing: 2px !important; }
          .em-panel .cm-score { font-size: 23px !important; font-weight: 900 !important; }
          .em-panel .cm-row { font-size: 16.5px !important; font-weight: 600 !important; gap: 12px !important;
            padding: 8px 4px !important; border-bottom: 1px solid rgba(212,175,55,0.10) !important; }
          .em-panel .cm-icon { width: 26px !important; font-size: 18px !important; }
          .em-panel .cm-detail { font-size: 14.5px !important; font-weight: 800 !important; }
          .em-panel .cm-chip { font-size: 14px !important; padding: 6px 14px !important; font-weight: 700 !important; }
          .em-panel .nd { padding: 18px 20px !important; }
          .em-panel .nd-title { font-size: 13px !important; }
          .em-panel .nd-card-title { font-size: 19px !important; }
          .em-panel .nd-card-sub { font-size: 14px !important; }
        }
      `}</style>
    </div>
  );
}

// כפתורי שיתוף — השיתוף הראשי מייצר תמונה אוטומטית ומשתף אותה (לולאת ויראליות)
function ShareButtons({ value, phrases, copyText, onPreview }) {
  const P = usePalette();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  async function share() {
    if (busy) return;
    setBusy(true);
    try { await shareNumberSmart(value, phrases); } finally { setBusy(false); }
  }
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
      <button onClick={share} disabled={busy}
        style={{ cursor: busy ? "wait" : "pointer", background: "#25D366", color: "#06310f", border: "none", fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "11px 24px", borderRadius: 999 }}>
        {busy ? "מכין תמונה…" : "📲 שתפו (עם תמונה)"}
      </button>
      <button onClick={onPreview}
        style={{ cursor: "pointer", background: "rgba(201,162,39,0.12)", color: P.accentText, border: `1px solid ${P.borderStrong}`, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "11px 18px", borderRadius: 999 }}>
        🖼 תצוגה מקדימה
      </button>
      <button onClick={() => { navigator.clipboard?.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{ cursor: "pointer", background: P.cardSoft, color: P.accentText, border: `1px solid ${P.borderStrong}`, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "11px 18px", borderRadius: 999 }}>
        {copied ? "✓ הועתק" : "🔗 העתק קישור"}
      </button>
    </div>
  );
}

// ===== דף הישות (Entity Page) — מרכז כל המידע סביב מספר/ביטוי =====
// /number/:phrase — מספר (1237) או ביטוי (דוד המלך). חום קודם (מספר→משמעות→תמונות→מילים),
// והניתוח (שיטות/התכנסות/DNA) בפאנל "העמקה" מתקפל. תמה בהירה/כהה דרך מתג.

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// עוטף תמה ברמת מודול (יציב — מונע remount ואיבוד פוקוס בהקלדה)
function Shell({ P, children }) {
  return <div style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>{children}</div>;
}

function SectionHead({ icon, title, count }) {
  const P = usePalette();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <h2 style={{ color: P.ink, fontFamily: F.regal, fontSize: "clamp(19px,3vw,25px)", fontWeight: 700, margin: 0 }}>
        {icon} {title}
      </h2>
      {count != null && (
        <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 13, fontWeight: 700, border: `1px solid ${P.border}`, borderRadius: 999, padding: "1px 10px" }}>
          {count}
        </span>
      )}
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${P.borderStrong}, transparent)` }} />
    </div>
  );
}

export default function EntityPage() {
  const { phrase } = useParams();
  const nav = useNavigate();
  const P = usePalette();
  const term = decodeURIComponent(phrase || "").trim();
  const isNumber = /^\d+$/.test(term);
  const value = isNumber ? Number(term) : calcGem(term);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [harvest, setHarvest] = useState([]);
  const [cardUrl, setCardUrl] = useState(null);   // תמונת המספר שנוצרה (תצוגה מקדימה)
  const [q, setQ] = useState("");
  // שכבה 3 (DNA) — עומק "דביק" (נשמר ב-localStorage); שכבה 4 (שורשים) — כבדה, נפתחת ידנית.
  const [deep, setDeep] = useState(() => { try { return localStorage.getItem("np-dna") === "1"; } catch { return false; } });
  const [roots, setRoots] = useState(false);
  const toggleDna = () => setDeep(v => { const n = !v; try { localStorage.setItem("np-dna", n ? "1" : "0"); } catch { /* ignore */ } return n; });
  const goChip = id => { if (["events", "insights", "comments"].includes(id)) setRoots(true); setTimeout(() => scrollTo(id), 70); };
  const goSearch = e => { e.preventDefault(); const v = q.trim(); if (v) { setQ(""); nav(`/number/${encodeURIComponent(v)}`); } };

  // כרטיס מעוצב לפי התמה
  const card = {
    background: P.cardGrad, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px",
    textDecoration: "none", display: "block", transition: "border-color 0.2s, transform 0.2s",
  };
  const hoverIn = e => { e.currentTarget.style.borderColor = P.accent; };
  const hoverOut = e => { e.currentTarget.style.borderColor = P.border; };

  async function openCard() {
    try { if (document.fonts?.ready) await document.fonts.ready; } catch { /* ignore */ }
    setCardUrl(buildNumberCard(value, data?.phrases || []).toDataURL("image/png"));
  }

  useEffect(() => {
    let alive = true;
    setLoading(true); setData(null); setRoots(false);
    getEntityBundle({ term, value, isNumber })
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    document.title = `${term} · ${value} — ${isNumber ? "דף המספר" : "דף הביטוי"} · סוד 1820`;
    if (term) logSearch(term, value);
    return () => { alive = false; };
  }, [term, value, isNumber]);

  // 💎 הצלבת קציר: פוסטים שמזכירים ביטוי ששווה למספר הזה
  useEffect(() => {
    let alive = true;
    setHarvest([]);
    if (value) getHarvestedPosts(value, 6).then(h => { if (alive) setHarvest(h || []); });
    return () => { alive = false; };
  }, [value]);

  // ── שער מלכותי: חתימות-זהב שנופלות בדיוק על המספר הזה (number_page_law) ──
  const [sigs, setSigs] = useState([]);
  const [sigsLoaded, setSigsLoaded] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    setSigs([]); setSigsLoaded(false); setGateOpen(false);
    if (!isNumber) { setSigsLoaded(true); return; }
    supabase.from("nodes")
      .select("label,description,metadata")
      .eq("type", "entity").eq("is_active", true)
      .eq("metadata->>role", "signature").eq("metadata->>value", String(value))
      .then(({ data: rows }) => {
        if (!alive) return;
        setSigs((rows || []).map(r => ({
          label: r.label, desc: r.description,
          title: r.metadata?.signature_title || "✦ חתימה",
          kind: r.metadata?.signature_kind,
        })));
        setSigsLoaded(true);
      })
      .catch(() => { if (alive) setSigsLoaded(true); });
    return () => { alive = false; };
  }, [value, isNumber]);
  const hasGate = isNumber && sigs.length > 0;
  const gold = useGold();

  const d = data || {};
  const chips = [
    d.galleriesCount && { id: "galleries", e: "🖼", n: d.galleriesCount, l: "תמונות" },
    d.phrases?.length && { id: "tree", e: "🌳", n: d.phrasesCount || d.phrases.length, l: "מילים שוות" },
    d.postsCount && { id: "posts", e: "📖", n: d.postsCount, l: "פוסטים" },
    d.eventsCount && { id: "events", e: "🕰", n: d.eventsCount, l: "אירועים" },
    d.insightsCount && { id: "insights", e: "🤖", n: d.insightsCount, l: "חידושי AI" },
    d.commentsCount && { id: "comments", e: "💬", n: d.commentsCount, l: "דיונים" },
  ].filter(Boolean);

  // שכבה 1 — מנוע המסרים: תמיד משהו אמיתי (A→F), גם לשם בלי מאגר. עובדה≠רמז.
  const msgs = buildMessages({ term, value, isNumber, phrases: d.phrases || [], goldLabels: gold.labels });


  // מספר ספרה-בודדת (1–9) → מספר יסוד; מפנים לסולמות במקום להציף תוצאות.
  if (isNumber && value < 10) {
    return (
      <Shell P={P}>
        <div style={{ direction: "rtl", maxWidth: 620, margin: "0 auto", padding: "72px 24px", textAlign: "center" }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", color: P.inkSoft, cursor: "pointer", fontFamily: F.heading, fontSize: 12, marginBottom: 30 }}>← חזרה</button>
          <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(60px,12vw,110px)", fontWeight: 800, lineHeight: 1, textShadow: `0 0 40px ${P.glow}` }}>{value}</div>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 16, lineHeight: 2, maxWidth: 460, margin: "18px auto 26px" }}>
            זהו <b style={{ color: P.accentText }}>מספר יסוד</b> (ספרה בודדת). מספר בודד מופיע באינספור מקומות — לכן חוקרים אותו דרך מסע «סולמות ההתגלות», שם כל ספרה נפתחת לרבדים.
          </p>
          <Link to="/sulamot" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 10, textDecoration: "none", background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>
            🪜 לסולמות ההתגלות →
          </Link>
        </div>
      </Shell>
    );
  }

  // בזמן בדיקת חתימות (מספרים) — placeholder קצר למניעת הבהוב לפני השער
  if (isNumber && value >= 10 && !sigsLoaded) {
    return (
      <Shell P={P}>
        <div style={{ direction: "rtl", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(46px,9vw,84px)", fontWeight: 800, opacity: 0.4 }}>{value}</div>
        </div>
      </Shell>
    );
  }
  // ── שער מלכותי — נפתח בלחיצה (number_page_law, שכבה 2). נשאר כהה-קולנועי בכוונה ──
  if (hasGate && !gateOpen) {
    return <RoyalGate value={value} signatures={sigs} onOpen={() => setGateOpen(true)} onBack={() => nav(-1)} />;
  }

  return (
    <Shell P={P}>
      <div style={{ direction: "rtl", maxWidth: 920, margin: "0 auto", padding: "30px 20px 100px" }}>
        {/* ── שורה עליונה: חזרה · חיפוש · מתג תמה ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
          <button onClick={() => nav(-1)} style={{ background: "none", border: "none", color: P.inkSoft, cursor: "pointer", fontFamily: F.heading, fontSize: 12, fontWeight: 600 }}>← חזרה</button>
          <form onSubmit={goSearch} style={{ marginInlineStart: "auto", display: "flex", gap: 7 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="חפשו מספר או ביטוי…" dir="rtl" style={{ background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.ink, fontFamily: F.body, fontSize: 14, padding: "9px 18px", outline: "none", textAlign: "center", width: 180 }} />
            <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 14, padding: "9px 18px" }}>חפש ✦</button>
          </form>
          <ThemeToggle />
        </div>

        {/* ── הירו: מספר + משפט חם + שיתוף ── */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, marginBottom: 6 }}>
            {isNumber ? "דף המספר" : "דף הביטוי"}
          </div>
          {!isNumber && (
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 700, marginBottom: 2 }}>{term}</div>
          )}
          <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(46px,9vw,84px)", fontWeight: 800, lineHeight: 1, textShadow: `0 0 40px ${P.glow}` }}>
            {value}
          </div>
          {msgs[0] && (
            <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: "clamp(15px,2.2vw,18px)", lineHeight: 1.7, maxWidth: 520, margin: "12px auto 0" }}>
              {msgs[0].text}
            </p>
          )}
          {msgs[1] && msgs[1].layer !== "F" && (
            <p style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6, maxWidth: 480, margin: "6px auto 0" }}>
              ✦ הידעת? {msgs[1].text}
            </p>
          )}
          <ShareButtons
            value={value}
            phrases={data?.phrases || []}
            onPreview={openCard}
            copyText={isNumber
              ? `המספר ${value} — מה הוא אומר עליך? 🔢✨\n${SITE_URL}/number/${value}`
              : `הגימטריה של "${term}" = ${value} ✨\nגלו את הסוד בשם שלכם במחשבון של סוד 1820:\n${SITE_URL}/number/${encodeURIComponent(term)}`} />
        </div>

        {/* ── ✦ טבעת החתימות (למספרי-חתימה, אחרי פתיחת השער) ── */}
        {hasGate && <SignaturesRing signatures={sigs} value={value} />}

        {/* ── 🖼 תמונות קודם — הפ-off האנושי מיד אחרי ההירו ── */}
        {d.galleries?.length > 0 && (
          <section id="galleries" style={{ marginBottom: 38, scrollMarginTop: 80 }}>
            <SectionHead icon="🖼" title="תמונות מהמאגר" count={d.galleriesCount} />
            <style>{`.ent-gal{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}@media(max-width:680px){.ent-gal{grid-template-columns:1fr}}`}</style>
            <div className="ent-gal">
              {d.galleries.map(g => (
                <button key={g.id} onClick={() => setLightbox(g)} style={{
                  cursor: "pointer", padding: 0, borderRadius: 12, overflow: "hidden", textAlign: "right",
                  border: `1px solid ${P.border}`, background: P.card,
                }} className="ent-gal-card">
                  <img src={g.image_url} alt={g.name || ""} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
                  {(g.name || g.description) && (
                    <div style={{ padding: "10px 13px" }}>
                      {g.name && <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 14.5, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>{g.name}</div>}
                      {g.description && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.75, maxHeight: 66, overflow: "hidden" }}>{stripHtml(g.description).slice(0, 160)}</div>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── 🌳 מילים שוות — צ'יפים משחקיים ── */}
        <section id="tree" style={{ marginBottom: 34, scrollMarginTop: 80 }}>
          <SectionHead icon="🌳" title="מילים שוות" count={d.phrasesCount || d.phrases?.length || null} />
          {d.phrases?.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {sortGoldFirst(d.phrases, p => gold.labels.has(p.phrase)).map((p, i) => {
                const isG = gold.labels.has(p.phrase);
                return (
                  <Link key={i} to={`/number/${encodeURIComponent(p.phrase)}`} style={{
                    textDecoration: "none", color: isG ? P.onAccent : P.accentText, fontFamily: F.body, fontSize: 14,
                    border: `1px solid ${isG ? "transparent" : P.border}`, borderRadius: 999, padding: "5px 13px",
                    background: isG ? P.accentBtn : P.card, fontWeight: isG ? 800 : 500,
                  }}>{isG ? "✦ " : ""}{p.phrase}</Link>
                );
              })}
            </div>
          ) : (
            <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, marginBottom: 14 }}>אין מילים נוספות בערך זה במאגר.</p>
          )}
          <Link to="/numbers" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
            פתחו את {value} בעץ המספרים התלת-מימדי →
          </Link>
        </section>

        {/* ── מספרים קרובים (אותו שורש בסדר גודל אחר — zero_scale_law) ── */}
        {value >= 10 && (() => {
          const near = [value * 10, (value % 10 === 0 ? value / 10 : null), value * 100].filter(n => n && n !== value);
          return near.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", alignItems: "center", marginBottom: 30 }}>
              <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>מספרים קרובים ✦</span>
              {near.map(n => (
                <Link key={n} to={`/number/${n}`} style={{ textDecoration: "none", color: P.accentText, background: P.card, border: `1px solid ${P.border}`, borderRadius: 999, padding: "5px 13px", fontFamily: F.mono, fontSize: 13, fontWeight: 700 }}>{n}</Link>
              ))}
            </div>
          ) : null;
        })()}

        {/* ── 🧬 שכבה 3 — DNA: איך המספר בנוי (סגור כברירת מחדל, פאנל "מעבדה" כהה) ── */}
        <div style={{ marginBottom: 30 }}>
          <button onClick={toggleDna} style={{
            width: "100%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: "13px 18px",
            color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800,
          }}>
            🧬 {deep ? "הסתירו את שכבת ה-DNA" : "ראו איך המספר בנוי — שיטות, מד התכנסות ו-DNA"}
            <span style={{ fontSize: 11 }}>{deep ? "▲" : "▼"}</span>
          </button>
          {deep && (
            <div style={{ marginTop: 14, background: P.labBg, border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: "14px 13px" }}>
              {/* DNA המספר — משפט פותח */}
              {!loading && chips.length > 0 && (() => {
                const parts = [];
                if (d.postsCount) parts.push(`${d.postsCount} פוסטים`);
                if (d.galleriesCount) parts.push(`${d.galleriesCount} גלריות`);
                if (d.phrases?.length) parts.push(`${d.phrases.length} מילים שוות`);
                if (d.eventsCount) parts.push(`${d.eventsCount} אירועים בציר`);
                if (d.insightsCount) parts.push(`${d.insightsCount} חידושי AI`);
                if (d.commentsCount) parts.push(`${d.commentsCount} תובנות קהילה`);
                return (
                  <div style={{ marginBottom: 14, padding: "13px 18px", borderRadius: 14, border: `1px solid ${C.borderGold}`, background: "linear-gradient(135deg, rgba(20,15,12,0.6), rgba(8,5,2,0.45))" }}>
                    <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, marginBottom: 7 }}>🧬 DNA המספר</div>
                    <p style={{ color: C.goldLight, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.85, margin: 0 }}>
                      <b style={{ color: C.goldBright, fontFamily: F.mono }}>{value}</b> הוא מספר חי במערכת{parts.length ? `, המחובר ל־${parts.join(" · ")}` : ""}.
                      {isNumber && KEY_NUMBERS[value] && <span style={{ color: C.goldDim }}> {KEY_NUMBERS[value]}.</span>}
                    </p>
                  </div>
                );
              })()}

              <EntityConvergence term={term} isNumber={isNumber} ragil={value} />

              {value >= 10 && <div style={{ marginTop: 10 }}><ZeroScaleLinks value={value} /></div>}

              <div style={{ textAlign: "center", marginTop: 14 }}>
                <Link to="/beit-midrash?tab=methods" style={{
                  display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none",
                  background: "rgba(212,175,55,0.08)", border: `1px solid ${C.border}`, borderRadius: 999,
                  color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "8px 16px",
                }}>📖 ללמוד את שיטות הגימטריה (מסתתר · מילוי · קדמי) בבית המדרש ←</Link>
              </div>
            </div>
          )}
        </div>

        {/* ── מפת קשרים מהירה ── */}
        {loading ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 30 }}>טוען את כל הקשרים…</div>
        ) : chips.length > 0 ? (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
            padding: "16px 14px", marginBottom: 36, borderRadius: 16,
            border: `1px solid ${P.border}`, background: P.cardSoft,
          }}>
            {chips.map(c => (
              <button key={c.id} onClick={() => goChip(c.id)} style={{
                cursor: "pointer", background: P.card, border: `1px solid ${P.border}`,
                color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700,
                padding: "8px 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 7,
              }}>
                <span style={{ fontSize: 16 }}>{c.e}</span>
                <b style={{ color: P.ink }}>{c.n}</b> {c.l}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 20, marginBottom: 30 }}>
            עדיין לא נמצאו קשרים ל«{term}» — נסו מספר או ביטוי אחר.
          </div>
        )}

        {/* ✨ קחו אותי למסע */}
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <Link to={`/journey?from=${encodeURIComponent(term)}`} style={{
            display: "inline-block", textDecoration: "none", background: P.accentBtn, color: P.onAccent,
            fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "12px 26px", borderRadius: 999,
            boxShadow: `0 6px 22px ${P.glow}`,
          }}>🎲 קחו אותי למסע מ־{value}</Link>
        </div>

        {/* ── 📖 פוסטים ── */}
        {d.posts?.length > 0 && (
          <section id="posts" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
            <SectionHead icon="📖" title="פוסטים" count={d.postsCount} />
            <div style={{ display: "grid", gap: 10 }}>
              {d.posts.map(p => (
                <Link key={p.wp_id || p.slug} to={`/${p.slug}`} style={card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                  <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
                    {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 💎 פוסטים שמזכירים ביטוי בערך הזה ── */}
        {harvest.length > 0 && (
          <section id="harvest" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
            <SectionHead icon="💎" title="פוסטים שמזכירים ביטוי בערך הזה" count={harvest.length} />
            <div style={{ display: "grid", gap: 10 }}>
              {harvest.map(p => (
                <Link key={`h-${p.wp_id || p.slug}`} to={`/${p.slug}`} style={card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                  <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
                    {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                  </div>
                  {p.via && <div style={{ marginTop: 6, fontSize: 12.5, color: P.accent, opacity: 0.9 }}>דרך «{p.via}»</div>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 🌱 שכבה 4 — שורשי המספר (כל השאר, בכפתור אחד) ── */}
        <div style={{ marginBottom: 8 }}>
          <button onClick={() => setRoots(v => !v)} style={{
            width: "100%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 14, padding: "13px 18px",
            color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800,
          }}>
            🌱 {roots ? "סגרו את שורשי המספר" : "פתחו את שורשי המספר — כל השיטות, האירועים, הקהילה והצפנים"}
            <span style={{ fontSize: 11 }}>{roots ? "▲" : "▼"}</span>
          </button>
        </div>

        {roots && (
          <div style={{ marginTop: 18 }}>
            {/* כל השיטות (לביטוי בלבד — למספר אין אותיות) */}
            {!isNumber && (
              <section style={{ marginBottom: 40 }}>
                <SectionHead icon="🧮" title="כל השיטות" count={ALL14.length} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                  {ALL14.map(m => (
                    <div key={m.key} style={{ ...card, padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>{m.key}</span>
                        <span style={{ color: P.ink, fontFamily: F.mono, fontSize: 16, fontWeight: 800 }}>{m.fn(term)}</span>
                      </div>
                      {m.soul && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{m.soul}</div>}
                    </div>
                  ))}
                </div>
              </section>
            )}

        {/* ── 🌅 ציר ההתגלות ── */}
        {d.events?.length > 0 && (
          <section id="events" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
            <SectionHead icon="🌅" title="ציר ההתגלות" count={d.eventsCount} />
            <div style={{ display: "grid", gap: 10 }}>
              {d.events.map(ev => (
                <Link key={ev.id} to="/timeline" style={card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                  <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
                    {stripHtml(ev.label || "")}
                  </div>
                  {ev.hebrew_date && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 4 }}>{ev.hebrew_date}</div>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 🤖 חידושי AI ── */}
        {d.insights?.length > 0 && (
          <section id="insights" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
            <SectionHead icon="🤖" title="חידושי AI" count={d.insightsCount} />
            <div style={{ display: "grid", gap: 10 }}>
              {d.insights.map(it => (
                <div key={it.id} style={card}>
                  <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {stripHtml(it.title || "חידוש")}
                  </div>
                  {it.body && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75 }}>{stripHtml(it.body).slice(0, 180)}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 💬 דיוני קהילה ── */}
        {d.comments?.length > 0 && (
          <section id="comments" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
            <SectionHead icon="💬" title="דיוני קהילה" count={d.commentsCount} />
            <div style={{ display: "grid", gap: 10 }}>
              {d.comments.map(c => (
                <div key={c.wp_id} style={card}>
                  <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8 }}>{stripHtml(c.content || "").slice(0, 220)}</div>
                  {c.author_name && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 6 }}>— {c.author_name}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 🔍 דילוגי אותיות + 🎥 סרטונים ── */}
        <section style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Link to="/code" style={{ ...card, textAlign: "center" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>🔍</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>חפשו «{term}» בדילוגי האותיות</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>מנוע הצפנים בטקסט התורה</div>
          </Link>
          <Link to="/post" style={{ ...card, textAlign: "center" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>🎥</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>סרטונים ופוסטים</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>כל התוכן באתר</div>
          </Link>
        </section>

            {/* גרף ועץ — הקשרים המלאים */}
            <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <Link to="/numbers" style={{ ...card, textAlign: "center" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🌳</div>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>עץ המספרים התלת-מימדי</div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>{value} בגרף הקשרים</div>
              </Link>
              <Link to="/map" style={{ ...card, textAlign: "center" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🕸</div>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>מפת הידע</div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>כל הישויות והקשרים</div>
              </Link>
            </section>
          </div>
        )}

        {/* ── תמונת המספר — תצוגה מקדימה + שיתוף/הורדה (מודאל כהה) ── */}
        {cardUrl && (
          <div onClick={() => setCardUrl(null)} style={{
            position: "fixed", inset: 0, zIndex: 320, background: "rgba(3,2,8,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 18, direction: "rtl",
          }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "min(440px, 94vw)", textAlign: "center" }}>
              <img src={cardUrl} alt={`תמונת המספר ${value}`} style={{ width: "100%", borderRadius: 16, border: `1px solid ${C.borderGold}`, boxShadow: "0 18px 60px rgba(0,0,0,0.7)", display: "block" }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
                <button onClick={() => shareNumberCard(value, data?.phrases || [])} style={{
                  cursor: "pointer", background: "linear-gradient(135deg, #d4af37, #e8c840)", color: "#1a0e00",
                  border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "11px 24px",
                }}>📲 שתפו</button>
                <button onClick={() => downloadNumberCard(value, data?.phrases || [])} style={{
                  cursor: "pointer", background: "transparent", color: "#f6e27a", border: `1px solid ${C.borderGold}`,
                  borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "11px 20px",
                }}>📷 שמרו</button>
                <button onClick={() => setCardUrl(null)} style={{
                  cursor: "pointer", background: "transparent", color: "#cfc9d6", border: `1px solid ${C.border}`,
                  borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "11px 18px",
                }}>סגור</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Lightbox (מודאל כהה) ── */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{
            position: "fixed", inset: 0, zIndex: 300, background: "rgba(3,2,8,0.94)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "min(820px,96vw)", maxHeight: "92vh", overflowY: "auto", direction: "rtl" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button onClick={() => setLightbox(null)} aria-label="סגור" style={{
                  background: "none", border: `1px solid ${C.borderGold}`, color: "#f6e27a",
                  fontSize: 24, cursor: "pointer", borderRadius: 8, width: 44, height: 44, lineHeight: 1,
                }}>×</button>
              </div>
              <img src={lightbox.image_url} alt={lightbox.name || ""} style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.borderGold}`, display: "block" }} />
              {lightbox.name && <div style={{ color: "#e8c840", fontFamily: F.regal, fontSize: 17, fontWeight: 700, marginTop: 12 }}>{lightbox.name}</div>}
              {lightbox.description && <div style={{ color: "#cfc9d6", fontFamily: F.body, fontSize: 14, lineHeight: 1.9, marginTop: 8, whiteSpace: "pre-wrap" }}>{stripHtml(lightbox.description)}</div>}
              {(lightbox.all_values?.length > 0) && (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                  {lightbox.all_values.slice(0, 10).map((v, i) => (
                    <Link key={i} to={`/number/${v}`} onClick={() => setLightbox(null)} style={{
                      textDecoration: "none", color: v === lightbox.primary_value ? "#1a0e00" : "#e8c840",
                      background: v === lightbox.primary_value ? "#d4af37" : "rgba(8,5,2,0.5)",
                      border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "3px 11px",
                      fontFamily: F.mono, fontSize: 12, fontWeight: 700,
                    }}>{v}</Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── שער מלכותי: המסך הראשון של מספר־יסוד עם חתימות (number_page_law). כהה-קולנועי בכוונה ──
function RoyalGate({ value, signatures, onOpen, onBack }) {
  return (
    <div style={{ direction: "rtl", background: C.bg, minHeight: "82vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "50px 20px", position: "relative", zIndex: 1 }}>
      <style>{`
        @keyframes gateRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes gateGlow{0%,100%{text-shadow:0 0 40px rgba(212,175,55,.35)}50%{text-shadow:0 0 75px rgba(212,175,55,.65)}}
      `}</style>
      <button onClick={onBack} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>← חזרה</button>
      <div style={{ fontSize: 42, marginBottom: 4, animation: "gateRise .6s ease both" }}>👑</div>
      <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: "clamp(64px,15vw,140px)", fontWeight: 800, lineHeight: 1, animation: "gateRise .7s ease both, gateGlow 4.5s ease-in-out infinite 1.2s" }}>{value}</div>
      <p style={{ color: C.goldLight, fontFamily: F.regal, fontSize: "clamp(16px,2.5vw,23px)", lineHeight: 1.85, margin: "24px 0 4px", maxWidth: 470, animation: "gateRise .95s ease both" }}>
        יש מספרים שמספרים סיפור.<br />ויש מספרים שהם הסיפור עצמו.
      </p>
      <button onClick={onOpen} style={{ marginTop: 28, cursor: "pointer", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00", border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 17, fontWeight: 800, padding: "15px 36px", boxShadow: `0 0 44px ${C.goldDeep}`, animation: "gateRise 1.15s ease both" }}>
        ✨ גלו את כל עולמו של {value} ✨
      </button>
      <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 1.5, marginTop: 20, animation: "gateRise 1.35s ease both" }}>
        {signatures.length} חתימות נסתרות · מאחורי המספר מסתתר עולם שלם
      </div>
    </div>
  );
}

// ── טבעת החתימות: ישויות-העל שמתכנסות למספר (מעוצבת לתמה) ──
function SignaturesRing({ signatures, value }) {
  const P = usePalette();
  if (!signatures?.length) return null;
  return (
    <section style={{ marginBottom: 36 }}>
      <style>{`@keyframes sigIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}`}</style>
      <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, marginBottom: 16 }}>✦ טבעת החתימות ✦</div>
      <div style={{ display: "grid", gap: 13 }}>
        {signatures.map((s, i) => (
          <div key={s.label} style={{ animation: `sigIn .6s ease both ${0.1 + i * 0.18}s`, background: "linear-gradient(135deg, rgba(212,175,55,0.20), rgba(212,175,55,0.05))", border: `1.5px solid ${P.accent}`, borderRadius: 16, padding: "17px 22px", textAlign: "center", boxShadow: `0 6px 24px ${P.glow}` }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, letterSpacing: 1, marginBottom: 7 }}>{s.title}</div>
            <div style={{ color: P.ink, fontFamily: F.regal, fontSize: "clamp(17px,2.7vw,23px)", fontWeight: 700, lineHeight: 1.5 }}>{s.label}</div>
            {s.desc && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, marginTop: 8, maxWidth: 520, marginInline: "auto" }}>{s.desc}</div>}
            {value != null && (
              <button onClick={() => openNumberDrawer(value)} title={`פתח את מגירת המספר ${value}`}
                style={{ marginTop: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 9, flexWrap: "wrap", justifyContent: "center", background: "rgba(212,175,55,0.14)", border: `1px solid ${P.accent}`, borderRadius: 999, padding: "6px 18px" }}>
                <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>{s.label}</span>
                <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 18, fontWeight: 800 }}>=</span>
                <span style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{value}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
