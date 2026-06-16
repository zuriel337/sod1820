import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { C, F, calcGem, KEY_NUMBERS } from "../theme.js";
import { getEntityBundle, supabase } from "../lib/supabase.js";
import { useGold, sortGoldFirst } from "../lib/goldTier.js";
import { stripHtml } from "../lib/format.js";
import PulseRing, { pulseFromCounts } from "../components/PulseRing.jsx";
import ConvergenceMeter from "../components/ConvergenceMeter.jsx";
import NumberDNA from "../components/NumberDNA.jsx";
import ZeroScaleLinks from "../components/ZeroScaleLinks.jsx";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import { METHODS } from "../lib/gematria.js";
import { SITE_URL } from "../lib/seo.js";

const ANCHOR_SET = new Set([1820, 776, 358, 424, 604, 26, 86, 314, 543, 91, 13, 1237, 541, 137, 248, 611, 1202, 318]);
const BASE8 = METHODS.filter(m => ["רגיל", "מילוי", "מסתתר", "קדמי", "גדול", "סידורי", "אתבש", "אלבם"].includes(m.key));

// 🧬 פאנל ההתכנסות לדף הישות — לביטוי: שורת ערכי-שיטות (העוגן מודגש ונבחר אוטומטית); למספר: ישר המד.
function EntityConvergence({ term, isNumber, ragil }) {
  const vals = isNumber ? null : BASE8.map(m => ({ key: m.key, v: m.fn(term) }));
  const anchorHit = vals && vals.find(x => ANCHOR_SET.has(x.v));
  const [sel, setSel] = useState(isNumber ? ragil : (anchorHit ? anchorHit.v : ragil));
  useEffect(() => { setSel(isNumber ? ragil : (anchorHit ? anchorHit.v : ragil)); }, [term, isNumber, ragil]); // eslint-disable-line

  return (
    <div className="em-panel" style={{ marginBottom: 22, borderRadius: 16, border: `1px solid ${C.borderGold}`, background: "rgba(8,5,2,0.4)", overflow: "hidden" }}>
      {vals && (
        <div style={{ padding: "12px 14px 4px" }}>
          <div className="em-eyebrow" style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 9 }}>בחרו שיטה — העוגן הקדוש נבחר אוטומטית</div>
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
                  <div className="em-val" style={{ color: on ? C.goldBright : C.goldLight, fontFamily: F.mono, fontSize: 15, fontWeight: 800 }}>{x.v}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <ConvergenceMeter value={sel} />
      <NumberDNA value={sel} />
      {/* הגדלה + עיצוב נקי במחשב בלבד, וממוקד לדף המספר (.em-panel) — בנייד וב-drawer נשאר כפי שהוא */}
      <style>{`
        @media (min-width: 900px) {
          .em-panel .em-eyebrow { font-size: 12.5px !important; }
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


// כפתורי שיתוף (וואטסאפ + העתקה) — לולאת ויראליות "שתפו עם חבר"
function ShareButtons({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
        style={{ background: "#25D366", color: "#06310f", fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "10px 22px", borderRadius: 999, textDecoration: "none" }}>
        🟢 שתפו עם חבר
      </a>
      <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{ cursor: "pointer", background: C.surface, color: C.goldLight, border: `1px solid ${C.borderGold}`, fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "10px 18px", borderRadius: 999 }}>
        {copied ? "✓ הועתק" : "🔗 העתק קישור"}
      </button>
    </div>
  );
}

// ===== דף הישות (Entity Page) — מרכז כל המידע סביב מספר/ביטוי =====
// /number/:phrase — מספר (1237) או ביטוי (דוד המלך). מרכז: ערך+מילים שוות,
// פוסטים, גלריות, ציר ההתגלות, חידושי AI, דיוני קהילה, צפנים, סרטונים.

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionHead({ icon, title, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(19px,3vw,25px)", fontWeight: 700, margin: 0 }}>
        {icon} {title}
      </h2>
      {count != null && (
        <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 999, padding: "1px 10px" }}>
          {count}
        </span>
      )}
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.borderGold}, transparent)` }} />
    </div>
  );
}

const card = {
  background: "linear-gradient(135deg, rgba(20,15,12,0.6), rgba(8,5,2,0.45))",
  border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px",
  textDecoration: "none", display: "block", transition: "border-color 0.2s, transform 0.2s",
};

