import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { F, KEY_NUMBERS, calcGem } from "../theme.js";
import { getEntityBundle, getTopicCards, getGalleryImagesByIds, supabase, dayOfYear } from "../lib/supabase.js";
import { topicTag } from "../lib/topicCards.js";
import { stripHtml } from "../lib/format.js";
import PulseRing, { pulseFromCounts } from "../components/PulseRing.jsx";
import { METHODS, onlyHeb, GEM } from "../lib/gematria.js";
import SubscribeGate, { useSubscribed } from "../components/SubscribeGate.jsx";
import { useGold, sortGoldFirst } from "../lib/goldTier.js";
import { useAuth } from "../lib/AuthContext.jsx";
import LiveDiscoveries from "../components/LiveDiscoveries.jsx";

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
  { key: "convergence", icon: "🌐", label: "צירי התכנסות" },
  { key: "crosses", icon: "✨", label: "חידושי הצלבות" },
  { key: "community", icon: "👥", label: "חידושי גולשים" },
  { key: "submit", icon: "✍️", label: "הגשת חידוש" },
  { key: "calc", icon: "🧮", label: "מחשבון גימטריה" },
  { key: "methods", icon: "📐", label: "שיטות הגימטריה" },
  { key: "verified", icon: "🔵", label: "פוסטים מאומתים", ai: true },
  { key: "sod1820", icon: "✦", label: "1820 · סוד הסודות" },
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
  const gold = useGold();
  useEffect(() => { if (initial) setVal(initial); }, [initial]);
  const anchors = sortGoldFirst(ANCHORS.includes(val) ? ANCHORS : [val, ...ANCHORS], n => gold.values.has(n));
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
        {anchors.map(n => {
          const isG = gold.values.has(n);
          return (
          <button key={n} onClick={() => setVal(n)} style={{ cursor: "pointer", fontFamily: F.mono, fontSize: 15, fontWeight: 800, padding: "7px 15px", borderRadius: 999, border: `${isG ? 2 : 1}px solid ${n === val || isG ? L.gold : L.line}`, background: n === val ? "#fbf3da" : isG ? "#fdf8e8" : L.panel, color: n === val || isG ? L.goldDeep : L.sub, boxShadow: isG ? `0 0 8px ${L.gold}55` : "none" }}>{isG ? "👑 " : ""}{n}</button>
        );})}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 26, fontWeight: 800 }}>{val}</span>
        {KEY_NUMBERS[val] && <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 16 }}>{KEY_NUMBERS[val]}</span>}
        {gold.values.has(val) && <span style={{ background: "#fbf3da", border: `1px solid ${L.gold}`, color: L.goldDeep, borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700 }}>{val === 1820 ? "★ קוד האתר" : "★ מספר זהב"}</span>}
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

const VGRID = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 };
function VerifiedCard({ p }) {
  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
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
  );
}
function VerifiedTab() {
  const [posts, setPosts] = useState(null);
  const { subscribed } = useSubscribed();
  useEffect(() => {
    let live = true;
    supabase.from("posts").select("wp_id,title,slug,image_url,ai_number").eq("verified", true).order("modified", { ascending: false, nullsFirst: false }).limit(60)
      .then(({ data }) => { if (live) setPosts(data || []); });
    return () => { live = false; };
  }, []);
  if (posts === null) return <div style={{ color: L.sub, padding: 20 }}>טוען…</div>;
  if (!posts.length) return <div style={{ color: L.sub, padding: 20 }}>עדיין אין פוסטים מאומתים.</div>;

  // פתיחה: לא-רשום רואה 4 פוסטים מאומתים; השאר מטושטשים מאחורי שער הרשמה (חינם).
  const FREE = 4;
  if (subscribed) return <div style={VGRID}>{posts.map(p => <VerifiedCard key={p.wp_id} p={p} />)}</div>;
  const locked = posts.slice(FREE);
  return (
    <div>
      <div style={VGRID}>{posts.slice(0, FREE).map(p => <VerifiedCard key={p.wp_id} p={p} />)}</div>
      {locked.length > 0 && (
        <div style={{ position: "relative", marginTop: 16 }}>
          <div style={{ filter: "blur(7px)", pointerEvents: "none", userSelect: "none", opacity: 0.5, maxHeight: 360, overflow: "hidden", ...VGRID }} aria-hidden>
            {locked.slice(0, 6).map(p => <VerifiedCard key={p.wp_id} p={p} />)}
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, rgba(244,241,232,0.25), rgba(244,241,232,0.96))" }}>
            <div style={{ textAlign: "center", maxWidth: 420, padding: 20 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🔒</div>
              <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 21, fontWeight: 700, marginBottom: 6 }}>עוד {locked.length} פוסטים מאומתים</div>
              <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, margin: "0 auto 14px", maxWidth: 360 }}>
                צפיתם ב-{FREE} פוסטים מאומתים 🎁 · להמשך צפייה בכל הפוסטים המאומתים — <b style={{ color: L.goldDeep }}>הרשמה חינם</b>.
              </p>
              <SubscribeGate source="verified-posts" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✨ חידושי הצלבות — חידושים בין-שיטתיים מאומתים, מסומנים בכוכב (featured_cross_insight_law)
function methodLines(p) {
  const out = [];
  if (p.value != null && p.method) out.push([p.method, p.value]);
  if (p.ragil != null) out.push(["רגיל", p.ragil]);
  if (p.mistater != null) out.push(["מסתתר", p.mistater]);
  if (p.miluy != null) out.push(["מילוי", p.miluy]);
  if (!out.length && p.value != null) out.push(["", p.value]);
  return out;
}
function CrossChip({ p }) {
  const lines = methodLines(p);
  const extra = p.ref || p.note || "";
  return (
    <Link to={`/beit-midrash?w=${encodeURIComponent(p.phrase)}`} title={`פתח את «${p.phrase}» במחשבון`}
      style={{ display: "flex", alignItems: "baseline", gap: 9, textDecoration: "none", background: L.soft, border: `1px solid ${L.line}`, borderRadius: 9, padding: "6px 11px" }}>
      <span style={{ flex: 1, minWidth: 0, color: L.ink, fontFamily: F.body, fontSize: 14 }}>
        {p.phrase}{extra && <span style={{ color: L.sub, fontSize: 11.5 }}> · {extra}</span>}
      </span>
      <span style={{ display: "flex", gap: 9, flexShrink: 0 }}>
        {lines.map(([m, v], i) => (
          <span key={i} style={{ color: L.goldDeep, fontFamily: F.mono, fontWeight: 800, fontSize: 13.5 }}>
            {m && <em style={{ fontFamily: F.heading, fontStyle: "normal", fontSize: 9.5, color: L.sub, marginInlineEnd: 3 }}>{m}</em>}{v}
          </span>
        ))}
      </span>
    </Link>
  );
}
function MirrorPanel({ gp }) {
  if (!gp) return null;
  if (gp.revealed || gp.hidden) {
    const col = (title, arr) => (
      <div style={{ background: "#fbfaf5", border: `1px solid ${L.line}`, borderRadius: 11, padding: "10px 11px" }}>
        <div style={{ color: L.goldDeep, fontFamily: F.heading, fontSize: 12, fontWeight: 800, marginBottom: 7 }}>{title}</div>
        <div style={{ display: "grid", gap: 6 }}>{(arr || []).map((p, i) => <CrossChip key={i} p={p} />)}</div>
      </div>
    );
    return (
      <div className="bm-mirror" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {col(`🔺 הנגלה · ${gp.revealed_method || "רגיל"}`, gp.revealed)}
        {col(`🔻 הנסתר · ${gp.hidden_method || "מסתתר"}`, gp.hidden)}
      </div>
    );
  }
  const list = gp.pairs || gp.members || [];
  if (list.length) return <div style={{ display: "grid", gap: 6 }}>{list.map((p, i) => <CrossChip key={i} p={p} />)}</div>;
  return null;
}
function CrossCard({ item }) {
  const [open, setOpen] = useState(false);
  const gp = item.gematria_pairs || {};
  const star = item.panel_data?.star;
  const starSize = star === "big" ? 27 : star === "mid" ? 21 : 16;
  const author = item.panel_data?.author;
  const nums = item.related_numbers || [];
  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderInlineStart: `3px solid ${L.gold}`, borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 9 }}>
        <span aria-hidden style={{ fontSize: starSize, lineHeight: 1, filter: "drop-shadow(0 0 6px rgba(233,200,74,0.55))" }}>⭐</span>
        <span style={{ flex: 1, minWidth: 0, color: L.ink, fontFamily: F.regal, fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{item.title}</span>
        {author && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fbf3da", border: `1px solid ${L.gold}`, color: L.goldDeep, borderRadius: 999, padding: "2px 9px", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>✍️ מאת {author}</span>
        )}
        {item.verified && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: L.blueBg, border: `1px solid ${L.blueLine}`, color: L.blue, borderRadius: 999, padding: "2px 9px", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>✓ מאומת מנוע</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 11 }}>
        {nums.slice(0, 5).map(n => (
          <Link key={n} to={`/number/${n}`} style={{ textDecoration: "none", fontFamily: F.mono, fontWeight: 800, fontSize: 13, padding: "2px 10px", borderRadius: 999, border: `1px solid ${L.gold}`, background: "#fbf3da", color: L.goldDeep }}>{n}</Link>
        ))}
        {(item.method_tags || []).map(m => (
          <span key={m} style={{ fontFamily: F.heading, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, border: `1px solid ${L.line}`, color: L.sub }}>{m}</span>
        ))}
      </div>
      <MirrorPanel gp={gp} />
      {open && item.body && (
        <p style={{ color: "#3a342a", fontFamily: F.body, fontSize: 14.5, lineHeight: 1.95, margin: "13px 0 0", whiteSpace: "pre-wrap" }}>{item.body}</p>
      )}
      <button onClick={() => setOpen(o => !o)} style={{ cursor: "pointer", background: "none", border: "none", color: L.goldDeep, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "10px 0 0" }}>
        {open ? "▴ הסתר את ההסבר" : "▾ קרא את ההסבר המלא"}
      </button>
    </div>
  );
}
function CrossesTab() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let live = true;
    supabase.from("insights")
      .select("id,title,body,related_numbers,method_tags,convergence_score,panel_data,gematria_pairs,verified")
      .eq("category", "הצלבות").eq("is_active", true)
      .order("convergence_score", { ascending: false }).limit(60)
      .then(({ data }) => { if (live) setItems(data || []); }).catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, []);
  if (items === null) return <div style={{ color: L.sub, padding: 20 }}>טוען…</div>;
  if (!items.length) return <div style={{ color: L.sub, padding: 20 }}>עדיין אין חידושי הצלבות.</div>;
  const gi = dayOfYear() % items.length;
  const gate = items[gi];
  const rest = items.filter((_, i) => i !== gi);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, margin: "0 0 2px", maxWidth: 660 }}>
        הצלבות בין שיטות חישוב — כל ערך אומת במנוע הרשמי. לחיצה על ביטוי פותחת אותו במחשבון; לחיצה על מספר פותחת את דף המספר.
      </p>
      {gate && (
        <div style={{ border: `1px solid ${L.gold}`, borderRadius: 16, padding: 3, background: "linear-gradient(135deg, #fbf3da, #ffffff)", boxShadow: `0 0 18px ${L.gold}33` }}>
          <div style={{ color: L.goldDeep, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, letterSpacing: 1, padding: "7px 12px 3px", display: "flex", alignItems: "center", gap: 6 }}>
            🚪 שער היום <span style={{ color: L.sub, fontWeight: 600, fontSize: 11 }}>· מתחלף מדי יום</span>
          </div>
          <CrossCard item={gate} />
        </div>
      )}
      {rest.map(it => <CrossCard key={it.id} item={it} />)}
    </div>
  );
}

