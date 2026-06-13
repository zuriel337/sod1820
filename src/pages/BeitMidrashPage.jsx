import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { F, KEY_NUMBERS } from "../theme.js";
import { getInsights, supabase } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";

// ===== בית המדרש — דוגמית עיצוב בהיר (אקדמי / פורטל אוניברסיטה) =====
// שחור על לבן, רחב, תפריט-צד + טאבים, מבוסס טקסט. גרפיקה כבדה (מחשבון 3D) נטענת רק בטאב שלה.
const GematriaCalculator3D = React.lazy(() => import("../components/GematriaCalculator3D.jsx"));
import GematriaCalculator from "../components/GematriaCalculator.jsx";

// פלטה בהירה מקומית (רק לבית המדרש)
const L = {
  bg: "#f4f1e8", panel: "#ffffff", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc", soft: "#faf8f2",
  blue: "#2563eb", blueBg: "#eef4ff", blueLine: "#cfe0ff",
};

const SECTIONS = [
  { key: "sod1820", icon: "✦", label: "1820 · סוד הסודות" },
  { key: "numbers", icon: "🔢", label: "מספרי יסוד" },
  { key: "calc", icon: "🧮", label: "מחשבון גימטריה" },
  { key: "ai", icon: "🔵", label: "חידושי AI", ai: true },
  { key: "verified", icon: "🔵", label: "פוסטים מאומתים", ai: true },
  { key: "mine", icon: "✦", label: "חידושי המערכת" },
  { key: "community", icon: "💬", label: "חידושי גולשים", soon: true },
  { key: "submit", icon: "✍️", label: "הגשת חידוש משלך", soon: true },
];

// תג AI כחול (בהיר)
function AiTag({ small }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: L.blueBg, border: `1px solid ${L.blueLine}`, color: L.blue, borderRadius: 999, padding: small ? "1px 7px" : "2px 9px", fontFamily: F.heading, fontSize: small ? 10.5 : 11.5, fontWeight: 700 }}>
      🔵 AI · מאומת
    </span>
  );
}