export default function EntityPage() {
  const { phrase } = useParams();
  const nav = useNavigate();
  const term = decodeURIComponent(phrase || "").trim();
  const isNumber = /^\d+$/.test(term);
  const value = isNumber ? Number(term) : calcGem(term);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [q, setQ] = useState("");
  const goSearch = e => { e.preventDefault(); const v = q.trim(); if (v) { setQ(""); nav(`/number/${encodeURIComponent(v)}`); } };

  useEffect(() => {
    let alive = true;
    setLoading(true); setData(null);
    getEntityBundle({ term, value, isNumber })
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    document.title = `${term} · ${value} — ${isNumber ? "דף המספר" : "דף הביטוי"} · סוד 1820`;
    return () => { alive = false; };
  }, [term, value, isNumber]);

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
      });
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

  // מספר ספרה-בודדת (1–9) → מספר יסוד; מפנים לסולמות במקום להציף תוצאות.
  if (isNumber && value < 10) {
    return (
      <div style={{ direction: "rtl", maxWidth: 620, margin: "0 auto", padding: "72px 24px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <button onClick={() => nav(-1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 30 }}>← חזרה</button>
        <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: "clamp(60px,12vw,110px)", fontWeight: 800, lineHeight: 1, textShadow: "0 0 40px rgba(212,175,55,0.4)" }}>{value}</div>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 16, lineHeight: 2, maxWidth: 460, margin: "18px auto 26px" }}>
          זהו <b style={{ color: C.goldLight }}>מספר יסוד</b> (ספרה בודדת). מספר בודד מופיע באינספור מקומות — לכן חוקרים אותו דרך מסע «סולמות ההתגלות», שם כל ספרה נפתחת לרבדים.
        </p>
        <Link to="/sulamot" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 10, textDecoration: "none", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00", fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>
          🪜 לסולמות ההתגלות →
        </Link>
      </div>
    );
  }

  // בזמן בדיקת חתימות (מספרים) — placeholder קצר למניעת הבהוב לפני השער
  if (isNumber && value >= 10 && !sigsLoaded) {
    return (
      <div style={{ direction: "rtl", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
        <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: "clamp(46px,9vw,84px)", fontWeight: 800, opacity: 0.45 }}>{value}</div>
      </div>
    );
  }
  // ── שער מלכותי — נפתח בלחיצה (number_page_law, שכבה 2) ──
  if (hasGate && !gateOpen) {
    return <RoyalGate value={value} signatures={sigs} onOpen={() => setGateOpen(true)} onBack={() => nav(-1)} />;
  }

  return (
    <div style={{ direction: "rtl", maxWidth: 920, margin: "0 auto", padding: "44px 20px 100px", position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <button onClick={() => nav(-1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>← חזרה</button>
        <form onSubmit={goSearch} style={{ marginInlineStart: "auto", display: "flex", gap: 7 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חפשו מספר או ביטוי…" dir="rtl" style={{ background: C.surface, border: `1px solid ${C.borderGold}`, borderRadius: 999, color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "9px 18px", outline: "none", textAlign: "center", width: 200 }} />
          <button type="submit" style={{ cursor: "pointer", background: C.goldDeep, color: C.goldBright, border: `1px solid ${C.borderGold}`, borderRadius: 999, fontFamily: F.heading, fontWeight: 700, fontSize: 14, padding: "9px 18px" }}>חפש ✦</button>
        </form>
      </div>

      {/* ── ראש: הערך ── */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>
          {isNumber ? "דף המספר" : "דף הביטוי"}
        </div>
        {!isNumber && (
          <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: "clamp(22px,4vw,34px)", fontWeight: 700, marginBottom: 2 }}>{term}</div>
        )}
        <div style={{ color: C.goldBright, fontFamily: F.mono, fontSize: "clamp(46px,9vw,84px)", fontWeight: 800, lineHeight: 1, textShadow: "0 0 40px rgba(212,175,55,0.4)" }}>
          {value}
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 1, marginTop: 6 }}>
          {isNumber ? "הערך המספרי" : "גימטריית הביטוי"}
        </div>
        <ShareButtons text={isNumber
          ? `המספר ${value} — גלו מה מסתתר בו 🔢✨\n${SITE_URL}/number/${value}`
          : `הגימטריה של "${term}" = ${value} ✨\nגלו את הסוד בשם שלכם במחשבון של סוד 1820:\n${SITE_URL}/number/${encodeURIComponent(term)}`} />
      </div>

      {/* ── זיקת האפסים (חוק zero_scale_law) — אותו שורש בסדר גודל אחר ── */}
      {value >= 10 && (
        <div style={{ marginBottom: 26 }}>
          <ZeroScaleLinks value={value} />
        </div>
      )}

      {/* ── ✦ טבעת החתימות (מתגלה אחרי פתיחת השער) ── */}
      {hasGate && <SignaturesRing signatures={sigs} value={value} />}

      {/* ── 🧬 DNA המספר — משפט פותח חי + דופק ── */}
      {!loading && chips.length > 0 && (() => {
        const cnt = { posts: d.postsCount || 0, galleries: d.galleriesCount || 0, words: d.phrases?.length || 0, events: d.eventsCount || 0, ai: d.insightsCount || 0, comm: d.commentsCount || 0 };
        const parts = [];
        if (cnt.posts) parts.push(`${cnt.posts} פוסטים`);
        if (cnt.galleries) parts.push(`${cnt.galleries} גלריות`);
        if (cnt.words) parts.push(`${cnt.words} מילים שוות`);
        if (cnt.events) parts.push(`${cnt.events} אירועים בציר`);
        if (cnt.ai) parts.push(`${cnt.ai} חידושי AI`);
        if (cnt.comm) parts.push(`${cnt.comm} תובנות קהילה`);
        const pulse = pulseFromCounts(cnt);
        return (
          <div style={{ marginBottom: 22, padding: "18px 20px", borderRadius: 16, border: `1px solid ${C.borderGold}`, background: "linear-gradient(135deg, rgba(20,15,12,0.6), rgba(8,5,2,0.45))", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <PulseRing value={pulse} size={104} core={isNumber && !!KEY_NUMBERS[value]} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="dna-label" style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>🧬 DNA המספר</div>
              <p className="dna-text" style={{ color: C.goldLight, fontFamily: F.body, fontSize: 16.5, lineHeight: 1.95, margin: 0 }}>
                <b style={{ color: C.goldBright, fontFamily: F.mono }}>{value}</b> הוא מספר חי במערכת{parts.length ? `, המחובר ל־${parts.join(" · ")}` : ""}.
                {isNumber && KEY_NUMBERS[value] && <span style={{ color: C.goldDim }}> {KEY_NUMBERS[value]}.</span>}
              </p>
              <style>{`@media (min-width: 900px){ .dna-label{ font-size: 13px !important; letter-spacing: 3px !important; } .dna-text{ font-size: 21px !important; line-height: 1.75 !important; font-weight: 500 !important; } }`}</style>
            </div>
          </div>
        );
      })()}

      {/* ── 🧬 מד ההתכנסות + ערכי השיטות ── */}
      <EntityConvergence term={term} isNumber={isNumber} ragil={value} />

      {/* ── מפת קשרים מהירה ── */}
      {loading ? (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 30 }}>טוען את כל הקשרים…</div>
      ) : chips.length > 0 ? (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
          padding: "16px 14px", marginBottom: 40, borderRadius: 16,
          border: `1px solid ${C.borderGold}`, background: "rgba(8,5,2,0.4)",
        }}>
          {chips.map(c => (
            <button key={c.id} onClick={() => scrollTo(c.id)} style={{
              cursor: "pointer", background: "rgba(20,15,12,0.6)", border: `1px solid ${C.border}`,
              color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700,
              padding: "8px 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ fontSize: 16 }}>{c.e}</span>
              <b style={{ color: C.goldBright }}>{c.n}</b> {c.l}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 20, marginBottom: 30 }}>
          עדיין לא נמצאו קשרים ל«{term}» — נסו מספר או ביטוי אחר.
        </div>
      )}

      {/* ✨ קחו אותי למסע — הילוך אקראי בגרף הקשרים */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <Link to={`/journey?from=${encodeURIComponent(term)}`} style={{
          display: "inline-block", textDecoration: "none",
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00",
          fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "12px 26px", borderRadius: 999,
          boxShadow: `0 0 30px ${C.goldDeep}`,
        }}>🎲 קחו אותי למסע מ־{value}</Link>
      </div>

      {/* קישור-לימוד: הסבר על שיטות הגימטריה (רגיל/מילוי/מסתתר...) */}
      <div style={{ textAlign: "center", marginBottom: 34 }}>
        <Link to="/beit-midrash?tab=methods" style={{
          display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none",
          background: "rgba(212,175,55,0.08)", border: `1px solid ${C.border}`, borderRadius: 999,
          color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "8px 16px",
        }}>📖 לא מכירים את שיטות הגימטריה (מסתתר · מילוי · קדמי)? למדו בבית המדרש ←</Link>
      </div>

      {/* ── 🖼 גלריות — תמונות רחבות מלאות (האחרונות קודם), 2 טורים ── */}
      {d.galleries?.length > 0 && (
        <section id="galleries" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
          <SectionHead icon="🖼" title="גלריות ותמונות · האחרונות" count={d.galleriesCount} />
          <style>{`.ent-gal{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}@media(max-width:680px){.ent-gal{grid-template-columns:1fr}}`}</style>
          <div className="ent-gal">
            {d.galleries.map(g => (
              <button key={g.id} onClick={() => setLightbox(g)} style={{
                cursor: "pointer", padding: 0, borderRadius: 12, overflow: "hidden", textAlign: "right",
                border: `1px solid ${C.border}`, background: "linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45))",
              }} className="ent-gal-card">
                <img src={g.image_url} alt={g.name || ""} loading="lazy"
                  style={{ width: "100%", height: "auto", display: "block" }} />
                {(g.name || g.description) && (
                  <div style={{ padding: "10px 13px" }}>
                    {g.name && <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 14.5, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>{g.name}</div>}
                    {g.description && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.75, maxHeight: 66, overflow: "hidden" }}>{stripHtml(g.description).slice(0, 160)}</div>}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 🌳 עץ המספרים + מילים שוות ── */}
      <section id="tree" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
        <SectionHead icon="🌳" title="עץ המספרים ומילים שוות" count={d.phrasesCount || d.phrases?.length || null} />
        {d.phrases?.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {sortGoldFirst(d.phrases, p => gold.labels.has(p.phrase)).map((p, i) => {
              const isG = gold.labels.has(p.phrase);
              return (
              <Link key={i} to={`/number/${encodeURIComponent(p.phrase)}`} style={{
                textDecoration: "none", color: isG ? C.goldBright : C.goldLight, fontFamily: F.body, fontSize: 14,
                border: `1px solid ${isG ? C.gold : C.border}`, borderRadius: 999, padding: "5px 13px",
                background: isG ? "rgba(212,175,55,0.16)" : "rgba(20,15,12,0.5)",
                boxShadow: isG ? `0 0 14px ${C.goldDeep}` : "none", fontWeight: isG ? 700 : 400,
              }}>{isG ? "✦ " : ""}{p.phrase}</Link>
            );})}
          </div>
        ) : (
          <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14, marginBottom: 14 }}>אין מילים נוספות בערך זה במאגר.</p>
        )}
        <Link to="/numbers" style={{ color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
          פתחו את {value} בעץ המספרים התלת-מימדי →
        </Link>
      </section>

      {/* ── 📖 פוסטים ── */}
      {d.posts?.length > 0 && (
        <section id="posts" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
          <SectionHead icon="📖" title="פוסטים" count={d.postsCount} />
          <div style={{ display: "grid", gap: 10 }}>
            {d.posts.map(p => (
              <Link key={p.wp_id || p.slug} to={`/${p.slug}`} style={card}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>
                  {stripHtml(typeof p.title === "string" ? p.title : p.title?.rendered || "")}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 🕰 ציר ההתגלות ── */}
      {d.events?.length > 0 && (
        <section id="events" style={{ marginBottom: 44, scrollMarginTop: 80 }}>
          <SectionHead icon="🌅" title="ציר ההתגלות" count={d.eventsCount} />
          <div style={{ display: "grid", gap: 10 }}>
            {d.events.map(ev => (
              <Link key={ev.id} to="/timeline" style={card}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
                  {stripHtml(ev.label || "")}
                </div>
                {ev.hebrew_date && <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginTop: 4 }}>{ev.hebrew_date}</div>}
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
                <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  {stripHtml(it.title || "חידוש")}
                </div>
                {it.body && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75 }}>{stripHtml(it.body).slice(0, 180)}</div>}
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
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8 }}>{stripHtml(c.content || "").slice(0, 220)}</div>
                {c.author_name && <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginTop: 6 }}>— {c.author_name}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 🔍 דילוגי אותיות + 🎥 סרטונים (קישורי גילוי) ── */}
      <section style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Link to="/code" style={{ ...card, textAlign: "center" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🔍</div>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>חפשו «{term}» בדילוגי האותיות</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>מנוע הצפנים בטקסט התורה</div>
        </Link>
        <Link to="/post" style={{ ...card, textAlign: "center" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🎥</div>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700 }}>סרטונים ופוסטים</div>
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>כל התוכן באתר</div>
        </Link>
      </section>

      {/* ── Lightbox (סגירה ב-× או לחיצה על הרקע) ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, zIndex: 300, background: "rgba(3,2,8,0.94)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(820px,96vw)", maxHeight: "92vh", overflowY: "auto", direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setLightbox(null)} aria-label="סגור" style={{
                background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright,
                fontSize: 24, cursor: "pointer", borderRadius: 8, width: 44, height: 44, lineHeight: 1,
              }}>×</button>
            </div>
            <img src={lightbox.image_url} alt={lightbox.name || ""}
              style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.borderGold}`, display: "block" }} />
            {lightbox.name && <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 700, marginTop: 12 }}>{lightbox.name}</div>}
            {lightbox.description && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, marginTop: 8, whiteSpace: "pre-wrap" }}>{stripHtml(lightbox.description)}</div>}
            {(lightbox.all_values?.length > 0) && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                {lightbox.all_values.slice(0, 10).map((v, i) => (
                  <Link key={i} to={`/number/${v}`} onClick={() => setLightbox(null)} style={{
                    textDecoration: "none", color: v === lightbox.primary_value ? "#1a0e00" : C.goldLight,
                    background: v === lightbox.primary_value ? C.gold : "rgba(8,5,2,0.5)",
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
  );
}

// ── שער מלכותי: המסך הראשון של מספר־יסוד עם חתימות (number_page_law) ──
function RoyalGate({ value, signatures, onOpen, onBack }) {
  return (
    <div style={{ direction: "rtl", minHeight: "82vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "50px 20px", position: "relative", zIndex: 1 }}>
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

// ── טבעת החתימות: ישויות-העל שמתכנסות למספר (נחשפות בפתיחת השער) ──
function SignaturesRing({ signatures, value }) {
  if (!signatures?.length) return null;
  return (
    <section style={{ marginBottom: 36 }}>
      <style>{`@keyframes sigIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}`}</style>
      <div style={{ textAlign: "center", color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>✦ טבעת החתימות ✦</div>
      <div style={{ display: "grid", gap: 13 }}>
        {signatures.map((s, i) => (
          <div key={s.label} style={{ animation: `sigIn .6s ease both ${0.1 + i * 0.18}s`, background: "linear-gradient(135deg, rgba(212,175,55,0.20), rgba(212,175,55,0.04))", border: `1.5px solid ${C.gold}`, borderRadius: 16, padding: "17px 22px", textAlign: "center", boxShadow: `0 0 28px ${C.goldDeep}` }}>
            <div style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13, letterSpacing: 1, marginBottom: 7 }}>{s.title}</div>
            <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: "clamp(17px,2.7vw,23px)", fontWeight: 700, lineHeight: 1.5 }}>{s.label}</div>
            {s.desc && <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, marginTop: 8, maxWidth: 520, marginInline: "auto" }}>{s.desc}</div>}
            {value != null && (
              <button onClick={() => openNumberDrawer(value)} title={`פתח את מגירת המספר ${value}`}
                style={{ marginTop: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 9, flexWrap: "wrap", justifyContent: "center", background: "rgba(212,175,55,0.16)", border: `1px solid ${C.gold}`, borderRadius: 999, padding: "6px 18px", boxShadow: `0 0 18px ${C.goldDeep}` }}>
                <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>{s.label}</span>
                <span style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 18, fontWeight: 800 }}>=</span>
                <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{value}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