// 👥 חידושי גולשים — חידושים מהקהילה (תג "חידושי גולשים"), מוצגים עם שם הכותב
function CommunityTab() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let live = true;
    supabase.from("insights")
      .select("id,title,body,related_numbers,method_tags,convergence_score,panel_data,gematria_pairs,verified")
      .contains("tags", ["חידושי גולשים"]).eq("is_active", true)
      .order("convergence_score", { ascending: false }).order("created_at", { ascending: false }).limit(60)
      .then(({ data }) => { if (live) setItems(data || []); }).catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, []);
  if (items === null) return <div style={{ color: L.sub, padding: 20 }}>טוען…</div>;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: "linear-gradient(135deg, #fffdf6, #fbf3da)", border: `1px solid ${L.gold}`, borderRadius: 12, padding: "13px 16px" }}>
        <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 3 }}>👥 חידושי גולשים</div>
        <p style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
          חידושים ששלחו חוקרים מהקהילה — נבדקו ואומתו במנוע הרשמי. רוצים לשתף חידוש משלכם? <Link to="/beit-midrash?tab=submit" style={{ color: L.goldDeep, fontWeight: 700 }}>שלחו חידוש →</Link>
        </p>
      </div>
      {!items.length
        ? <div style={{ color: L.sub, padding: 20 }}>עדיין אין חידושי גולשים — היו הראשונים לשתף.</div>
        : items.map(it => <CrossCard key={it.id} item={it} />)}
    </div>
  );
}