// שיתוף — וואטסאפ + העתקה
function ShareRow({ text, url }) {
  const full = url ? `${text} ${url}` : text;
  const [copied, setCopied] = useState(false);
  const btn = { cursor: "pointer", background: L.soft, border: `1px solid ${L.line}`, borderRadius: 999, color: L.sub, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, padding: "4px 11px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 };
  return (
    <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
      <a href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noopener noreferrer" style={btn}>🟢 שיתוף</a>
      <button onClick={() => { navigator.clipboard?.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={btn}>
        {copied ? "✓ הועתק" : "🔗 העתק"}
      </button>
    </div>
  );
}

// כרטיס חידוש בהיר (נפתח)
function StudyCard({ item, ai }) {
  const [open, setOpen] = useState(false);
  const nums = item.related_numbers || [];
  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderInlineStart: `3px solid ${ai ? L.blue : L.gold}`, borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {ai ? <AiTag small /> : <span style={{ color: L.gold, fontFamily: F.heading, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>✦ המערכת</span>}
        {nums.length > 0 && <span style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 12.5, fontWeight: 700 }}>{nums.slice(0, 4).join(" · ")}</span>}
      </div>
      <button onClick={() => setOpen(o => !o)} style={{ cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "right", width: "100%" }}>
        <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 17, fontWeight: 700, lineHeight: 1.5 }}>{item.title}</span>
      </button>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${L.line}` }}>
          {item.body && <p style={{ color: "#3a342a", fontFamily: F.body, fontSize: 15, lineHeight: 1.95, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{item.body}</p>}
          {item.proof && <p style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8, margin: 0 }}><b style={{ color: L.goldDeep }}>הוכחה: </b>{item.proof}</p>}
        </div>
      )}
      <ShareRow text={item.title} />
    </div>
  );
}

// טבלת מספרי יסוד בהירה (bidim)
const ANCHORS = [1820, 1237, 776, 358, 541, 318, 1202, 86, 45, 26];
const COLS = ["רגיל", "מילוי", "מסתתר", "קדמי", "אתבש"];
function NumbersTab({ initial }) {
  const [val, setVal] = useState(initial || 1820);
  const [rows, setRows] = useState(null);
  useEffect(() => { if (initial) setVal(initial); }, [initial]);
  const anchors = ANCHORS.includes(val) ? ANCHORS : [val, ...ANCHORS];
  useEffect(() => {
    let live = true; setRows(null);
    (async () => {
      const { data: ph } = await supabase.from("bidim").select("phrase").eq("method", "רגיל").eq("value", val).limit(80);
      const phrases = [...new Set((ph || []).map(r => r.phrase).filter(Boolean))];
      if (!phrases.length) { if (live) setRows([]); return; }
      const { data: all } = await supabase.from("bidim").select("phrase,method,value").in("phrase", phrases);
      const map = {}; (all || []).forEach(r => { (map[r.phrase] ||= {})[r.method] = r.value; });
      if (live) setRows(phrases.map(p => ({ phrase: p, vals: map[p] || {} })).sort((a, b) => a.phrase.length - b.phrase.length));
    })();
    return () => { live = false; };
  }, [val]);
  const th = { background: L.soft, color: L.goldDeep, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "10px 12px", textAlign: "center", borderBottom: `2px solid ${L.line}`, whiteSpace: "nowrap" };
  const td = { color: L.ink, fontFamily: F.body, fontSize: 14, padding: "9px 12px", borderBottom: `1px solid ${L.line}` };
  const num = { ...td, fontFamily: F.mono, fontWeight: 700, color: L.goldDeep, textAlign: "center" };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {anchors.map(n => (
          <button key={n} onClick={() => setVal(n)} style={{ cursor: "pointer", fontFamily: F.mono, fontSize: 15, fontWeight: 800, padding: "7px 15px", borderRadius: 999, border: `1px solid ${n === val ? L.gold : L.line}`, background: n === val ? "#fbf3da" : L.panel, color: n === val ? L.goldDeep : L.sub }}>{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 26, fontWeight: 800 }}>{val}</span>
        {KEY_NUMBERS[val] && <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 16 }}>{KEY_NUMBERS[val]}</span>}
        {val === 1820 && <span style={{ background: "#fbf3da", border: `1px solid ${L.gold}`, color: L.goldDeep, borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>★ קוד האתר</span>}
      </div>
      {rows === null ? <div style={{ color: L.sub, padding: 16 }}>טוען…</div> : rows.length === 0 ? <div style={{ color: L.sub, padding: 16 }}>אין ביטויים למספר זה.</div> : (
        <div style={{ overflowX: "auto", border: `1px solid ${L.line}`, borderRadius: 12, background: L.panel }}>
          <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
            <thead><tr><th style={{ ...th, textAlign: "right" }}>ביטוי</th>{COLS.map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}><Link to={`/number/${encodeURIComponent(r.phrase)}`} style={{ color: L.goldDeep, textDecoration: "none", fontWeight: 700 }}>{r.phrase}</Link></td>
                  {COLS.map(c => <td key={c} style={num}>{r.vals[c] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VerifiedTab() {
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    let live = true;
    supabase.from("posts").select("wp_id,title,slug,image_url,ai_number").eq("verified", true).order("modified", { ascending: false, nullsFirst: false }).limit(60)
      .then(({ data }) => { if (live) setPosts(data || []); });
    return () => { live = false; };
  }, []);
  if (posts === null) return <div style={{ color: L.sub, padding: 20 }}>טוען…</div>;
  if (!posts.length) return <div style={{ color: L.sub, padding: 20 }}>עדיין אין פוסטים מאומתים.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
      {posts.map(p => (
        <div key={p.wp_id} style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <Link to={`/${p.slug}`} style={{ textDecoration: "none" }}>
            <div style={{ position: "relative", aspectRatio: "16/10", background: p.image_url ? `center/cover no-repeat url(${p.image_url})` : "#ece4d2" }}>
              <span style={{ position: "absolute", top: 8, insetInlineStart: 8 }}><AiTag small /></span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{stripHtml(p.title || "")}</div>
              {p.ai_number && <div style={{ color: L.sub, fontFamily: F.mono, fontSize: 12, marginTop: 6 }}>מספר מאומת: {p.ai_number}</div>}
            </div>
          </Link>
          <div style={{ padding: "0 14px 12px" }}><ShareRow text={stripHtml(p.title || "")} url={`https://sod1820.co.il/${p.slug}`} /></div>
        </div>
      ))}
    </div>
  );
}

