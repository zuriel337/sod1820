import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { F, calcGem, KEY_NUMBERS } from "../theme.js";
import { supabase, logSearch, getHarvestedPosts } from "../lib/supabase.js";
import RecentSearches from "../components/RecentSearches.jsx";
import { useGold, sortGoldFirst } from "../lib/goldTier.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import ConvergenceMeter from "../components/ConvergenceMeter.jsx";
import NumberDNA from "../components/NumberDNA.jsx";
import ZeroScaleLinks from "../components/ZeroScaleLinks.jsx";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import { SITE_URL } from "../lib/seo.js";
import { buildNumberCard, shareNumberCard, downloadNumberCard, shareNumberSmart } from "../lib/numberCard.js";
import { buildMessages } from "../lib/numberMessage.js";
import { resolve, getScore, getBundle } from "../lib/engine.js";
import { usePalette } from "../lib/palette.js";

const ANCHOR_SET = new Set([1820, 776, 358, 424, 604, 26, 86, 314, 543, 91, 13, 1237, 541, 137, 248, 611, 1202, 318]);
const BASE8 = METHODS.filter(m => ["רגיל", "מילוי", "מסתתר", "קדמי", "גדול", "סידורי", "אתבש", "אלבם"].includes(m.key));
const ALL14 = [...METHODS, ...DEPTH_METHODS];   // כל השיטות — לשכבת השורשים

// מתג התמה גלובלי בנאבבר (הוסר מדף המספר — כפילות)