// ✍️ הגשת חידוש — טופס לגולשים רשומים, עם אימות גימטריה חי במנוע + מצא ביטוי שווה + תצוגה מקדימה. נשמר כ-pending.
const METHOD_COL = { "רגיל": "ragil", "מסתתר": "misratar", "מילוי": "miluy", "קדמי": "kadmi", "גדול": "gadol", "סידורי": "siduri", "אתבש": "atbash", "אלבם": "albam" };
function SubmitTab() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [method, setMethod] = useState("רגיל");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [st, setSt] = useState("idle");
  const [err, setErr] = useState("");
  const [sugg, setSugg] = useState(null);   // הצעות ביטוי שווה
  const [showPrev, setShowPrev] = useState(false);

  useEffect(() => { if (user?.email && !email) setEmail(user.email); }, [user]); // eslint-disable-line

  const m = METHODS.find(x => x.key === method) || METHODS[0];
  const vA = a.trim() ? m.fn(a) : 0;
  const vB = b.trim() ? m.fn(b) : 0;
  const equal = vA > 0 && vA === vB;

  const inp = { background: L.soft, border: `1px solid ${L.line}`, borderRadius: 10, color: L.ink, fontFamily: F.body, fontSize: 15, padding: "10px 12px", outline: "none", width: "100%", boxSizing: "border-box" };
  const lbl = { color: L.goldDeep, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginBottom: 5 };

  async function findEqual() {
    const col = METHOD_COL[method];
    if (!col || !vA) { setSugg([]); return; }
    try {
      const { data } = await supabase.from("gematria_words").select("phrase").eq(col, vA).neq("phrase", a.trim()).limit(10);
      setSugg([...new Set((data || []).map(d => d.phrase).filter(Boolean))]);
    } catch { setSugg([]); }
  }

  async function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!title.trim() || !a.trim() || !b.trim()) { setErr("מלאו רעיון ושני ביטויים"); return; }
    if (!equal) { setErr("הגימטריות לא שוות — בדקו שהביטויים נופלים על אותו מספר בשיטה שבחרתם"); return; }
    if (!name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("מלאו שם ומייל תקין"); return; }
    setSt("sending"); setErr("");
    try {
      const { error } = await supabase.from("chiddush_submissions").insert({
        title: title.trim(), body: body.trim() || null, method,
        phrase_a: a.trim(), value_a: vA, phrase_b: b.trim(), value_b: vB,
        gematria_pairs: [{ phrase: a.trim(), value: vA }, { phrase: b.trim(), value: vB }],
        author_name: name.trim(), author_email: email.trim(),
      });
      if (error) throw error;
      setSt("done");
    } catch { setSt("error"); setErr("אירעה שגיאה — נסו שוב בעוד רגע"); }
  }

  // 🔒 הרשמה לפני שליחה
  if (!user) return (
    <div style={{ textAlign: "center", padding: "36px 22px", background: L.panel, border: `1px solid ${L.gold}`, borderRadius: 16, maxWidth: 540 }}>
      <div style={{ fontSize: 42, marginBottom: 8 }}>✍️</div>
      <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 21, fontWeight: 700, marginBottom: 8 }}>כדי לשלוח חידוש — הצטרפו תחילה</div>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 400, margin: "0 auto 16px" }}>
        השליחה פתוחה לחוקרים רשומים (אימות מייל פשוט) — כך נשמור על שמכם לצד החידוש ונמנע ספאם.
      </p>
      <Link to="/login" style={{ display: "inline-block", background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00", fontFamily: F.heading, fontWeight: 800, fontSize: 15, padding: "11px 26px", borderRadius: 999, textDecoration: "none" }}>הירשמו / התחברו ←</Link>
    </div>
  );

  if (st === "done") return (
    <div style={{ textAlign: "center", padding: "40px 20px", background: L.panel, border: `1px solid ${L.gold}`, borderRadius: 16, maxWidth: 560 }}>
      <div style={{ fontSize: 46, marginBottom: 8 }}>✨</div>
      <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>תודה! החידוש נשלח לבדיקה</div>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, maxWidth: 420, margin: "0 auto" }}>
        הגימטריה תיבדק שוב במנוע הרשמי, ואם תאושר — החידוש יתפרסם במדור «חידושי גולשים» <b style={{ color: L.goldDeep }}>עם שמכם</b>.
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, margin: 0, maxWidth: 580 }}>
        מצאתם הצלבת גימטריה? שתפו אותה. הזינו שני ביטויים שנופלים על אותו מספר — המנוע יאמת בזמן אמת. לאחר אישור צוריאל, החידוש יתפרסם עם שמכם.
      </p>

      <div><div style={lbl}>💡 הרעיון / הכותרת</div>
        <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="למשל: היד של הבורא" /></div>

      <div><div style={lbl}>📐 שיטת חישוב</div>
        <select style={{ ...inp, cursor: "pointer" }} value={method} onChange={e => setMethod(e.target.value)}>
          {METHODS.map(x => <option key={x.key} value={x.key}>{x.key} — {x.sub}</option>)}
        </select></div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={lbl}>✡ הגימטריה — שני ביטויים שווים</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input style={{ ...inp, flex: 1, minWidth: 140 }} value={a} onChange={e => setA(e.target.value)} placeholder="ביטוי ראשון" dir="rtl" />
          <span style={{ fontFamily: F.mono, fontWeight: 800, color: L.goldDeep, fontSize: 18, minWidth: 56, textAlign: "center" }}>{vA || "—"}</span>
        </div>
        <div style={{ textAlign: "center", color: L.goldDeep, fontFamily: F.mono, fontWeight: 800 }}>=</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input style={{ ...inp, flex: 1, minWidth: 140 }} value={b} onChange={e => setB(e.target.value)} placeholder="ביטוי שני (שווה ערך)" dir="rtl" />
          <span style={{ fontFamily: F.mono, fontWeight: 800, color: L.goldDeep, fontSize: 18, minWidth: 56, textAlign: "center" }}>{vB || "—"}</span>
        </div>
        {(vA > 0 && vB > 0) && (
          <div style={{ textAlign: "center", borderRadius: 10, padding: "8px 12px", fontFamily: F.heading, fontWeight: 800, fontSize: 14,
            background: equal ? "#e7f7e9" : "#fdecec", color: equal ? "#1f7a35" : "#b03030", border: `1px solid ${equal ? "#9bd6a6" : "#e3a0a0"}` }}>
            {equal ? `✓ מאומת! «${a.trim()}» = «${b.trim()}» = ${vA} (${method})` : `✗ לא שווה — ${vA} מול ${vB}`}
          </div>
        )}
        {vA > 0 && METHOD_COL[method] && (
          <div>
            <button type="button" onClick={findEqual} style={{ cursor: "pointer", background: L.soft, border: `1px solid ${L.gold}`, color: L.goldDeep, borderRadius: 999, fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, padding: "6px 14px" }}>🔍 מצא ביטוי שווה ל-{vA}</button>
            {sugg && (sugg.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {sugg.map((p, i) => (
                  <button key={i} type="button" onClick={() => { setB(p); setSugg(null); }} style={{ cursor: "pointer", background: "#fbf3da", border: `1px solid ${L.line}`, color: L.ink, borderRadius: 999, fontFamily: F.body, fontSize: 13, padding: "5px 11px" }}>{p}</button>
                ))}
              </div>
            ) : <div style={{ color: L.sub, fontSize: 12.5, marginTop: 6 }}>לא נמצאו ביטויים שווים במאגר לערך {vA} ({method}).</div>)}
          </div>
        )}
      </div>

      <div><div style={lbl}>📜 ההסבר (אופציונלי)</div>
        <textarea style={{ ...inp, minHeight: 90, resize: "vertical", fontFamily: F.body, lineHeight: 1.7 }} value={body} onChange={e => setBody(e.target.value)} placeholder="מה הרמז? מה זה מלמד?" /></div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}><div style={lbl}>✍️ השם שלכם</div>
          <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="ייכתב כ«מאת …»" /></div>
        <div style={{ flex: 1, minWidth: 160 }}><div style={lbl}>📧 מייל</div>
          <input style={inp} dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" /></div>
      </div>

      {equal && (
        <div>
          <button type="button" onClick={() => setShowPrev(v => !v)} style={{ cursor: "pointer", background: "none", border: "none", color: L.goldDeep, fontFamily: F.heading, fontWeight: 700, fontSize: 13, padding: 0 }}>
            {showPrev ? "▴ הסתר תצוגה מקדימה" : "👁 תצוגה מקדימה — איך החידוש ייראה"}
          </button>
          {showPrev && (
            <div style={{ marginTop: 10 }}>
              <CrossCard item={{
                id: "preview", title: title || "(כותרת החידוש)", body, related_numbers: [vA], method_tags: [method], verified: true,
                panel_data: { author: name || "…", star: "big", type: "shared_value" },
                gematria_pairs: { number: vA, type: "shared_value", members: [{ phrase: a.trim(), method, value: vA }, { phrase: b.trim(), method, value: vB }] },
              }} />
            </div>
          )}
        </div>
      )}
      {err && <div style={{ color: "#b03030", fontFamily: F.body, fontSize: 13.5 }}>{err}</div>}
      <button type="submit" disabled={st === "sending"} style={{ cursor: st === "sending" ? "wait" : "pointer", justifySelf: "start",
        background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00", border: "none", borderRadius: 999,
        fontFamily: F.heading, fontWeight: 800, fontSize: 15.5, padding: "12px 30px", boxShadow: "0 4px 16px rgba(154,120,24,0.3)" }}>
        {st === "sending" ? "שולח…" : "✦ שלחו את החידוש לבדיקה"}
      </button>
    </form>
  );
}

// ✦ 1820 — המקום הקבוע: סוד השם / סוד הסודות + לימוד
// 🎬 עטיפת חשיפה-בגלילה — fade-up כשהאלמנט נכנס למסך (לתחושת "סיפור נגלל")
function Reveal({ children, style, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ ...style, opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(26px)", transition: `opacity .8s ease ${delay}ms, transform .8s cubic-bezier(.2,.8,.2,1) ${delay}ms` }}>
      {children}
    </div>
  );
}

const actLabel = { color: L.gold, fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 };
const actTitle = { color: L.ink, fontFamily: F.regal, fontSize: "clamp(22px,4vw,30px)", fontWeight: 700, lineHeight: 1.4, margin: "0 0 14px" };
const actBody = { color: "#3a342a", fontFamily: F.body, fontSize: 16.5, lineHeight: 2, margin: 0, maxWidth: 640 };

