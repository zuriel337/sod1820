// 🌳 העץ האחד — שכבת-הידע הציבורית של אטלס-היחסים (חזון צוריאל 12.7.2026):
// OneTreeWidget (עמוד הבית) — עץ גרפי שרואים אותו גדל: כל ענף = סוג-יחס, גודל העלווה = ממצאים שנבדקו.
// AtlasFindings (בית המדרש) — טאבים לפי יחס + 🌍 שפות. עקרונות: שקיפות (יחס+שיטה) ·
// קריטריונים ("למה אושר?") · הדרגתיות (דרגות-תמיכה 🔵🟣🌍, לא בינארי) · "נבדק במחקר", לא "הוכח".
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { F } from "../theme.js";
import { getOneTreeStats, getAtlasFindings, getVerifiedBridges, getMethodSemantics } from "../lib/supabase.js";

// מטא-יחסים: relation_type → {emoji, label} — נבנה מהמודל הפרשני (method_semantics), עם נפילה עדינה.
const REL_FALLBACK = {
  mirror: { emoji: "🪞", label: "יחס מראה" }, complement: { emoji: "🌗", label: "השלמה" },
  hidden: { emoji: "🔍", label: "נסתר" }, inner: { emoji: "🕯", label: "פנימיות" },
  progression: { emoji: "🌱", label: "התפתחות" }, calendar: { emoji: "📅", label: "שנה כפולה" },
  revealed: { emoji: "🔆", label: "גלוי" }, order: { emoji: "🔢", label: "סדר" }, scale: { emoji: "🔭", label: "קנה-מידה" },
};
function useRelMeta() {
  const [meta, setMeta] = useState(REL_FALLBACK);
  useEffect(() => {
    getMethodSemantics().then(sem => {
      const m = { ...REL_FALLBACK };
      for (const s of Object.values(sem)) if (s.relation_type && !m[s.relation_type]) m[s.relation_type] = { emoji: s.emoji, label: s.label_he };
      setMeta(m);
    }).catch(() => {});
  }, []);
  return meta;
}

