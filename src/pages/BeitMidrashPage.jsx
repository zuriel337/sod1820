import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { C, F, KEY_NUMBERS } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";
import { NAV } from "../routes.jsx";
import { getInsights, getPostByWpId, supabase } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import InsightCard from "../components/InsightCard.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import SubscribeGate, { useSubscribed } from "../components/SubscribeGate.jsx";
import PersonalGematriaGift from "../components/PersonalGematriaGift.jsx";
import GematriaCalculator from "../components/GematriaCalculator.jsx";

// טעימות תלת-מימד — נטענות עצמאית כך ש-three.js לא מנפח את שאר האתר.
const GematriaTeaser = React.lazy(() => import("../components/GematriaTeaser.jsx"));
const GematriaCalculator3D = React.lazy(() => import("../components/GematriaCalculator3D.jsx"));

const METHODS = NAV.find(i => i.to === "/beit-midrash")?.children || [];
const FREE_LIMIT = 2;        // חוק subscribe_gate_law — 2 חידושים חינם ואז הרשמה
const FOUNDATION_WP_ID = 17; // פוסט היסוד — "שם ה' בתורה 1820 פעם" (סוד 1820 המקורי)

// פוסט היסוד — מקום של כבוד לסוד 1820 המקורי
function FoundationPost({ post }) {
  if (!post) return null;
  const href = `/${post.slug}`;
  const title = stripHtml(post.title || "");
  return (
    <Link to={href} style={{
      display: "flex", gap: 16, alignItems: "center", textDecoration: "none",
      background: `linear-gradient(135deg, ${C.surface2}, ${C.surface})`,
      border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: 18,
      marginBottom: 44, boxShadow: "0 0 40px rgba(212,175,55,0.10) inset",
    }}>
      {post.image_url && (
        <img src={post.image_url} alt="" width={84} height={84}
          style={{ borderRadius: 12, objectFit: "cover", flex: "0 0 auto", border: `1px solid ${C.border}` }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>★ פוסט היסוד</span>
          <VerifiedBadge variant="post" size={14} />
        </div>
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700, lineHeight: 1.5 }}>{title}</div>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, marginTop: 6 }}>הממצא המכונן של סוד 1820 — קראו את ההתחלה ↩</div>
      </div>
    </Link>
  );
}

function SectionTitle({ emoji, title, badge, children }) {
  return (
    <div style={{ margin: "0 0 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 24, fontWeight: 700, margin: 0 }}>
          {emoji} {title}
        </h3>
        {badge}
      </div>
      {children && (
        <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, margin: "8px 0 0" }}>
          {children}
        </p>
      )}
    </div>
  );
}

function ComingSoon({ text }) {
  return (
    <div style={{
      textAlign: "center", color: C.muted, fontFamily: F.heading, fontSize: 13,
      letterSpacing: 1, background: C.surface2, border: `1px dashed ${C.border}`,
      borderRadius: 12, padding: "28px 20px",
    }}>🚧 {text}</div>
  );
}

// רשימת חידושים עם שער המנוי (2 חינם → הרשמה)
function InsightList({ items, badgeVariant }) {
  const { subscribed, markSubscribed } = useSubscribed();
  const visible = subscribed ? items : items.slice(0, FREE_LIMIT);
  const locked = items.length - visible.length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {visible.map(it => <InsightCard key={it.id} insight={it} badgeVariant={badgeVariant} />)}
      {!subscribed && locked > 0 && (
        <SubscribeGate lockedCount={locked} source="beit-midrash" onUnlock={markSubscribed} />
      )}
    </div>
  );
}