// 📜 מסע 1820 — סיפור נגלל חי. כל המידע נקרא מהגרף (חתימות · מד התכנסות · כרטיסים · תמונות).
function Sod1820Tab() {
  const [sigs, setSigs] = useState([]);
  const [meter, setMeter] = useState(null);
  const [cards, setCards] = useState([]);
  const [imgs, setImgs] = useState([]);
  const [phrases, setPhrases] = useState([]);
  const gold = useGold();

  useEffect(() => {
    let live = true;
    // שתי חתימות הזהב — שתי הדרכים ששם ה' = 1820
    supabase.from("nodes").select("label,description,metadata")
      .eq("type", "entity").eq("is_active", true)
      .eq("metadata->>role", "signature").eq("metadata->>value", "1820")
      .then(({ data }) => { if (live) setSigs((data || []).map(r => ({ label: r.label, desc: r.description, title: r.metadata?.signature_title || "✦ חתימה" }))); });
    // מד ההתכנסות החי
    supabase.rpc("convergence_meter", { p_n: 1820 }).then(({ data }) => { if (live) setMeter(data); }).catch(() => {});
    // כרטיסי ההתכנסות + התמונות המאוצרות שלהם
    getTopicCards({ approvedOnly: true }).then(async all => {
      if (!live) return;
      const mine = (all || []).filter(c => (c.numbers || []).includes(1820));
      setCards(mine);
      const ids = [...new Set(mine.flatMap(c => c.image_ids || []))].slice(0, 10);
      if (ids.length) { try { const im = await getGalleryImagesByIds(ids); if (live) setImgs(im || []); } catch { /* ignore */ } }
    }).catch(() => {});
    // ביטויים ששווים 1820 (רגיל)
    supabase.from("gematria_words").select("phrase").eq("ragil", 1820).limit(80)
      .then(({ data }) => { if (live) setPhrases([...new Set((data || []).map(r => r.phrase).filter(Boolean))]); });
    return () => { live = false; };
  }, []);

  const score = meter?.score ?? null;
  const okLayers = (meter?.layers || []).filter(l => l.ok).map(l => l.name);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* ─── מערכה 1 · המספר ─── */}
      <Reveal style={{ textAlign: "center", padding: "10px 0 8px" }}>
        <div style={actLabel}>סוד הסודות</div>
        <div style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: "clamp(72px,17vw,140px)", fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>1820</div>
        <p style={{ ...actBody, margin: "16px auto 0", fontSize: 18, fontStyle: "italic", color: L.sub }}>
          יש מספרים שמספרים סיפור.<br />ויש מספר אחד — שהוא הסיפור עצמו.
        </p>
      </Reveal>

      <Reveal style={{ textAlign: "center", margin: "30px auto 48px", maxWidth: 600 }} delay={120}>
        <p style={{ ...actBody, margin: "0 auto", textAlign: "center", fontSize: 19 }}>
          <b style={{ color: L.goldDeep }}>שם הוי״ה (יהוה) מופיע בתורה כולה — בדיוק 1820 פעם.</b>
        </p>
      </Reveal>

      {/* ─── מערכה 2 · שתי החתימות ─── */}
      {sigs.length > 0 && (
        <section style={{ marginBottom: 52 }}>
          <Reveal>
            <div style={actLabel}>מערכה ראשונה · החתימות</div>
            <h3 style={actTitle}>ולא במקרה אחד — אלא בשתי חתימות</h3>
            <p style={{ ...actBody, marginBottom: 20 }}>
              שני ביטויים בלתי-תלויים, כל אחד מהם עולה בדיוק 1820. כאילו השם חתם את עצמו פעמיים.
            </p>
          </Reveal>
          <div style={{ display: "grid", gap: 14 }}>
            {sigs.map((s, i) => (
              <Reveal key={s.label} delay={i * 120}>
                <div style={{ background: "linear-gradient(135deg, #fffdf5, #fbf3da)", border: `1.5px solid ${L.gold}`, borderRadius: 16, padding: "18px 22px", textAlign: "center", boxShadow: "0 2px 10px rgba(154,120,24,0.12)" }}>
                  <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginBottom: 8 }}>{s.title}</div>
                  <div style={{ color: L.ink, fontFamily: F.regal, fontSize: "clamp(18px,3vw,24px)", fontWeight: 700, lineHeight: 1.5 }}>{s.label}</div>
                  {s.desc && <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, marginTop: 8 }}>{stripHtml(s.desc)}</div>}
                  <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${L.gold}`, borderRadius: 999, padding: "5px 16px" }}>
                    <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 14, fontWeight: 700 }}>{s.label}</span>
                    <span style={{ color: L.sub, fontFamily: F.mono, fontSize: 16 }}>=</span>
                    <span style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 18, fontWeight: 800 }}>1820</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ─── מערכה 3 · ההתכנסות הגדולה ─── */}
      {score != null && (
        <section style={{ marginBottom: 52 }}>
          <Reveal style={{ textAlign: "center", background: L.ink, borderRadius: 20, padding: "34px 24px" }}>
            <div style={{ ...actLabel, color: "#d9b94f" }}>מערכה שנייה · ההתכנסות</div>
            <div style={{ color: "#f3e6bd", fontFamily: F.regal, fontSize: 20, fontWeight: 700, marginBottom: 18 }}>מספר אחד — שכל העולמות מצביעים עליו</div>
            <div style={{ color: "#f6e27a", fontFamily: F.mono, fontSize: "clamp(56px,12vw,96px)", fontWeight: 800, lineHeight: 1 }}>
              {score}<span style={{ fontSize: "0.4em", color: "#c9b98a" }}>/100</span>
            </div>
            <div style={{ color: "#c9b98a", fontFamily: F.heading, fontSize: 12, letterSpacing: 2, marginTop: 6 }}>מד ההתכנסות החי</div>
            {okLayers.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 20 }}>
                {okLayers.map(n => (
                  <span key={n} style={{ color: "#f3e6bd", fontFamily: F.body, fontSize: 12.5, background: "rgba(246,226,122,0.12)", border: "1px solid rgba(246,226,122,0.3)", borderRadius: 999, padding: "4px 12px" }}>✓ {n}</span>
                ))}
              </div>
            )}
            <p style={{ color: "#cfc6b0", fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "20px auto 0", maxWidth: 520 }}>
              שכבות בלתי-תלויות — תורה, קבלה, גאולה, גלריות, אירועים — מתכנסות כולן על אותו מספר. זו לא יד המקרה.
            </p>
          </Reveal>
        </section>
      )}

      {/* ─── מערכה 4 · מהספר אל המציאות (כרטיסים + תמונות) ─── */}
      {cards.length > 0 && (
        <section style={{ marginBottom: 52 }}>
          <Reveal>
            <div style={actLabel}>מערכה שלישית · מהספר אל המציאות</div>
            <h3 style={actTitle}>וזה לא נשאר בין דפי הספר</h3>
            <p style={{ ...actBody, marginBottom: 18 }}>
              1820 פרץ אל ההיסטוריה — באירועים, באסונות ובציר הגאולה. כל כרטיס הוא התכנסות שלמה בפני עצמה.
            </p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
            {cards.map((c, i) => (
              <Reveal key={c.id} delay={i * 90}>
                <Link to={`/topic/${encodeURIComponent(c.slug)}`} style={{ display: "block", textDecoration: "none", background: L.panel, border: `1px solid ${L.gold}`, borderRadius: 14, padding: "16px 18px", height: "100%" }}>
                  <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{c.title}</div>
                  {c.subtitle && <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>{stripHtml(c.subtitle).slice(0, 110)}</div>}
                  <div style={{ color: L.goldDeep, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginTop: 10 }}>פתחו את ההתכנסות ←</div>
                </Link>
              </Reveal>
            ))}
          </div>
          {imgs.length > 0 && (
            <Reveal style={{ marginTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(78px,1fr))", gap: 7 }}>
                {imgs.map(im => (
                  <a key={im.id} href={im.image_url} target="_blank" rel="noopener noreferrer" title={(im.ocr_numbers || []).join(" · ")}
                    style={{ display: "block", aspectRatio: "1", borderRadius: 9, overflow: "hidden", border: `1px solid ${L.line}`, background: `center/cover no-repeat url(${im.image_url})` }} />
                ))}
              </div>
            </Reveal>
          )}
        </section>
      )}

      {/* ─── מערכה 5 · הביטויים השווים + שערים ─── */}
      <section style={{ marginBottom: 24 }}>
        <Reveal>
          <div style={actLabel}>מערכה אחרונה · המשפחה</div>
          <h3 style={actTitle}>וכל הביטויים שחולקים את אותו ערך</h3>
        </Reveal>
        {phrases.length > 0 && (
          <Reveal style={{ marginTop: 4 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {sortGoldFirst(phrases.map(p => ({ phrase: p })), p => gold.labels.has(p.phrase)).slice(0, 50).map((p, i) => {
                const isG = gold.labels.has(p.phrase);
                return (
                  <Link key={i} to={`/number/${encodeURIComponent(p.phrase)}`} style={{
                    textDecoration: "none", color: isG ? L.goldDeep : L.ink, fontFamily: F.body, fontSize: 13.5,
                    background: isG ? "#fbf3da" : L.soft, border: `1px solid ${isG ? L.gold : L.line}`, borderRadius: 999,
                    padding: "5px 12px", fontWeight: isG ? 700 : 400,
                  }}>{isG ? "✦ " : ""}{p.phrase}</Link>
                );
              })}
            </div>
          </Reveal>
        )}
        <Reveal style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 30 }}>
          <Link to="/number/1820" style={{ textDecoration: "none", background: `linear-gradient(135deg, ${L.gold}, #c79a2a)`, color: "#fff", fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "12px 24px", borderRadius: 999 }}>🧬 לדף המלא של 1820 →</Link>
          <Link to="/topic/1820" style={{ textDecoration: "none", background: L.panel, color: L.goldDeep, border: `1px solid ${L.gold}`, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700, padding: "12px 22px", borderRadius: 999 }}>⟡ עמוד ההתכנסות →</Link>
          <Link to="/שם-ה-בתורה-1820-פעם" style={{ textDecoration: "none", background: L.panel, color: L.goldDeep, border: `1px solid ${L.gold}`, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700, padding: "12px 22px", borderRadius: 999 }}>★ פוסט היסוד →</Link>
        </Reveal>
      </section>
    </div>
  );
}