// ===== 🌳 העץ בעמוד הבית — גרפיקה חיה של הצמיחה =====
// 🎨 dual_theme_every_element_law: כל הצבעים דרך משתני-CSS scoped — כהה (ברירת-מחדל) + בהיר
//    ([data-theme="light"]): טקסט חום-כהה קריא (§3 של city_background_dual_theme_law), בלי צהוב-על-בהיר.
const TREE_CSS = `
.one-tree { --otg:#d4af37; --otg-dim:rgba(212,175,55,.55); --ot-ink:rgba(240,230,200,.85); --ot-ink2:rgba(240,230,200,.72);
  --ot-leaf:rgba(212,175,55,.14); --ot-leaf2:rgba(212,175,55,.05); --ot-trunk:#8a6a24; --ot-green:#7fd49a;
  --ot-chipbg:rgba(212,175,55,.08); --ot-btn-ink:#1a0e00; }
[data-theme="light"] .one-tree { --otg:#6d4e0b; --otg-dim:rgba(109,78,11,.6); --ot-ink:#33260a; --ot-ink2:#5a4310;
  --ot-leaf:rgba(109,78,11,.10); --ot-leaf2:rgba(109,78,11,.03); --ot-trunk:#7a5c1e; --ot-green:#1d7a44;
  --ot-chipbg:rgba(109,78,11,.07); --ot-btn-ink:#fffbe9; }
.one-tree .ot-branch { stroke: var(--ot-trunk); }
.one-tree .ot-leafc  { fill: var(--ot-leaf); stroke: var(--otg); transition: transform .25s ease; transform-box: fill-box; transform-origin: center; }
.one-tree g:hover .ot-leafc { transform: scale(1.07); fill: var(--ot-leaf2); }
.one-tree .ot-num    { fill: var(--otg); }
`;
export function OneTreeWidget() {
  const [stats, setStats] = useState(null);
  const rel = useRelMeta();
  const nav = useNavigate();
  useEffect(() => { getOneTreeStats().then(setStats).catch(() => {}); }, []);
  const branches = useMemo(() => {
    const by = { ...(stats?.by_relation || {}) };
    // 🌍 המילים באנגלית שאושרו (גשרי-שפה) — ענף מלא בעץ, לא רק שורש
    if (stats?.bridges > 0) by.bridges = stats.bridges;
    return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [stats]);
  if (!stats || !branches.length) return null;

  const W = 340, H = 238, baseY = 208, trunkX = W / 2, crownY = baseY - 78;
  // מיקומי עלווה קבועים (עד 7 ענפים) — פרושים מעל הגזע
  const POS = [[trunkX, 50], [trunkX - 94, 82], [trunkX + 94, 82], [trunkX - 54, 122], [trunkX + 54, 122], [trunkX, 128], [trunkX - 122, 134]];
  const r = c => Math.min(34, 13 + Math.sqrt(c) * 4.2);

  return (
    <div className="one-tree" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
      <style>{TREE_CSS}</style>
      <div style={{ color: "var(--otg-dim)", fontFamily: F.heading, fontSize: 12, letterSpacing: 3, marginBottom: 4 }}>🌳 העץ האחד</div>
      <div style={{ color: "var(--otg)", fontFamily: F.regal, fontSize: "clamp(19px,3.2vw,25px)", fontWeight: 800, marginBottom: 2 }}>כך המחקר גדל</div>
      <div style={{ color: "var(--ot-ink2)", fontFamily: F.body, fontSize: 13, marginBottom: 10 }}>
        כל ענף = סוג-יחס · כל עלה = ממצא שנבדק במחקר{stats.findings_week > 0 && <> · <b style={{ color: "var(--ot-green)" }}>🌿 +{stats.findings_week} השבוע</b></>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 430, overflow: "visible" }} role="img" aria-label="עץ הידע — ממצאים לפי סוג יחס">
        {/* אדמה — צל רך + קו-קרקע */}
        <ellipse cx={trunkX} cy={baseY + 3} rx={95} ry={7} fill="var(--ot-leaf)" />
        <line x1={34} y1={baseY} x2={W - 34} y2={baseY} stroke="var(--otg-dim)" strokeWidth="1.5" strokeLinecap="round" />
        {/* גזע מתעבה עם התפצלות עדינה */}
        <path d={`M ${trunkX - 9} ${baseY} C ${trunkX - 7} ${baseY - 40}, ${trunkX - 4} ${baseY - 58}, ${trunkX - 1} ${crownY}
                  L ${trunkX + 1} ${crownY} C ${trunkX + 4} ${baseY - 58}, ${trunkX + 7} ${baseY - 40}, ${trunkX + 9} ${baseY} Z`}
          fill="var(--ot-trunk)" opacity="0.85" />
        {/* ענפים מעוקלים + עלווה */}
        {branches.map(([type, count], i) => {
          const [x, y] = POS[i] || POS[POS.length - 1];
          const m = type === "bridges" ? { emoji: "🌍", label: "גשרי-שפה" } : (rel[type] || { emoji: "•", label: type });
          const rad = r(count);
          const midX = (trunkX + x) / 2, midY = Math.min(crownY, y) - 14;   // עיקול כלפי מעלה
          const go = () => nav(`/beit-midrash?atlas=${encodeURIComponent(type)}`);
          return (
            <g key={type} onClick={go} style={{ cursor: "pointer" }} role="link" aria-label={`${m.label} — ${count} ממצאים`}>
              <path d={`M ${trunkX} ${crownY} Q ${midX} ${midY} ${x} ${y + rad - 3}`} className="ot-branch" fill="none" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
              <circle cx={x} cy={y} r={rad} className="ot-leafc" strokeWidth="1.5" />
              <text x={x} y={y - 3} textAnchor="middle" fontSize={Math.max(13, rad * 0.6)}>{m.emoji}</text>
              <text x={x} y={y + rad * 0.52} textAnchor="middle" fontSize="12" fontWeight="800" className="ot-num" fontFamily="inherit">{count}</text>
            </g>
          );
        })}
      </svg>
      {/* השורשים — ממה העץ ניזון */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        {[
          { e: "🌱", t: `${(stats.axis_words || 0).toLocaleString("he")} מילים בציר`, to: "/beit-midrash" },
          { e: "⚓", t: `${stats.anchors || 0} עוגנים`, to: "/beit-midrash" },
          { e: "🧩", t: `${stats.families_approved || 0} משפחות`, to: "/beit-midrash?atlas=all" },
          { e: "🌍", t: `${stats.bridges || 0} גשרי-שפה`, to: "/beit-midrash?atlas=bridges" },
        ].map((c, i) => (
          <Link key={i} to={c.to} style={{ textDecoration: "none", color: "var(--ot-ink)", background: "var(--ot-chipbg)", border: `1px solid var(--otg-dim)`, borderRadius: 999, padding: "5px 13px", fontFamily: F.body, fontSize: 12.5, fontWeight: 700 }}>
            {c.e} {c.t}
          </Link>
        ))}
      </div>
      <Link to="/beit-midrash?atlas=all" style={{ display: "inline-block", marginTop: 12, textDecoration: "none", color: "var(--ot-btn-ink)", background: `linear-gradient(135deg, var(--otg), var(--ot-trunk))`, borderRadius: 999, padding: "9px 22px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>
        🌳 לכל הממצאים שנבדקו — בבית המדרש ←
      </Link>
    </div>
  );
}

// ===== 🌳 אטלס הממצאים בבית המדרש — טאבים לפי יחס + 🌍 שפות =====
export function AtlasFindings({ mode = "light" }) {
  // 🎨 חוק הדו-צבעיות (atlas_dual_theme_law): שני מצבים מובנים דרך פלטה scoped — לא inline קשיח.
  // בבית-המדרש (משטח בהיר, research_workspace_law) → light; על משטח כהה → mode="dark".
  const C0 = mode === "dark"
    ? { ink: "#efe6cf", dim: "rgba(240,230,200,0.62)", card: "rgba(255,255,255,0.045)", border: "rgba(212,175,55,0.3)", acc: "#d4af37", accSoft: "rgba(212,175,55,0.16)" }
    : { ink: "#1b1d22", dim: "#5b6472", card: "#ffffff", border: "#e3e6ec", acc: "#2f6df6", accSoft: "rgba(47,109,246,0.10)" };
  const [sp] = useSearchParams();
  const rel = useRelMeta();
  const [tab, setTab] = useState(() => sp.get("atlas") || "all");
  const rootRef = React.useRef(null);
  // 🔗 ניווט מהעץ: שינוי ?atlas= (גם כשהעמוד כבר פתוח) מעדכן את הטאב הפנימי
  useEffect(() => { const a = sp.get("atlas"); if (a && a !== tab) setTab(a); }, [sp]); // eslint-disable-line
  // 🎯 נחיתה מהעץ (?atlas=) — גוללים ישר אל תוך מדור-האטלס, לא רק פותחים את הטאב
  useEffect(() => {
    if (sp.get("atlas")) setTimeout(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }, []); // eslint-disable-line
  const [items, setItems] = useState([]);
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true; setLoading(true);
    if (tab === "bridges") {
      getVerifiedBridges().then(b => { if (live) { setBridges(b); setLoading(false); } });
    } else {
      getAtlasFindings(tab === "all" ? null : tab, 60).then(f => { if (live) { setItems(f); setLoading(false); } });
    }
    return () => { live = false; };
  }, [tab]);
  const types = useMemo(() => {
    const t = [...new Set(items.map(i => i.relation_type))];
    return t.length ? t : Object.keys(rel).slice(0, 6);
  }, [items, rel]);

  const chip = (bg, bd, c) => ({ display: "inline-block", background: bg, border: `1px solid ${bd}`, color: c, borderRadius: 999, padding: "2px 9px", fontSize: 10.5, fontWeight: 800, fontFamily: F.heading });

  return (
    <div ref={rootRef} style={{ scrollMarginTop: 76 }}>
      {/* כותרת ברורה — כאן זה האטלס, לא המעבדה: מפריד ניווטית בין המדורים */}
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ color: C0.ink, fontFamily: F.regal, fontSize: 21, fontWeight: 800 }}>🌳 אטלס הממצאים</div>
        <div style={{ color: C0.dim, fontFamily: F.body, fontSize: 13, marginTop: 3 }}>שכבת-הידע — קשרים שנבדקו ואושרו במחקר · לפי סוג-יחס · המחשבון והמעבדה במדורים שלצד</div>
      </div>
      {/* טאבים */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
        {[["all", "🌳 הכל"], ...Object.entries(rel).filter(([k]) => ["mirror", "complement", "hidden", "inner", "progression", "calendar"].includes(k)).map(([k, v]) => [k, `${v.emoji} ${v.label}`]), ["bridges", "🌍 שפות"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ cursor: "pointer", background: tab === k ? C0.accSoft : "transparent", border: `1px solid ${tab === k ? C0.acc : C0.border}`, color: tab === k ? C0.acc : C0.dim, borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontWeight: 700, fontSize: 12.5 }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: C0.dim, textAlign: "center", padding: 14 }}>טוען את הממצאים…</div> : tab === "bridges" ? (
        <div style={{ display: "grid", gap: 8 }}>
          {bridges.map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", background: C0.card, border: `1px solid ${C0.border}`, borderRadius: 12, padding: "10px 14px" }}>
              <span style={chip("rgba(76,175,125,0.12)", "rgba(76,175,125,0.55)", "#7fd49a")}>✓ גשר מאומת</span>
              <b style={{ color: C0.ink, fontFamily: F.heading, fontSize: 15 }} dir="ltr">{b.alias}</b>
              <span style={{ color: C0.dim }}>↔</span>
              <Link to={`/number/${encodeURIComponent(b.hebrew || "")}`} style={{ textDecoration: "none", color: C0.acc, fontFamily: F.heading, fontWeight: 800, fontSize: 15 }}>{b.hebrew}</Link>
              {b.value != null && <span style={{ color: C0.dim, fontSize: 12 }}>({b.value})</span>}
              <span style={{ color: C0.dim, fontSize: 11, marginInlineStart: "auto" }}>{b.lang}</span>
            </div>
          ))}
          {!bridges.length && <div style={{ color: C0.dim, textAlign: "center" }}>גשרי-שפה מאומתים יופיעו כאן.</div>}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((f, i) => {
            const m = rel[f.relation_type] || { emoji: "•", label: f.relation_type };
            return (
              <div key={i} style={{ background: C0.card, border: `1px solid ${C0.border}`, borderRadius: 12, padding: "10px 14px", textAlign: "start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span style={chip("rgba(76,175,125,0.12)", "rgba(76,175,125,0.55)", "#7fd49a")}>✓ נבדק במחקר</span>
                  <Link to={`/number/${encodeURIComponent(f.a_phrase)}`} style={{ textDecoration: "none", color: C0.acc, fontFamily: F.heading, fontWeight: 800, fontSize: 15.5 }}>{f.a_phrase}</Link>
                  <span style={{ color: C0.dim }}>↔</span>
                  <Link to={`/number/${encodeURIComponent(f.b_phrase)}`} style={{ textDecoration: "none", color: C0.acc, fontFamily: F.heading, fontWeight: 800, fontSize: 15.5 }}>{f.b_phrase}</Link>
                  <span style={{ color: C0.dim, fontFamily: F.body, fontSize: 12 }}>{m.emoji} {m.label} · {f.method}{f.value ? ` = ${f.value}` : ""}</span>
                  {/* דרגות-תמיכה — הדרגתי, לא בינארי */}
                  <span style={{ display: "flex", gap: 5, marginInlineStart: "auto", flexWrap: "wrap" }}>
                    {f.multi_method && <span style={chip("rgba(62,166,255,0.10)", "rgba(62,166,255,0.5)", "#7cbcf5")}>🔵 כמה שיטות</span>}
                    {f.family_supported && <span style={chip("rgba(138,99,244,0.10)", "rgba(138,99,244,0.5)", "#b49af0")}>🟣 משפחת-עוגן</span>}
                    {f.bridge_supported && <span style={chip("rgba(76,175,125,0.10)", "rgba(76,175,125,0.5)", "#7fd49a")}>🌍 גשר-שפה</span>}
                  </span>
                </div>
                {f.note && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer", color: C0.dim, fontFamily: F.body, fontSize: 11.5 }}>למה אושר?</summary>
                    <div style={{ color: C0.ink, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginTop: 5, opacity: 0.9 }}>{f.note}</div>
                  </details>
                )}
              </div>
            );
          })}
          {!items.length && <div style={{ color: C0.dim, textAlign: "center" }}>עדיין אין ממצאים שנבדקו ביחס הזה.</div>}
        </div>
      )}
      <div style={{ color: C0.dim, fontFamily: F.body, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 12 }}>
        הערכים = עובדה מאומתת במנוע · סוגי-היחס והאישור = מסגרת-המחקר של סוד 1820 (נבדק — לא "הוכחה אוניברסלית").
      </div>
    </div>
  );
}