// 🧬 פאנל ההתכנסות (יושב בתוך "מעבדה" כהה) — לביטוי: ערכי-שיטות (העוגן נבחר אוטומטית); למספר: ישר המד.
function EntityConvergence({ term, isNumber, ragil }) {
  const P = usePalette();
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
    <div className="em-panel" style={{ marginBottom: 14, borderRadius: 14, border: `1px solid ${P.border}`, background: P.cardSoft, overflow: "hidden" }}>
      {vals && (
        <div style={{ padding: "12px 14px 4px" }}>
          <div className="em-eyebrow" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginBottom: 9 }}>כמה דרכים לקרוא את הביטוי — בחרו, והעוגן הקדוש מודגש</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {vals.map(x => {
              const on = x.v === sel; const anc = ANCHOR_SET.has(x.v);
              return (
                <button key={x.key} onClick={() => setSel(x.v)} title={anc ? "עוגן קדוש" : ""} style={{
                  cursor: "pointer", borderRadius: 10, padding: "5px 10px", textAlign: "center",
                  border: `1px solid ${on ? P.accent : anc ? P.borderStrong : P.border}`,
                  background: on ? "rgba(201,162,39,0.18)" : anc ? "rgba(201,162,39,0.08)" : P.card,
                }}>
                  <div className="em-key" style={{ color: anc ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 9.5, fontWeight: 700 }}>{anc ? "✨ " : ""}{x.key}</div>
                  <div className="em-val" style={{ color: on ? P.ink : P.accentText, fontFamily: F.mono, fontSize: 15, fontWeight: 800 }}><span style={{ color: P.accentDim, fontWeight: 700 }}>= </span>{x.v}</div>
                  {x.sub && <div className="em-sub" style={{ color: P.accentDim, fontFamily: F.body, fontSize: 8.5, lineHeight: 1.25, marginTop: 2, maxWidth: 96, opacity: 0.85 }}>{x.sub}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* המד + המספר עצמו גדול משמאלו (זהות מיידית בתוך ה-DNA) */}
      <div className="em-meterwrap" style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ConvergenceMeter value={sel} />
        </div>
        <div className="em-bignum" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 14px", borderInlineStart: `1px solid ${P.border}`, background: P.card }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>המספר</div>
          <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(38px,9vw,68px)", fontWeight: 900, lineHeight: 0.95, textShadow: `0 0 26px ${P.glow}` }}>{sel}</div>
          {isNumber && KEY_NUMBERS[sel] && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 7, textAlign: "center", maxWidth: 130, lineHeight: 1.45 }}>{KEY_NUMBERS[sel]}</div>}
        </div>
      </div>
      <NumberDNA value={sel} />
      <style>{`
        .em-meterwrap .em-bignum { min-width: 96px; }
        @media (max-width: 460px) {
          .em-meterwrap { flex-direction: column-reverse !important; }
          .em-meterwrap .em-bignum { border-inline-start: none !important;
            border-bottom: 1px solid ${P.border}; flex-direction: row !important; gap: 10px; padding: 10px 14px !important; }
        }
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
function ShareButtons({ value, term, phrases, copyText, onPreview }) {
  const P = usePalette();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  async function share() {
    if (busy) return;
    setBusy(true);
    try { await shareNumberSmart(value, phrases); } finally { setBusy(false); }
  }
  const icoBtn = { cursor: "pointer", background: P.cardSoft, color: P.accentText, border: `1px solid ${P.border}`, borderRadius: 999, width: 40, height: 40, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
      <button onClick={share} disabled={busy}
        style={{ cursor: busy ? "wait" : "pointer", background: P.accentBtn, color: P.onAccent, border: "none", fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "11px 26px", borderRadius: 999 }}>
        {busy ? "מכין…" : "✦ שתפו"}
      </button>
      <Link to={`/journey?from=${encodeURIComponent(term ?? value)}`} title="מסע אקראי בגרף"
        style={{ textDecoration: "none", cursor: "pointer", background: P.cardSoft, color: P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "11px 18px" }}>🎲 מסע</Link>
      <button onClick={onPreview} title="תצוגה מקדימה" aria-label="תצוגה מקדימה" style={icoBtn}>🖼</button>
      <button onClick={() => { navigator.clipboard?.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        title="העתק קישור" aria-label="העתק קישור" style={icoBtn}>{copied ? "✓" : "🔗"}</button>
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

// 📂 אקורדיון נקי ועקבי — כותרת לחיצה + גוף נפתח. יפה ופשוט וברור.
function Acc({ id, icon, title, count, open, onToggle, P, children }) {
  const isOpen = !!open[id];
  return (
    <div id={id} style={{ marginBottom: 12, scrollMarginTop: 70 }}>
      <button onClick={() => onToggle(id)} style={{
        width: "100%", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
        background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: "13px 16px", textAlign: "right",
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ flex: 1, color: P.ink, fontFamily: F.regal, fontSize: 16.5, fontWeight: 700 }}>{title}</span>
        {count != null && <span style={{ color: P.accentDim, fontFamily: F.mono, fontSize: 12.5, fontWeight: 700, border: `1px solid ${P.border}`, borderRadius: 999, padding: "1px 9px" }}>{count}</span>}
        <span style={{ color: P.accent, fontSize: 12, animation: isOpen ? "none" : "acc-blink 1.6s ease-in-out infinite" }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

// ❤️‍🔥 דופק המספר — עוצמה רגשית (כוכבים + הילה פועמת) מציון ההתכנסות (0-100). מזמין לחקור.
function NumberPulse({ value, onExplore }) {
  const P = usePalette();
  const [score, setScore] = useState(null);
  useEffect(() => {
    if (!value || value < 10) { setScore(null); return; }
    let live = true;
    getScore(value).then(s => { if (live) setScore(s); }).catch(() => { if (live) setScore(null); });
    return () => { live = false; };
  }, [value]);
  if (score == null) return null;
  const stars = Math.max(1, Math.min(5, Math.round(score / 20)));
  const label = score >= 85 ? "נדיר · יסודי" : score >= 55 ? "עוצמה גבוהה" : score >= 25 ? "מתעורר" : "נוכחות שקטה";
  return (
    <button onClick={onExplore} title="גלו למה המספר הזה חזק"
      style={{ cursor: "pointer", background: "none", border: "none", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4, margin: "12px auto 0" }}>
      <style>{`@keyframes np-pulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.1);opacity:1}}`}</style>
      <div style={{ display: "inline-flex", gap: 3, fontSize: 21, color: P.accent,
        filter: `drop-shadow(0 0 ${5 + score / 6}px ${P.glow})`, animation: "np-pulse 2.6s ease-in-out infinite" }}>
        {[0, 1, 2, 3, 4].map(i => <span key={i} style={{ opacity: i < stars ? 1 : 0.22 }}>★</span>)}
      </div>
      <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, letterSpacing: 0.3 }}>
        {label} · {score}/100 ↓
      </span>
    </button>
  );
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
  const [sp] = useSearchParams();
  const fromCalc = sp.get("from") === "calc";
  const { term, value, isNumber } = resolve(decodeURIComponent(phrase || ""));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [harvest, setHarvest] = useState([]);
  const [cardUrl, setCardUrl] = useState(null);   // תמונת המספר שנוצרה (תצוגה מקדימה)
  const [q, setQ] = useState("");
  // שכבה 3 (DNA) — עומק "דביק" (נשמר ב-localStorage); שכבה 4 (שורשים) — כבדה, נפתחת ידנית.
  // מילים תמיד פתוחות; השאר דביק (זוכר מה הגולש פתח); ברירת מחדל ראשונה = מילים + שורשים.
  const [open, setOpen] = useState(() => {
    let stored = null; try { stored = JSON.parse(localStorage.getItem("np-open") || "null"); } catch { /* ignore */ }
    const base = (stored && typeof stored === "object") ? stored : { galleries: false, posts: false, dna: false, roots: true };
    return { words: true, galleries: !!base.galleries, posts: !!base.posts, dna: !!base.dna, roots: !!base.roots };
  });
  const persistOpen = m => { try { localStorage.setItem("np-open", JSON.stringify({ galleries: m.galleries, posts: m.posts, dna: m.dna, roots: m.roots })); } catch { /* ignore */ } };
  const toggleAcc = id => setOpen(o => { const n = { ...o, [id]: !o[id] }; persistOpen(n); return n; });
  const allOpen = Object.values(open).every(Boolean);
  const setAll = v => setOpen(() => { const n = { words: v, galleries: v, posts: v, dna: v, roots: v }; persistOpen(n); return n; });
  const goChip = id => {
    if (["events", "insights", "comments"].includes(id)) setOpen(o => ({ ...o, roots: true }));
    else if (["words", "galleries", "posts"].includes(id)) setOpen(o => ({ ...o, [id]: true }));
    setTimeout(() => scrollTo(id), 70);
  };
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
    setLoading(true); setData(null); setOpen(o => ({ ...o, words: true }));
    getBundle({ term, value, isNumber })
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    document.title = `${term} · ${value} — ${isNumber ? "דף המספר" : "דף הביטוי"} · סוד 1820`;
    if (term) logSearch(term, value);
    return () => { alive = false; };
  }, [term, value, isNumber]);

  // הגעה ממחשבון/שיטה עם focus=dna → פותח את צירי ההתכנסות (DNA) וגולל אליהם
  useEffect(() => {
    if (sp.get("focus") === "dna") {
      setOpen(o => ({ ...o, dna: true }));
      const t = setTimeout(() => scrollTo("dna"), 300);
      return () => clearTimeout(t);
    }
  }, [term]); // eslint-disable-line

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
    d.phrases?.length && { id: "words", e: "🌳", n: d.phrasesCount || d.phrases.length, l: "מילים שוות" },
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
          <Link to="/number" style={{ textDecoration: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>← 🔢 מנוע המספרים</Link>
          {fromCalc && <Link to="/beit-midrash?tab=calc" style={{ textDecoration: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>← 🧮 חזרה למחשבון</Link>}
          <form onSubmit={goSearch} style={{ marginInlineStart: "auto", display: "flex", gap: 7 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="חפשו מספר או ביטוי…" dir="rtl" style={{ background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.ink, fontFamily: F.body, fontSize: 14, padding: "9px 18px", outline: "none", textAlign: "center", width: 180 }} />
            <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 14, padding: "9px 18px" }}>חפש ✦</button>
          </form>
        </div>

        {/* ── הירו: מספר + משפט חם + שיתוף ── */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>
            {isNumber ? "דף המספר" : "דף הביטוי"}
          </div>
          {!isNumber && (
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 700, marginBottom: 2 }}>{term}</div>
          )}
          <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(46px,9vw,84px)", fontWeight: 800, lineHeight: 1, textShadow: `0 0 40px ${P.glow}` }}>
            {value}
          </div>
          {/* 💎 קופסת הזהות — למה המספר חשוב (וואו ב-3 שניות) */}
          {(() => {
            const typeLabel = hasGate ? "מספר חתימה" : (isNumber ? ((ANCHOR_SET.has(value) || KEY_NUMBERS[value]) ? "מספר יסוד" : "מספר חי") : "ביטוי חי");
            const totalConn = (d.postsCount || 0) + (d.galleriesCount || 0) + (d.phrases?.length || 0) + (d.eventsCount || 0) + (d.insightsCount || 0) + (d.commentsCount || 0);
            return (
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8, margin: "14px auto 0", padding: "11px 22px", borderRadius: 16, background: P.cardSoft, border: `1px solid ${P.border}` }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", justifyContent: "center", alignItems: "center" }}>
                  <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>👑 {typeLabel}</span>
                  {hasGate && <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, fontWeight: 600 }}>· 📜 {sigs.length} חתימות</span>}
                  {totalConn > 0 && <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, fontWeight: 600 }}>· 🌳 מחובר ל-{totalConn}</span>}
                </div>
                <NumberPulse value={value} onExplore={() => { setOpen(o => ({ ...o, dna: true })); setTimeout(() => scrollTo("dna"), 80); }} />
              </div>
            );
          })()}
          {msgs[0] && (
            <p style={{ color: P.ink, fontFamily: F.body, fontSize: "clamp(16px,2.4vw,19px)", fontWeight: 600, lineHeight: 1.7, maxWidth: 520, margin: "12px auto 0" }}>
              {msgs[0].text}
            </p>
          )}
          {msgs[1] && msgs[1].layer !== "F" && (
            <p style={{ color: P.accentText, fontFamily: F.body, fontSize: 14.5, fontWeight: 600, lineHeight: 1.6, maxWidth: 480, margin: "6px auto 0" }}>
              ✦ הידעת? {msgs[1].text}
            </p>
          )}
          <ShareButtons
            value={value}
            term={term}
            phrases={data?.phrases || []}
            onPreview={openCard}
            copyText={isNumber
              ? `המספר ${value} — מה הוא אומר עליך? 🔢✨\n${SITE_URL}/number/${value}`
              : `הגימטריה של "${term}" = ${value} ✨\nגלו את הסוד בשם שלכם במחשבון של סוד 1820:\n${SITE_URL}/number/${encodeURIComponent(term)}`} />
        </div>

        {/* ── ✦ טבעת החתימות (למספרי-חתימה, אחרי פתיחת השער) ── */}
        {hasGate && <SignaturesRing signatures={sigs} value={value} />}

        {/* ── 📂 מספרים קרובים (ימין) + פתח/סגור הכל (שמאל) — zero_scale_law ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          {value >= 10 && (() => {
            const near = [value * 10, (value % 10 === 0 ? value / 10 : null), value * 100].filter(n => n && n !== value);
            return near.length ? (
              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>קרובים ✦</span>
                {near.map(n => (
                  <Link key={n} to={`/number/${n}`} style={{ textDecoration: "none", color: P.accentText, background: P.card, border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 11px", fontFamily: F.mono, fontSize: 12.5, fontWeight: 700 }}>{n}</Link>
                ))}
              </div>
            ) : null;
          })()}
          <button onClick={() => setAll(!allOpen)} style={{ marginInlineStart: "auto", cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 999, color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "6px 14px" }}>
            {allOpen ? "⊖ סגור הכל" : "⊕ פתח הכל"}
          </button>
        </div>

        {/* ── 🌳 מילים שוות — קודם (לב הגימטריה: מה שווה למספר) ── */}
        <Acc id="words" icon="🌳" title="מילים שוות" count={d.phrasesCount || d.phrases?.length || null} open={open} onToggle={toggleAcc} P={P}>
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
        </Acc>

        {/* ── 🖼 גלריות — אחרי המילים ── */}
        {d.galleries?.length > 0 && (
          <Acc id="galleries" icon="🖼" title="תמונות מהמאגר" count={d.galleriesCount} open={open} onToggle={toggleAcc} P={P}>
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
          </Acc>
        )}

        {/* ── 🧬 DNA — איך המספר בנוי (אקורדיון, פאנל "מעבדה" כהה בפנים) ── */}
        <Acc id="dna" icon="🧬" title="DNA — איך המספר בנוי" open={open} onToggle={toggleAcc} P={P}>
            <div style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 16, padding: "14px 13px" }}>
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
                  <div style={{ marginBottom: 14, padding: "13px 18px", borderRadius: 14, border: `1px solid ${P.border}`, background: P.card }}>
                    <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 2, marginBottom: 7 }}>🧬 DNA המספר</div>
                    <p style={{ color: P.ink, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.85, margin: 0 }}>
                      <b style={{ color: P.accentText, fontFamily: F.mono }}>{value}</b> הוא מספר חי במערכת{parts.length ? `, המחובר ל־${parts.join(" · ")}` : ""}.
                      {isNumber && KEY_NUMBERS[value] && <span style={{ color: P.accentDim }}> {KEY_NUMBERS[value]}.</span>}
                    </p>
                  </div>
                );
              })()}

              <EntityConvergence term={term} isNumber={isNumber} ragil={value} />

              {value >= 10 && <div style={{ marginTop: 10 }}><ZeroScaleLinks value={value} /></div>}

              <div style={{ textAlign: "center", marginTop: 14 }}>
                <Link to="/beit-midrash?tab=methods" style={{
                  display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none",
                  background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 999,
                  color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "8px 16px",
                }}>📖 ללמוד את שיטות הגימטריה (מסתתר · מילוי · קדמי) בבית המדרש ←</Link>
              </div>
            </div>
        </Acc>

        {/* טעינה / אין קשרים (הוסרה שורת הכפילות שחזרה על כותרות האקורדיונים) */}
        {loading ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 24 }}>טוען…</div>
        ) : chips.length === 0 ? (
          <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 18, marginBottom: 16 }}>
            עדיין לא נמצאו קשרים ל«{term}» — נסו מספר או ביטוי אחר.
          </div>
        ) : null}

        {/* ── 📖 פוסטים (כלי עזר — מקס 4 + הצלבות 3) ── */}
        {(d.posts?.length > 0 || harvest.length > 0) && (
          <Acc id="posts" icon="📖" title="פוסטים והצלבות" count={Math.min(d.posts?.length || 0, 4) + Math.min(harvest.length, 3)} open={open} onToggle={toggleAcc} P={P}>
            <div style={{ display: "grid", gap: 10 }}>
              {(d.posts || []).slice(0, 4).map(p => (
                <Link key={p.wp_id || p.slug} to={`/${p.slug}`} style={card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                  <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
                    {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                  </div>
                </Link>
              ))}
              {harvest.slice(0, 3).map(p => (
                <Link key={`h-${p.wp_id || p.slug}`} to={`/${p.slug}`} style={card} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                  <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
                    {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                  </div>
                  {p.via && <div style={{ marginTop: 6, fontSize: 12.5, color: P.accent, opacity: 0.9 }}>דרך «{p.via}»</div>}
                </Link>
              ))}
            </div>
          </Acc>
        )}

        {/* ── 🌱 שורשי המספר (אקורדיון — כל השיטות, אירועים, קהילה, צפנים) ── */}
        <Acc id="roots" icon="🌱" title="שורשי המספר" open={open} onToggle={toggleAcc} P={P}>
          <div>
            {/* כל השיטות (לביטוי בלבד — למספר אין אותיות) */}
            {!isNumber && (
              <section style={{ marginBottom: 40 }}>
                <SectionHead icon="🧮" title="כל השיטות" count={ALL14.length} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                  {ALL14.map(m => {
                    const mv = m.fn(term);
                    return (
                      <Link key={m.key} to={`/number/${mv}`} title={`פתח את ${mv}`} style={{ ...card, padding: "10px 12px" }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                          <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>{m.key}</span>
                          <span style={{ color: P.ink, fontFamily: F.mono, fontSize: 16, fontWeight: 800 }}>{mv} <span style={{ color: P.accentDim, fontSize: 11 }}>→</span></span>
                        </div>
                        {m.soul && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{m.soul}</div>}
                      </Link>
                    );
                  })}
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
        </Acc>

        {/* ── 🕒 נחקר לאחרונה — מקור מאוחד, דרגות לפי משתמש ── */}
        <div style={{ marginTop: 24 }}>
          <RecentSearches max={6} seeAllTo="/beit-midrash?tab=searches" />
        </div>

        {/* ── תמונת המספר — תצוגה מקדימה + שיתוף/הורדה (מודאל כהה) ── */}
        {cardUrl && (
          <div onClick={() => setCardUrl(null)} style={{
            position: "fixed", inset: 0, zIndex: 320, background: "rgba(3,2,8,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 18, direction: "rtl",
          }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "min(440px, 94vw)", textAlign: "center" }}>
              <img src={cardUrl} alt={`תמונת המספר ${value}`} style={{ width: "100%", borderRadius: 16, border: "1px solid rgba(212,175,55,0.38)", boxShadow: "0 18px 60px rgba(0,0,0,0.7)", display: "block" }} />
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
                <button onClick={() => shareNumberCard(value, data?.phrases || [])} style={{
                  cursor: "pointer", background: "linear-gradient(135deg, #d4af37, #e8c840)", color: "#1a0e00",
                  border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "11px 24px",
                }}>📲 שתפו</button>
                <button onClick={() => downloadNumberCard(value, data?.phrases || [])} style={{
                  cursor: "pointer", background: "transparent", color: "#f6e27a", border: "1px solid rgba(212,175,55,0.38)",
                  borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "11px 20px",
                }}>📷 שמרו</button>
                <button onClick={() => setCardUrl(null)} style={{
                  cursor: "pointer", background: "transparent", color: "#cfc9d6", border: "1px solid rgba(212,175,55,0.18)",
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
                  background: "none", border: "1px solid rgba(212,175,55,0.38)", color: "#f6e27a",
                  fontSize: 24, cursor: "pointer", borderRadius: 8, width: 44, height: 44, lineHeight: 1,
                }}>×</button>
              </div>
              <img src={lightbox.image_url} alt={lightbox.name || ""} style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(212,175,55,0.38)", display: "block" }} />
              {lightbox.name && <div style={{ color: "#e8c840", fontFamily: F.regal, fontSize: 17, fontWeight: 700, marginTop: 12 }}>{lightbox.name}</div>}
              {lightbox.description && <div style={{ color: "#cfc9d6", fontFamily: F.body, fontSize: 14, lineHeight: 1.9, marginTop: 8, whiteSpace: "pre-wrap" }}>{stripHtml(lightbox.description)}</div>}
              {(lightbox.all_values?.length > 0) && (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                  {lightbox.all_values.slice(0, 10).map((v, i) => (
                    <Link key={i} to={`/number/${v}`} onClick={() => setLightbox(null)} style={{
                      textDecoration: "none", color: v === lightbox.primary_value ? "#1a0e00" : "#e8c840",
                      background: v === lightbox.primary_value ? "#d4af37" : "rgba(8,5,2,0.5)",
                      border: "1px solid rgba(212,175,55,0.38)", borderRadius: 999, padding: "3px 11px",
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

// ── שער מלכותי: המסך הראשון של מספר־יסוד עם חתימות (number_page_law). תמה-מודע (usePalette) ──
function RoyalGate({ value, signatures, onOpen, onBack }) {
  const P = usePalette();
  return (
    <div style={{ direction: "rtl", background: P.pageBg, minHeight: "82vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "50px 20px", position: "relative", zIndex: 1 }}>
      <style>{`
        @keyframes gateRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes gateGlow{0%,100%{text-shadow:0 0 40px rgba(212,175,55,.35)}50%{text-shadow:0 0 75px rgba(212,175,55,.65)}}
      `}</style>
      <button onClick={onBack} style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", color: P.inkSoft, cursor: "pointer", fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>← חזרה</button>
      <div style={{ fontSize: 42, marginBottom: 4, animation: "gateRise .6s ease both" }}>👑</div>
      <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(64px,15vw,140px)", fontWeight: 800, lineHeight: 1, animation: "gateRise .7s ease both, gateGlow 4.5s ease-in-out infinite 1.2s" }}>{value}</div>
      <p style={{ color: P.ink, fontFamily: F.regal, fontSize: "clamp(16px,2.5vw,23px)", lineHeight: 1.85, margin: "24px 0 4px", maxWidth: 470, animation: "gateRise .95s ease both" }}>
        יש מספרים שמספרים סיפור.<br />ויש מספרים שהם הסיפור עצמו.
      </p>
      <button onClick={onOpen} style={{ marginTop: 28, cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 17, fontWeight: 800, padding: "15px 36px", boxShadow: `0 0 44px ${P.glow}`, animation: "gateRise 1.15s ease both" }}>
        ✨ גלו את כל עולמו של {value} ✨
      </button>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 1.5, marginTop: 20, animation: "gateRise 1.35s ease both" }}>
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