// פאנל תוצאות למספר נבחר — מילים שוות (מהמאגר) + מילים מהקהילה (community_words).
function NumberResults({ value }) {
  const [eq, setEq] = useState(null);
  const [comm, setComm] = useState(null);
  const [pulse, setPulse] = useState(null);
  useEffect(() => {
    let live = true; setEq(null); setComm(null); setPulse(null);
    supabase.from("gematria_words").select("phrase").eq("ragil", value).limit(60)
      .then(({ data }) => { if (live) setEq([...new Set((data || []).map(r => r.phrase).filter(Boolean))]); });
    supabase.from("community_words").select("phrase,author").eq("value", value).order("created_at", { ascending: false }).limit(40)
      .then(({ data }) => { if (live) setComm(data || []); });
    getEntityBundle({ term: String(value), value, isNumber: true })
      .then(b => { if (live && b) setPulse(pulseFromCounts({ posts: b.postsCount, galleries: b.galleriesCount, words: b.phrases?.length, events: b.eventsCount, ai: b.insightsCount, comm: b.commentsCount })); })
      .catch(() => {});
    return () => { live = false; };
  }, [value]);
  const chip = { textDecoration: "none", color: L.ink, fontFamily: F.body, fontSize: 13.5, background: L.soft, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 12px" };
  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        {pulse != null && <PulseRing value={pulse} size={62} core={!!KEY_NUMBERS[value]} label={false} />}
        <span style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 28, fontWeight: 800 }}>{value}</span>
        {KEY_NUMBERS[value] && <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 16 }}>{KEY_NUMBERS[value]}</span>}
        <Link to={`/number/${value}`} style={{ marginInlineStart: "auto", color: L.goldDeep, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>הדף המלא →</Link>
      </div>

      <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>מילים שוות</div>
      {eq === null ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>מחשב…</div> :
        eq.length === 0 ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>אין מילים בערך זה במאגר.</div> :
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{eq.map((p, i) => <Link key={i} to={`/number/${encodeURIComponent(p)}`} style={chip}>{p}</Link>)}</div>}

      <div style={{ color: L.blue, fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 1, margin: "16px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
        💬 מילים מהקהילה
      </div>
      {comm === null ? <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13 }}>טוען…</div> :
        comm.length === 0 ? (
          <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13, lineHeight: 1.7 }}>
            עדיין אין מילים מהקהילה לערך הזה. <span style={{ color: L.blue }}>היו הראשונים להוסיף — בקרוב.</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {comm.map((c, i) => (
              <span key={i} title={c.author ? `מאת ${c.author}` : ""} style={{ ...chip, background: L.blueBg, borderColor: L.blueLine, color: L.blue }}>{c.phrase}</span>
            ))}
          </div>
        )}
    </div>
  );
}