// ===== עוזרי טבלה =====
const tWrap = { overflowX: "auto", border: `1px solid ${C.borderGold}`, borderRadius: 14, background: C.surface2 };
const tEl = { width: "100%", borderCollapse: "collapse", direction: "rtl", minWidth: 0 };
const thS = { background: C.goldDark, color: C.goldBright, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap", borderBottom: `1px solid ${C.borderGold}` };
const tdS = { color: C.goldLight, fontFamily: F.body, fontSize: 14, padding: "9px 12px", borderBottom: `1px solid ${C.border}`, verticalAlign: "top" };
const numCell = { ...tdS, fontFamily: F.mono, fontWeight: 700, color: C.goldBright, textAlign: "center", whiteSpace: "nowrap" };

// 🧮 טבלת גימטריה רב-שיטתית — בוחרים מספר ורואים ביטויים ששווים לו בכל השיטות (bidim).
const ANCHORS = [1820, 1237, 776, 358, 541, 318, 1202, 86, 45, 26];
const COLS = ["רגיל", "מילוי", "מסתתר", "קדמי", "אתבש"];
function GematriaTable({ initial }) {
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
      const map = {};
      (all || []).forEach(r => { (map[r.phrase] ||= {})[r.method] = r.value; });
      const out = phrases.map(p => ({ phrase: p, vals: map[p] || {} })).sort((a, b) => a.phrase.length - b.phrase.length);
      if (live) setRows(out);
    })();
    return () => { live = false; };
  }, [val]);
  return (
    <div style={{ margin: "44px auto 8px", maxWidth: 1080, textAlign: "right" }}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>🧮 טבלאות הגימטריה</div>
        <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, margin: "0 auto", maxWidth: 520 }}>
          בחרו מספר וראו את הביטויים ששווים לו, וכמה הם שווים בכל שיטה. לחיצה על ביטוי פותחת את דף המספר.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
        {anchors.map(n => (
          <button key={n} onClick={() => setVal(n)} style={{
            cursor: "pointer", fontFamily: F.mono, fontSize: 15, fontWeight: 800, padding: "7px 16px", borderRadius: 999,
            border: `1px solid ${n === val ? C.gold : C.border}`, background: n === val ? "rgba(212,175,55,0.18)" : C.surface2,
            color: n === val ? C.goldBright : C.goldDim, transition: "all .2s",
          }}>{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 24, fontWeight: 800 }}>{val}</span>
        {KEY_NUMBERS[val] && <span style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 15 }}>{KEY_NUMBERS[val]}</span>}
        {rows && <span style={{ color: C.muted, fontFamily: F.body, fontSize: 13 }}>· {rows.length} ביטויים</span>}
      </div>
      {rows === null ? (
        <div style={{ color: C.muted, fontFamily: F.body, padding: 16, textAlign: "center" }}>טוען…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: C.muted, fontFamily: F.body, padding: 16, textAlign: "center" }}>אין ביטויים מאומתים למספר זה ב-bidim.</div>
      ) : (
        <div style={tWrap}>
          <table style={tEl}>
            <thead><tr><th style={thS}>ביטוי</th>{COLS.map(c => <th key={c} style={{ ...thS, textAlign: "center" }}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={tdS}>
                    <Link to={`/number/${encodeURIComponent(r.phrase)}`} style={{ color: C.goldLight, textDecoration: "none", fontWeight: 700 }}>{r.phrase}</Link>
                  </td>
                  {COLS.map(c => <td key={c} style={numCell}>{r.vals[c] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// טבלת חידושים — כותרת + מספרים; לחיצה על שורה פותחת את גוף החידוש.
function InsightTable({ items, accent = C.gold }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={tWrap}>
      <table style={tEl}>
        <thead><tr><th style={thS}>חידוש</th><th style={{ ...thS, textAlign: "center" }}>מספרים</th></tr></thead>
        <tbody>
          {items.map(it => {
            const isOpen = open === it.id;
            const nums = (it.related_numbers || []).slice(0, 4).join(" · ");
            return (
              <React.Fragment key={it.id}>
                <tr onClick={() => setOpen(isOpen ? null : it.id)} style={{ cursor: "pointer" }}>
                  <td style={{ ...tdS, fontFamily: F.regal, fontWeight: 700, color: C.goldLight, borderInlineStart: `3px solid ${accent}` }}>
                    <span style={{ color: accent, marginInlineEnd: 6 }}>{isOpen ? "▴" : "▾"}</span>{it.title}
                  </td>
                  <td style={numCell}>{nums || "—"}</td>
                </tr>
                {isOpen && (
                  <tr><td colSpan={2} style={{ ...tdS, background: C.surface }}>
                    {it.body && <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{it.body}</p>}
                    {it.proof && <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.8, margin: 0 }}><b style={{ color: C.gold }}>הוכחה: </b>{it.proof}</p>}
                    {!!(it.related_phrases || []).length && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {it.related_phrases.map((p, i) => <span key={i} style={{ fontFamily: F.body, fontSize: 12, color: C.goldLight, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 10px" }}>{p}</span>)}
                      </div>
                    )}
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// פוסטים מאומתים (verified) — טאב בבית המדרש.
function VerifiedTab() {
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    let live = true;
    supabase.from("posts").select("wp_id,title,slug,image_url,modified,ai_number")
      .eq("verified", true).order("modified", { ascending: false, nullsFirst: false }).limit(60)
      .then(({ data }) => { if (live) setPosts(data || []); });
    return () => { live = false; };
  }, []);
  if (posts === null) return <div style={{ color: C.muted, fontFamily: F.body, padding: 30, textAlign: "center" }}>טוען…</div>;
  if (!posts.length) return <div style={{ color: C.muted, fontFamily: F.body, padding: 30, textAlign: "center" }}>עדיין אין פוסטים מאומתים.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, textAlign: "right" }}>
      {posts.map(p => (
        <Link key={p.wp_id} to={`/${p.slug}`} style={{ display: "flex", flexDirection: "column", textDecoration: "none", overflow: "hidden", border: `1px solid ${C.borderGold}`, borderRadius: 14, background: "linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45))" }}>
          <div style={{ position: "relative", aspectRatio: "16/10", background: p.image_url ? `center/cover no-repeat url(${p.image_url})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})` }}>
            <span style={{ position: "absolute", top: 8, insetInlineStart: 8 }}><VerifiedBadge variant="ai" size={14} label="מאומת" /></span>
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{stripHtml(p.title || "")}</div>
            {p.ai_number && <div style={{ color: C.goldDim, fontFamily: F.mono, fontSize: 12, marginTop: 6 }}>מספר מאומת: {p.ai_number}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}

const TABS = [
  { key: "calc", label: "🧮 מחשבון גימטריה" },
  { key: "numbers", label: "🔢 מספרי יסוד" },
  { key: "ai", label: "🔵 חידושי AI" },
  { key: "verified", label: "✓ פוסטים מאומתים" },
];

export default function BeitMidrashPage() {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const nParam = Number(params.get("n")) || null;
  const tabParam = params.get("tab");
  const [tab, setTab] = useState(nParam ? "numbers" : (TABS.some(t => t.key === tabParam) ? tabParam : "calc"));
  const [aiInsights, setAiInsights] = useState([]);

  useEffect(() => {
    if (tab !== "ai") return;
    getInsights({ origin: "ai", space: null, limit: 40 }).then(d => setAiInsights(d || [])).catch(() => {});
  }, [tab]);

  return (
    <div style={{ direction: "rtl", maxWidth: 1180, margin: "0 auto", padding: "60px 20px 100px", position: "relative", zIndex: 1 }}>
      {/* כותרת רזה */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 10 }}>בית המדרש · סוד 1820</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,42px)", fontWeight: 700, margin: 0 }}>📚 בית המדרש</h1>
      </div>

      {/* טאבים */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            cursor: "pointer", fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "9px 20px", borderRadius: 999,
            border: `1px solid ${tab === t.key ? C.gold : C.border}`,
            background: tab === t.key ? "rgba(212,175,55,0.16)" : C.surface2,
            color: tab === t.key ? C.goldBright : C.goldDim, transition: "all .2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* תוכן הטאב */}
      {tab === "calc" && (
        <React.Suspense fallback={<div style={{ height: "min(78vh,660px)", maxWidth: 980, margin: "0 auto", borderRadius: 18, border: `1px solid ${C.border}`, background: "#030108" }} />}>
          <GematriaCalculator3D />
        </React.Suspense>
      )}

      {tab === "numbers" && (
        <>
          {nParam && (
            <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, fontSize: 14, marginBottom: 6 }}>
              הגעת מאימות פוסט — הנה כל מה שמתכנס סביב <b style={{ color: C.goldBright, fontFamily: F.mono }}>{nParam}</b>.
            </div>
          )}
          <GematriaTable initial={nParam} />
        </>
      )}

      {tab === "ai" && (
        <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "right" }}>
          <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, textAlign: "center", margin: "0 auto 18px", maxWidth: 520 }}>
            חידושים שהופקו בעזרת בינה מלאכותית. לחיצה על שורה פותחת את החידוש.
          </p>
          {aiInsights.length > 0
            ? <InsightTable items={aiInsights} accent="#3ea6ff" />
            : <div style={{ color: C.muted, fontFamily: F.body, padding: 30, textAlign: "center" }}>טוען חידושים…</div>}
        </div>
      )}

      {tab === "verified" && (
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <p style={{ color: C.muted, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.9, textAlign: "center", margin: "0 auto 18px", maxWidth: 520 }}>
            פוסטים שהנתונים בהם (תאריכים ומספרים) נסרקו ואומתו על ידי AI.
          </p>
          <VerifiedTab />
        </div>
      )}
    </div>
  );
}