// ✦ 1820 — המקום הקבוע: סוד השם / סוד הסודות + לימוד
function Sod1820Tab() {
  return (
    <div>
      <div style={{ background: L.panel, border: `1px solid ${L.gold}`, borderRadius: 14, padding: "22px 24px", marginBottom: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: "clamp(42px,8vw,64px)", fontWeight: 800, lineHeight: 1 }}>1820</span>
          <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 22, fontWeight: 700 }}>סוד השם · קוד האתר</span>
        </div>
        <p style={{ color: "#3a342a", fontFamily: F.body, fontSize: 16, lineHeight: 2, margin: "14px 0 0", maxWidth: 700 }}>
          <b style={{ color: L.goldDeep }}>1820 = מספר הפעמים ששם הוי״ה (יהוה) מופיע בתורה.</b> זהו סוד הסודות של האתר — הציר שסביבו נסובים כל החידושים, האירועים והמספרים. {KEY_NUMBERS[1820]}.
        </p>
        <div style={{ marginTop: 14 }}>
          <Link to="/שם-ה-בתורה-1820-פעם" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: "#fbf3da", border: `1px solid ${L.gold}`, borderRadius: 999, color: L.goldDeep, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, padding: "8px 16px" }}>★ פוסט היסוד — שם ה' בתורה 1820 פעם ←</Link>
        </div>
      </div>
      <h3 style={{ color: L.ink, fontFamily: F.regal, fontSize: 19, fontWeight: 700, margin: "0 0 14px" }}>הביטויים ששווים ל-1820</h3>
      <NumbersTab initial={1820} />
    </div>
  );
}

// טאב המחשבון — מחשבון בהיר + רשימת מספרים דקה משמאלו (לחיצה טוענת את המספר).
const NUM_LIST = [1820, 1237, 776, 1202, 541, 358, 474, 424, 318, 888, 666, 2701, 86, 72, 45, 26, 14];
function CalcTab() {
  const [seed, setSeed] = useState(null);
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }} className="bm-calc">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, margin: "0 0 16px" }}>
          מחשבון גימטריה מתקדם — כל 8 השיטות, מילים שוות, ופירוט אות-אות. חישוב טהור, ללא AI.
        </p>
        <GematriaCalculator seed={seed} />
      </div>
      <aside className="bm-numlist" style={{ width: 92, flex: "0 0 auto", position: "sticky", top: 20 }}>
        <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>מספרים</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: "70vh", overflowY: "auto" }}>
          {NUM_LIST.map(n => (
            <button key={n} onClick={() => setSeed(String(n))} title={KEY_NUMBERS[n] || ""} style={{
              cursor: "pointer", fontFamily: F.mono, fontSize: 14, fontWeight: 800, padding: "7px 4px", borderRadius: 8,
              border: `1px solid ${L.line}`, background: L.panel, color: L.goldDeep,
            }}>{n}</button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Soon({ title, note }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: L.sub }}>
      <div style={{ fontSize: 38, marginBottom: 12 }}>🌱</div>
      <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, border: `1px solid ${L.line}`, background: L.soft, color: L.goldDeep, fontFamily: F.heading, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🔒 בקרוב</div>
      <p style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.9, maxWidth: 420, margin: "0 auto" }}>{note}</p>
    </div>
  );
}