// טאב המחשבון — מחשבון בהיר + רשימת מספרים דקה משמאלו (לחיצה מציגה מילים שוות + קהילה).
const NUM_LIST = [1820, 1237, 776, 1202, 541, 358, 474, 424, 318, 888, 666, 2701, 86, 72, 45, 26, 14];
const CORE = new Set([1820, 358, 1237, 26, 541, 776]); // מספרי ליבה — פנינים גדולות יותר
// ✨ כלים עתידיים — "בקרוב" (תצוגה בלבד)
const SOON_TOOLS = [
  { icon: "🤖", title: "חישוב כל השיטות עם AI", desc: "ניתוח חכם שמחבר את כל השיטות יחד למסר אחד — חדשני בעולם." },
  { icon: "📷", title: "חילוץ מספרים מתמונה", desc: "מעלים תמונה — והמערכת מזהה ומחשבת את המספרים שבה." },
  { icon: "🔍", title: "חיפוש במאגר", desc: "חיפוש חופשי בכל הביטויים, המספרים והישויות." },
];
function ComingSoonTools() {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>✨ כלים חדשים · בקרוב</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
        {SOON_TOOLS.map(t => (
          <div key={t.title} style={{ position: "relative", background: L.soft, border: `1px dashed ${L.line}`, borderRadius: 12, padding: "13px 14px" }}>
            <span style={{ position: "absolute", top: 10, insetInlineStart: 10, background: "#fbf3da", border: `1px solid ${L.gold}`, color: L.goldDeep, borderRadius: 999, padding: "1px 8px", fontFamily: F.heading, fontSize: 10, fontWeight: 700 }}>בקרוב</span>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
            <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700, marginBottom: 4 }}>{t.title}</div>
            <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6 }}>{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalcTab({ initial, seed }) {
  const [num, setNum] = useState(initial || 1820);
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }} className="bm-calc">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.8, margin: "0 0 16px" }}>
          מחשבון גימטריה מתקדם — כל 8 השיטות, מילים שוות, ופירוט אות-אות. חישוב טהור, ללא AI.
        </p>
        <GematriaCalculator seed={seed} />
        <ComingSoonTools />
        <div style={{ marginTop: 22 }}><NumberResults value={num} /></div>
      </div>
      <aside className="bm-numlist" style={{ width: 96, flex: "0 0 auto", position: "sticky", top: 20 }}>
        <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, fontWeight: 700, textAlign: "center", marginBottom: 12 }}>✦ ציר המספרים</div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxHeight: "72vh", overflowY: "auto", padding: "4px 0" }}>
          {/* קו הציר */}
          <span className="axis-line" aria-hidden style={{ position: "absolute", top: 8, bottom: 8, insetInlineStart: "50%", width: 2, transform: "translateX(-50%)", background: `linear-gradient(${L.line}, ${L.gold}, ${L.line})`, borderRadius: 2 }} />
          {NUM_LIST.map((n, i) => {
            const on = n === num;
            const core = CORE.has(n);
            const base = core ? 50 : 42;
            const size = on ? base + 6 : base;
            return (
              <div key={n} style={{ position: "relative", display: "flex", justifyContent: "center", width: "100%" }}>
                {on && KEY_NUMBERS[n] && (
                  <span style={{
                    position: "absolute", insetInlineEnd: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)",
                    whiteSpace: "nowrap", background: L.panel, border: `1px solid ${L.gold}`, color: L.goldDeep,
                    borderRadius: 8, padding: "4px 10px", fontFamily: F.body, fontSize: 12, fontWeight: 700,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.12)", zIndex: 4, pointerEvents: "none",
                  }} className="axis-label">{KEY_NUMBERS[n]}</span>
                )}
                <button onClick={() => setNum(n)} title={KEY_NUMBERS[n] || ""} style={{
                  position: "relative", zIndex: 1, cursor: "pointer", width: size, height: size, borderRadius: "50%",
                  fontFamily: F.mono, fontSize: on ? 14 : (core ? 13 : 11.5), fontWeight: 800, flex: "0 0 auto",
                  border: `2px solid ${L.gold}`, background: on ? L.gold : L.panel, color: on ? "#fff" : L.goldDeep,
                  boxShadow: on ? "0 0 0 4px #fbf3da, 0 2px 8px rgba(154,120,24,0.4)" : "0 1px 3px rgba(0,0,0,0.1)",
                  transition: "width .2s, height .2s, background .2s, color .2s",
                  animation: on ? "axisPulse 1.9s ease-in-out infinite" : "axisBeadIn .45s ease both",
                  animationDelay: on ? "0s" : `${i * 45}ms`,
                }}>{n}</button>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

// 📐 ספריית שיטות הגימטריה — הסבר + דוגמה חיה לכל אחת מ-8 השיטות.
const METHOD_INFO = {
  "רגיל": { what: "השיטה הבסיסית של הגימטריה — היסוד של כולן.", how: "כל אות מקבלת את ערכה המספרי (א=1, ב=2 … י=10, כ=20 … ת=400), וסוכמים." },
  "מילוי": { what: "ערך שֵם האות המלא — הרובד הפנימי, ה'נשמה' של האות.", how: "כותבים כל אות במילואה (א→אָלֶף, ה→הֵי) ומחשבים את גימטריית השם המלא. למשל א = אלף = 111." },
  "מסתתר": { what: "השיטה הייחודית של סוד 1820 — מה שמסתתר בֵּין האותיות.", how: "סוכמים את ההפרש (בערך מוחלט) בין כל שתי אותיות סמוכות.", insight: "💎 חכמה → |8−20|+|20−40|+|40−5| = 12+20+35 = 67 = בִּינָה. החכמה יוצאת מן הבינה.", star: true },
  "קדמי": { what: "ערך מצטבר ('משולש') — בנייה שכבה על שכבה.", how: "כל אות = סכום כל האותיות שלפניה ועד אליה (א=1, ב=1+2=3, ג=1+2+3=6 …), וסוכמים." },
  "גדול": { what: "כמו רגיל — אך עם ערכי האותיות הסופיות.", how: "האותיות הסופיות מקבלות ערך גבוה: ך=500, ם=600, ן=700, ף=800, ץ=900. השאר כמו רגיל." },
  "סידורי": { what: "ערך לפי הסדר באלף-בית — ה'מספר הפשוט'.", how: "כל אות לפי מיקומה: א=1, ב=2 … י=10, כ=11, ל=12 … ת=22." },
  "אתבש": { what: "צופן הראי של האלף-בית — קדום ומופיע בתנ״ך.", how: "מחליפים כל אות בבת-זוגה מהקצה הנגדי: א↔ת, ב↔ש, ג↔ר … וסוכמים את ערכי האותיות המוחלפות.", insight: "בתנ״ך: «שֵׁשַׁךְ» באתבש = «בָּבֶל»." },
  "אלבם": { what: "צופן חצי-אלפבית — מחילופי הצפנים הקדומים.", how: "מחלקים את הא״ב לשניים (11+11) ומחליפים אות מול אות: א↔ל, ב↔מ, ג↔נ … וסוכמים." },
};
const SAMPLE = "חכמה";
function methodExample(m) {
  const Lt = onlyHeb(SAMPLE);
  if (m.key === "מסתתר") {
    return Lt.slice(0, -1).map((c, i) => `|${c}−${Lt[i + 1]}|`).join(" + ") + " = " + Lt.slice(0, -1).map((c, i) => Math.abs(GEM[c] - GEM[Lt[i + 1]])).join(" + ") + " = " + m.fn(SAMPLE);
  }
  const map = m.map || GEM;
  return Lt.map(c => `${c}(${map[c]})`).join(" + ") + " = " + m.fn(SAMPLE);
}
// מונה קטן לאנימציית הסכום
function Odo({ to, run }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, t0; setV(0);
    const step = t => { t0 ??= t; const p = Math.min(1, (t - t0) / 900); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <>{v}</>;
}
// "סרטון" קל — האותיות נחשפות אחת-אחת עם ערכן, ואז הסכום מתגלגל. ריצה חוזרת בריחוף.
function MethodAnim({ m }) {
  const [run, setRun] = useState(0);
  const Lt = onlyHeb(SAMPLE);
  const items = m.key === "מסתתר"
    ? Lt.slice(0, -1).map((c, i) => ({ top: `${c}–${Lt[i + 1]}`, val: Math.abs(GEM[c] - GEM[Lt[i + 1]]) }))
    : Lt.map(c => ({ top: c, val: (m.map || GEM)[c] }));
  const delay = i => `${i * 0.32}s`;
  return (
    <div onMouseEnter={() => setRun(r => r + 1)} title="ריחוף = הרצה חוזרת" style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", direction: "rtl", cursor: "default" }}>
      {items.map((it, i) => (
        <span key={`${run}-${i}`} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", background: L.panel, border: `1px solid ${L.line}`, borderRadius: 8, padding: "3px 8px", opacity: 0, animation: "maIn .4s ease forwards", animationDelay: delay(i) }}>
          <b style={{ color: L.goldDeep, fontFamily: F.regal, fontSize: 15, lineHeight: 1.1 }}>{it.top}</b>
          <small style={{ color: L.sub, fontFamily: F.mono, fontSize: 11 }}>{it.val}</small>
        </span>
      ))}
      <span key={`eq-${run}`} style={{ color: L.sub, fontFamily: F.mono, fontSize: 16, opacity: 0, animation: "maIn .4s ease forwards", animationDelay: delay(items.length) }}>=</span>
      <b key={`tot-${run}`} style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 22, fontWeight: 800, opacity: 0, animation: "maIn .5s ease forwards", animationDelay: `${items.length * 0.32 + 0.1}s` }}><Odo to={m.fn(SAMPLE)} run={run} /></b>
    </div>
  );
}
// טבלת ערכי האותיות — הבסיס לכל חישוב גימטריה (שיטת "רגיל")
const ABC = [
  ["א", 1], ["ב", 2], ["ג", 3], ["ד", 4], ["ה", 5], ["ו", 6], ["ז", 7], ["ח", 8], ["ט", 9],
  ["י", 10], ["כ", 20], ["ל", 30], ["מ", 40], ["נ", 50], ["ס", 60], ["ע", 70], ["פ", 80], ["צ", 90],
  ["ק", 100], ["ר", 200], ["ש", 300], ["ת", 400],
];
// המדריך הבסיסי — מה זה גימטריה ואיך מחשבים. פתוח לכולם.
function HowToGuide() {
  return (
    <div className="bm-guide" style={{ background: L.panel, border: `1px solid ${L.gold}`, borderRadius: 14, padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <h3 style={{ color: L.ink, fontFamily: F.regal, fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>📖 איך עושים גימטריה? — המדריך</h3>
      <p style={{ color: "#3a342a", fontFamily: F.body, fontSize: 15.5, lineHeight: 1.95, margin: "0 0 14px", maxWidth: 700 }}>
        גימטריה היא שיטה עתיקה שבה <b style={{ color: L.goldDeep }}>לכל אות עברית יש ערך מספרי קבוע</b>. הגימטריה של מילה היא <b style={{ color: L.goldDeep }}>סכום הערכים</b> של אותיותיה. כששתי מילים שונות מגיעות לאותו ערך — נחשף קשר נסתר ביניהן.
      </p>
      <div className="bm-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "0 0 16px", maxWidth: 560 }}>
        {[["1", "מפרקים את המילה לאותיות"], ["2", "כותבים לכל אות את ערכה"], ["3", "מחברים את הכל יחד"]].map(([n, t]) => (
          <div key={n} style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 22, fontWeight: 800 }}>{n}</div>
            <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.5 }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, fontWeight: 700, margin: "0 0 8px" }}>ערכי האותיות</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(46px, 1fr))", gap: 6, marginBottom: 12 }}>
        {ABC.map(([l, v]) => (
          <div key={l} style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 8, padding: "6px 2px", textAlign: "center" }}>
            <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 19, fontWeight: 700, lineHeight: 1 }}>{l}</div>
            <div style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 12, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, margin: "0 0 12px" }}>
        <b style={{ color: L.goldDeep }}>אותיות סופיות</b> (ך ם ן ף ץ): ברגיל שוות לערך הרגיל (20, 40, 50, 80, 90); בשיטת "גדול" הן מקבלות 500–900.
      </p>
      <div style={{ background: "#fbf3da", border: `1px solid ${L.gold}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>דוגמה</div>
        <div style={{ color: L.ink, fontFamily: F.mono, fontSize: 16, fontWeight: 700, lineHeight: 1.8 }}>
          אמת = א(1) + מ(40) + ת(400) = <span style={{ color: L.goldDeep, fontSize: 20 }}>{calcGem("אמת")}</span>
        </div>
      </div>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, margin: "12px 0 0" }}>
        זו השיטה הבסיסית ("רגיל"). למטה — עוד 7 שיטות שחושפות רבדים נוספים. ולמעלה ב<b style={{ color: L.goldDeep }}>מחשבון הגימטריה</b> אפשר לחשב כל מילה לבד.
      </p>
    </div>
  );
}
function MethodsTab() {
  return (
    <div>
      <HowToGuide />
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "0 0 20px", maxWidth: 620 }}>
        כל שיטה חושפת רובד אחר באותו ביטוי. הנה 8 שיטות החישוב, עם הסבר ודוגמה חיה (על המילה <b style={{ color: L.goldDeep }}>{SAMPLE}</b>).
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {METHODS.map(m => {
          const info = METHOD_INFO[m.key] || {};
          return (
            <div key={m.key} style={{ background: L.panel, border: `1px solid ${info.star ? L.gold : L.line}`, borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <h3 style={{ color: L.ink, fontFamily: F.regal, fontSize: 20, fontWeight: 700, margin: 0 }}>{m.key}</h3>
                {info.star && <span style={{ background: "#fbf3da", border: `1px solid ${L.gold}`, color: L.goldDeep, borderRadius: 999, padding: "2px 9px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700 }}>★ שיטת הבית</span>}
              </div>
              <p style={{ color: L.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.75, margin: "0 0 8px" }}>{info.what}</p>
              <p style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, margin: "0 0 10px" }}><b style={{ color: L.goldDeep }}>איך מחשבים: </b>{info.how}</p>
              <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 11, margin: "2px 0 6px" }}>דוגמה חיה · {SAMPLE}</div>
              <MethodAnim m={m} />
              {info.insight && <p style={{ color: L.goldDeep, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, margin: "10px 0 0" }}>{info.insight}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// שער: המחשבון, השיטות והפוסטים המאומתים פתוחים לכולם; 1820 מטושטש עד הרשמה.
const GATED = new Set(["sod1820"]);
function Gated({ children }) {
  const { subscribed } = useSubscribed();
  if (subscribed) return children;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(7px)", pointerEvents: "none", userSelect: "none", opacity: 0.5, maxHeight: 420, overflow: "hidden" }} aria-hidden>{children}</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, rgba(244,241,232,0.25), rgba(244,241,232,0.95))" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 20 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🔒</div>
          <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 21, fontWeight: 700, marginBottom: 6 }}>בבנייה — לגישה מוקדמת</div>
          <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, margin: "0 auto 14px", maxWidth: 360 }}>
            <b style={{ color: L.goldDeep }}>המחשבון פתוח לכולם.</b> שאר המדורים בבנייה — הירשמו (חינם) כדי לקבל גישה מוקדמת כשייפתחו.
          </p>
          <SubscribeGate source="beit-midrash" />
        </div>
      </div>
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

// 🌐 צירי התכנסות — כרטיסי הנושא המאושרים (גשרים בין מספר, אירוע וגלריה). בית הביניים עד שייבנה העץ המרכזי.
function ConvergenceStars({ q }) {
  const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2)));
  return <span style={{ color: L.gold, fontSize: 12, letterSpacing: 1 }}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}
function ConvergenceSection() {
  const [cards, setCards] = useState(null);
  const { subscribed } = useSubscribed();
  const FREE = 4; // פתיחה: לפחות 4 חידושים/צירים גלויים למי שלא מנוי
  useEffect(() => {
    let live = true;
    getTopicCards({ approvedOnly: true }).then(c => { if (live) setCards(c || []); }).catch(() => setCards([]));
    return () => { live = false; };
  }, []);
  if (cards === null) return <div style={{ color: L.sub, padding: 20 }}>טוען…</div>;
  if (!cards.length) return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: L.sub }}>
      <div style={{ fontSize: 34, marginBottom: 10 }}>🌐</div>
      <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>צירי התכנסות</div>
      <p style={{ fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, maxWidth: 460, margin: "0 auto" }}>
        כאן נאספים החיבורים: כל ציר הוא גשר בין מספר, אירוע וגלריה. הציר הראשון ייפתח בקרוב.
      </p>
    </div>
  );
  return (
    <div>
      <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, margin: "0 0 18px", maxWidth: 620 }}>
        🌿 החקירה ממשיכה — כל ציר הוא <b style={{ color: L.goldDeep }}>גשר</b> שמחבר מספר, אירוע וגלריה, ומוסיף ענף נוסף לעץ הידע. לחיצה פותחת את מרכז ההתכנסות.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
        {(subscribed ? cards : cards.slice(0, FREE)).map(c => {
          const hot = (c.highlight_numbers || []);
          const tag = topicTag(c);
          return (
            <Link key={c.id} to={`/topic/${encodeURIComponent(c.slug)}`} style={{ textDecoration: "none" }}>
              <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderInlineStart: `3px solid ${L.gold}`, borderRadius: 12, padding: "15px 16px", height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {tag && <div style={{ display: "inline-block", color: L.goldDeep, fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, border: `1px solid ${L.gold}`, background: "#fbf3da", borderRadius: 999, padding: "2px 8px", marginBottom: 8 }}>{tag.icon} {tag.label}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{c.title}</span>
                  <ConvergenceStars q={c.quality} />
                </div>
                {c.subtitle && <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{c.subtitle}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {hot.map(n => (
                    <span key={n} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 13, padding: "2px 10px", borderRadius: 999, border: `1px solid ${L.gold}`, background: "#fbf3da", color: L.goldDeep }}>{n}</span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {!subscribed && cards.length > FREE && (
        <div style={{ marginTop: 18, textAlign: "center", border: `1px solid ${L.gold}`, borderRadius: 14, padding: "22px 20px", background: "linear-gradient(180deg, #fffdf6, #fbf3da)" }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🔒</div>
          <div style={{ color: L.ink, fontFamily: F.regal, fontSize: 19, fontWeight: 700, marginBottom: 6 }}>עוד {cards.length - FREE} צירי התכנסות ממתינים</div>
          <p style={{ color: L.sub, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, maxWidth: 420, margin: "0 auto 14px" }}>
            הצטרפו (חינם) כדי לראות את כל צירי ההתכנסות — אסון מירון, 1820, משיח בן דוד, הציר ההודי ועוד.
          </p>
          <SubscribeGate source="beit-midrash-convergence" />
        </div>
      )}
    </div>
  );
}

export default function BeitMidrashPage() {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const nParam = Number(params.get("n")) || null;
  const wParam = params.get("w") || params.get("calc") || null;  // מילה לטעינה במחשבון (לינק מפוסט)
  const tabParam = params.get("tab");
  const [tab, setTab] = useState((nParam || wParam) ? "calc" : (SECTIONS.some(s => s.key === tabParam) ? tabParam : "convergence"));
  const { subscribed } = useSubscribed();
  // מנורת עדכונים — נדלקת אם יש ציר התכנסות שאושר/עודכן לאחרונה (7 ימים)
  const [hasUpdates, setHasUpdates] = useState(false);
  useEffect(() => {
    let live = true;
    getTopicCards({ approvedOnly: true }).then(cs => {
      if (!live) return;
      const recent = (cs || []).some(c => (Date.now() - new Date(c.approved_at || c.created_at).getTime()) / 86400000 <= 7);
      setHasUpdates(recent);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  // מחוון "עדכון חדש" למדורי החידושים — נדלק אם נוסף/עודכן חידוש ב-7 הימים האחרונים
  const [insightUpdates, setInsightUpdates] = useState(() => new Set());
  useEffect(() => {
    let live = true;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    supabase.from("insights").select("category,tags,updated_at,created_at")
      .or(`updated_at.gte.${since},created_at.gte.${since}`).limit(80)
      .then(({ data }) => {
        if (!live || !data) return;
        const s = new Set();
        data.forEach(it => {
          if (it.category === "הצלבות") s.add("crosses");
          if ((it.tags || []).includes("חידושי גולשים")) s.add("community");
        });
        setInsightUpdates(s);
      }).catch(() => {});
    return () => { live = false; };
  }, []);

  // סנכרון טאב↔URL — קישורי ?tab= עובדים גם בתוך הדף (לא רק בטעינה ראשונה)
  useEffect(() => {
    const tp = new URLSearchParams(loc.search).get("tab");
    if (tp && SECTIONS.some(s => s.key === tp)) setTab(tp);
  }, [loc.search]);

  const active = SECTIONS.find(s => s.key === tab) || SECTIONS[0];

  // נייד: רמז שיש עוד מדורים — נדנוד גלילה קל פעם אחת, והסתרת הרמז אחרי גלילה
  const sideRef = useRef(null);
  useEffect(() => {
    const el = sideRef.current;
    if (!el) return;
    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    if (!isMobile) return;
    const nav = el.parentElement;
    // אם אין באמת תוכן נוסף לגלילה — לא להציג רמז
    if (el.scrollWidth <= el.clientWidth + 8) { nav && nav.classList.add("bm-scrolled"); return; }
    const hideHint = () => nav && nav.classList.add("bm-scrolled");
    let attached = false;
    // נדנוד עדין: לחשוף שיש עוד, ולחזור (RTL → התוכן הנוסף משמאל)
    const start = el.scrollLeft;
    const t1 = setTimeout(() => el.scrollTo({ left: start - 90, behavior: "smooth" }), 700);
    const t2 = setTimeout(() => el.scrollTo({ left: start, behavior: "smooth" }), 1300);
    // רק אחרי שהנדנוד נגמר — מקשיבים לגלילה אמיתית של המשתמש כדי להסתיר את הרמז
    const t3 = setTimeout(() => { el.addEventListener("scroll", hideHint, { once: true, passive: true }); attached = true; }, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); if (attached) el.removeEventListener("scroll", hideHint); };
  }, []);

  return (
    <div style={{ background: L.bg, minHeight: "100vh", direction: "rtl", position: "relative", zIndex: 1 }}>
      <div className="bm-wrap" style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 22px 90px" }}>
        {/* כותרת */}
        <div style={{ borderBottom: `2px solid ${L.line}`, paddingBottom: 18, marginBottom: 22 }}>
          <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>בית המדרש · סוד 1820</div>
          <h1 style={{ color: L.ink, fontFamily: F.regal, fontSize: "clamp(28px,5vw,46px)", fontWeight: 700, margin: 0 }}>📖 לימוד הסודות</h1>
          <p style={{ color: L.sub, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.8, margin: "8px 0 0", maxWidth: 640 }}>
            מחשבון גימטריה מלא, שיטות החישוב ופוסטים מאומתים — במקום אחד. מדורי החידושים בבנייה וייפתחו בקרוב.
          </p>
          {!subscribed && (
            <p style={{ color: L.goldDeep, fontFamily: F.heading, fontSize: 13, fontWeight: 700, margin: "10px 0 0" }}>
              🔓 המחשבון פתוח לכולם · שאר המדורים בבנייה — הירשמו (חינם) לגישה מוקדמת
            </p>
          )}
        </div>

        <LiveDiscoveries />

        {/* גוף: תפריט-צד + תוכן */}
        <div style={{ display: "flex", gap: 26, alignItems: "flex-start" }} className="bm-grid">
          {/* תפריט צד (ימין ב-RTL) */}
          <nav className="bm-side" style={{ width: 230, flex: "0 0 auto", position: "sticky", top: 20 }}>
            {/* רמז גלילה — מוצג רק בנייד, נעלם אחרי גלילה ראשונה */}
            <div className="bm-swipe-hint" aria-hidden="true">
              <span>👈 החליקו לכל המדורים 👉</span>
            </div>
            <div ref={sideRef} className="bm-side-scroll" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                    {((s.key === "convergence" && hasUpdates) || insightUpdates.has(s.key)) && (
                      <span title="עדכונים חדשים" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 13, animation: "bm-blink 1.3s ease-in-out infinite" }}>🔔</span>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e8a200", boxShadow: "0 0 7px #e8a200", animation: "bm-blink 1.3s ease-in-out infinite" }} />
                      </span>
                    )}
                    {s.ai && <span style={{ width: 8, height: 8, borderRadius: "50%", background: L.blue }} />}
                    {GATED.has(s.key) && !subscribed && <span style={{ fontSize: 12 }}>🔒</span>}
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

            {tab === "calc" && <CalcTab initial={nParam} seed={wParam} />}
            {tab === "crosses" && <CrossesTab />}
            {tab === "methods" && <MethodsTab />}
            {tab === "convergence" && <ConvergenceSection />}
            {tab === "verified" && <VerifiedTab />}
            {tab === "numbers" && <Soon title="מספרי יסוד" note="טבלת מספרי היסוד וההצלבות שלהם בכל השיטות — בבנייה, תיפתח בקרוב." />}
            {tab === "ai" && <Soon title="חידושי AI" note="חידושי הגימטריה שהמערכת מפיקה ומאמתת — בבנייה, ייפתחו בקרוב." />}
            {tab === "mine" && <Soon title="חידושי המערכת" note="ארכיון החידושים והצלבות 1820 — בבנייה, ייפתח בקרוב." />}
            {tab === "sod1820" && <Gated><Sod1820Tab /></Gated>}
            {tab === "community" && <CommunityTab />}
            {tab === "submit" && <SubmitTab />}
          </main>
        </div>
      </div>

      <style>{`
        .bm-swipe-hint { display: none; }
        .bm-mirror { grid-template-columns: 1fr 1fr; }
        @media (max-width: 560px) { .bm-mirror { grid-template-columns: 1fr !important; } }
        @media (max-width: 860px) {
          .bm-grid { flex-direction: column; gap: 14px !important; align-items: stretch !important; }
          .bm-grid > main { width: 100% !important; min-width: 0 !important; }
          .bm-side { width: 100% !important; position: sticky !important; top: 0 !important; z-index: 5;
            background: ${L.bg}; margin: 0 -13px; padding: 8px 13px; }
          /* רמז "החליקו לעוד מדורים" — נייד בלבד, נעלם אחרי גלילה */
          .bm-swipe-hint { display: block; text-align: center; color: ${L.goldDeep};
            font-family: ${F.heading}; font-size: 11.5px; font-weight: 700; letter-spacing: .3px;
            padding: 1px 0 7px; opacity: .92; animation: bm-hint-pulse 1.7s ease-in-out infinite;
            transition: opacity .4s, max-height .4s, padding .4s; max-height: 24px; overflow: hidden; }
          .bm-side.bm-scrolled .bm-swipe-hint { opacity: 0; max-height: 0; padding: 0; animation: none; }
          /* קצוות מעומעמים — מסמנים שיש עוד תוכן מעבר לקצה */
          .bm-side-scroll { position: relative; }
          .bm-side::before, .bm-side::after { content: ""; position: absolute; bottom: 8px; width: 30px; height: 42px;
            pointer-events: none; z-index: 6; }
          .bm-side::before { right: 13px; background: linear-gradient(to left, ${L.bg}, transparent); }
          .bm-side::after  { left: 13px;  background: linear-gradient(to right, ${L.bg}, transparent); }
          .bm-side.bm-scrolled::before, .bm-side.bm-scrolled::after { display: none; }
          .bm-side-scroll { flex-direction: row !important; overflow-x: auto; gap: 7px !important; padding-bottom: 6px;
            -webkit-overflow-scrolling: touch; scrollbar-width: none; scroll-snap-type: x proximity; }
          .bm-side-scroll::-webkit-scrollbar { display: none; }
          .bm-side button { border-inline-start: none !important; border-radius: 999px !important; white-space: nowrap;
            border: 1px solid ${L.line} !important; padding: 9px 14px !important; flex: 0 0 auto; scroll-snap-align: start; }
          .bm-side button > span:nth-child(2) { flex: 0 0 auto !important; }
        }
        @media (max-width: 700px) {
          .bm-wrap { padding: 22px 13px 70px !important; }
          .bm-guide { padding: 16px 15px !important; }
          .bm-steps { gap: 7px !important; }
          .bm-calc { flex-direction: column; gap: 14px !important; }
          .bm-numlist { width: 100% !important; position: static !important; }
          .bm-numlist > div:last-child { flex-direction: row !important; overflow-x: auto; max-height: none !important;
            -webkit-overflow-scrolling: touch; padding-bottom: 6px; }
          .bm-numlist > div:last-child > div { width: auto !important; flex: 0 0 auto; }
          .axis-line { display: none !important; }
          .axis-label { display: none !important; }
        }
        @media (max-width: 420px) {
          .bm-steps div div:last-child { font-size: 11.5px !important; }
        }
        @keyframes maIn { from { opacity: 0; transform: translateY(6px) scale(.8); } to { opacity: 1; transform: none; } }
        @keyframes bm-blink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
        @keyframes bm-hint-pulse { 0%,100% { opacity: .55; } 50% { opacity: .95; } }
        @keyframes axisBeadIn { from { opacity: 0; transform: translateY(8px) scale(.6); } to { opacity: 1; transform: none; } }
        @keyframes axisPulse { 0%, 100% { box-shadow: 0 0 0 4px #fbf3da, 0 2px 8px rgba(154,120,24,0.4); } 50% { box-shadow: 0 0 0 8px #f4e6bd, 0 2px 12px rgba(154,120,24,0.55); } }
      `}</style>
    </div>
  );
}