export default function BeitMidrashPage() {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const nParam = Number(params.get("n")) || null;
  const tabParam = params.get("tab");
  const [tab, setTab] = useState(nParam ? "numbers" : (SECTIONS.some(s => s.key === tabParam) ? tabParam : "sod1820"));
  const [ai, setAi] = useState(null);
  const [mine, setMine] = useState(null);

  useEffect(() => {
    if (tab === "ai" && ai === null) getInsights({ origin: "ai", space: null, limit: 60 }).then(d => setAi(d || [])).catch(() => setAi([]));
    if (tab === "mine" && mine === null) getInsights({ origin: "צוריאל", space: "core", limit: 60 }).then(d => setMine(d || [])).catch(() => setMine([]));
  }, [tab, ai, mine]);

  const active = SECTIONS.find(s => s.key === tab) || SECTIONS[0];

  return (
    <div style={{ background: L.bg, minHeight: "100vh", direction: "rtl", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 22px 90px" }}>
        {/* כותרת */}
        <div style={{ borderBottom: `2px solid ${L.line}`, paddingBottom: 18, marginBottom: 22 }}>
          <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>בית המדרש · סוד 1820</div>
          <h1 style={{ color: L.ink, fontFamily: F.regal, fontSize: "clamp(28px,5vw,46px)", fontWeight: 700, margin: 0 }}>📖 לימוד הסודות</h1>
          <p style={{ color: L.sub, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.8, margin: "8px 0 0", maxWidth: 640 }}>
            ארכיון חי של גימטריה, חידושים ומחקר — חידושי המערכת, חידושי AI מאומתים, וכלים אינטראקטיביים, במקום אחד.
          </p>
        </div>

        {/* גוף: תפריט-צד + תוכן */}
        <div style={{ display: "flex", gap: 26, alignItems: "flex-start" }} className="bm-grid">
          {/* תפריט צד (ימין ב-RTL) */}
          <nav className="bm-side" style={{ width: 230, flex: "0 0 auto", position: "sticky", top: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {SECTIONS.map(s => {
                const on = s.key === tab;
                return (
                  <button key={s.key} onClick={() => setTab(s.key)} style={{
                    cursor: "pointer", textAlign: "right", display: "flex", alignItems: "center", gap: 9,
                    border: "none", borderInlineStart: `3px solid ${on ? L.gold : "transparent"}`,
                    background: on ? "#fff" : "transparent", color: on ? L.ink : L.sub,
                    fontFamily: F.heading, fontSize: 15, fontWeight: 700, padding: "11px 14px", borderRadius: "0 8px 8px 0",
                    boxShadow: on ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                  }}>
                    <span>{s.icon}</span>
                    <span style={{ flex: 1 }}>{s.label}</span>
                    {s.ai && <span style={{ width: 8, height: 8, borderRadius: "50%", background: L.blue }} />}
                    {s.soon && <span style={{ fontSize: 10, color: L.sub, fontWeight: 700 }}>בקרוב</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* תוכן */}
          <main style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <h2 style={{ color: L.ink, fontFamily: F.regal, fontSize: 24, fontWeight: 700, margin: 0 }}>{active.icon} {active.label}</h2>
              {active.ai && <AiTag />}
            </div>

            {tab === "sod1820" && <Sod1820Tab />}
            {tab === "numbers" && <NumbersTab initial={nParam} />}
            {tab === "calc" && <CalcTab />}
            {tab === "ai" && (ai === null ? <div style={{ color: L.sub, padding: 20 }}>טוען…</div> :
              <div style={{ display: "grid", gap: 12 }}>{ai.map(it => <StudyCard key={it.id} item={it} ai />)}</div>)}
            {tab === "mine" && (mine === null ? <div style={{ color: L.sub, padding: 20 }}>טוען…</div> :
              <div style={{ display: "grid", gap: 12 }}>{mine.map(it => <StudyCard key={it.id} item={it} />)}</div>)}
            {tab === "verified" && <VerifiedTab />}
            {tab === "community" && <Soon title="חידושי גולשים" note="הקהילה תוכל לשתף כאן חידושים משלה — בבדיקה ואימות. נפתח בקרוב." />}
            {tab === "submit" && <Soon title="הגשת חידוש משלך" note="טופס להגשת חידוש גימטריה לבדיקה ופרסום בהיכל הלימוד. נפתח בקרוב." />}
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .bm-grid { flex-direction: column; }
          .bm-side { width: 100% !important; position: static !important; }
          .bm-side > div { flex-direction: row !important; overflow-x: auto; gap: 6px !important; padding-bottom: 6px; }
          .bm-side button { border-inline-start: none !important; border-radius: 999px !important; white-space: nowrap; border: 1px solid ${L.line} !important; }
        }
        @media (max-width: 700px) {
          .bm-calc { flex-direction: column; }
          .bm-numlist { width: 100% !important; position: static !important; }
          .bm-numlist > div:last-child { flex-direction: row !important; overflow-x: auto; max-height: none !important; }
        }
      `}</style>
    </div>
  );
}
