import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { usePalette } from "../../lib/palette.js";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { updateProfile } from "../../lib/auth.js";
import HintsPanel from "./HintsPanel.jsx";

// 🏛️ UserCenter — מרכז השליטה האישי. מגירה שמאלית אחת (overlay), זהה בטלפון ובמחשב.
// registry מודולרי: להוסיף אזור = רשומה במערך MODULES, בלי לגעת בשלד. עיצוב בהיר-מודרני
// (research_workspace_law) עם וריאנט כהה שנצמד למתג היום/לילה הגלובלי.

// ── פלטה מודרנית scoped (בהיר כברירת-מחדל, כהה נצמד לגלובלי) ──
const LIGHT = { bg: "#f6f7f9", card: "#ffffff", ink: "#1b1d22", sub: "#5b6472", line: "#e6e8ec", acc: "#2f6df6", accSoft: "#eaf1ff", gold: "#c79a2e", goldSoft: "#faf4e2" };
const DARK  = { bg: "#12141a", card: "#1b1e26", ink: "#eef0f4", sub: "#9aa2b1", line: "#2a2e38", acc: "#5b8cff", accSoft: "#1c2740", gold: "#d8b75e", goldSoft: "#2a2417" };

export default function UserCenter() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const P = usePalette();
  const { isOpen, active, open, close, setActive } = useUserCenter();
  const dark = P?.mode !== "light";
  const T = dark ? DARK : LIGHT;
  const [center, setCenter] = useState(null); // my_center RPC

  useEffect(() => {
    if (!isOpen || !user || !supabase) return;
    let alive = true;
    supabase.rpc("my_center").then(({ data }) => { if (alive) setCenter(data || {}); }).catch(() => {});
    return () => { alive = false; };
  }, [isOpen, user]);

  // נעילת גלילה של הרקע כשהמגירה פתוחה
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!user) return null;
  const MODULES = buildModules({ T, user, profile, isAdmin, center, signOut });
  const activeMod = MODULES.find(m => m.id === active) || null;
  const initial = (profile?.display_name || profile?.username || user.email || "א").trim().charAt(0).toUpperCase();
  const isPublisher = center?.is_publisher;

  return (
    <>
      {/* scrim */}
      <div onClick={close} style={{
        position: "fixed", inset: 0, background: "rgba(6,8,14,0.55)", zIndex: 4000,
        opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none", transition: "opacity .22s",
      }} />
      {/* drawer — צמוד שמאל */}
      <aside dir="rtl" style={{
        position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 4001,
        width: "min(410px, 92vw)", background: T.bg, color: T.ink,
        boxShadow: "6px 0 40px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column",
        transform: isOpen ? "translateX(0)" : "translateX(-104%)", transition: "transform .26s cubic-bezier(.4,0,.2,1)",
        fontFamily: "'Heebo','Assistant',sans-serif",
      }}>
        {/* header */}
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${T.line}`, background: T.card }}>
          {/* 🧑 מיתוג האזור — «האזור האישי» = הזהות (איחוד האזורים, החלטת צוריאל 9.7.2026).
              המחקר חי בעולם נפרד («המחקר שלי» — הלשונית בדף המספר + /research); כאן רק מפנים אליו. */}
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".07em", color: T.gold, marginBottom: 10 }}>🧑 האזור האישי</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", flex: "none", overflow: "hidden",
              display: "grid", placeItems: "center", background: `linear-gradient(135deg,${T.acc},${T.gold})`,
              color: "#fff", fontWeight: 800, fontSize: 22, border: `2px solid ${T.card}`, boxShadow: `0 0 0 1px ${T.line}` }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.display_name || profile?.username || "החוקר"}
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                {isPublisher ? "👑 כותב · VIP" : isAdmin ? "👑 מנהל" : "חוקר רשום"}
              </div>
            </div>
            <button onClick={close} aria-label="סגור" style={{ background: "none", border: "none", color: T.sub, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
          {/* פס-סטטוס — נתונים אמיתיים בלבד (my_center) */}
          <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
            <Stat T={T} label="במחקר" val={center?.research_items ?? "—"} />
            <Stat T={T} label="שמורים" val={center?.saved ?? "—"} />
            <Stat T={T} label="חיפושים" val={center?.searched ?? "—"} />
            <Stat T={T} label="פוסטים" val={center?.posts ?? "—"} gold />
          </div>
        </div>

        {/* body — grid של מודולים או מודול פעיל */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: 14 }}>
          {!activeMod ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {MODULES.filter(m => !m.hidden).map(m => (
                <button key={m.id} onClick={() => setActive(m.id)} style={{
                  textAlign: "right", background: T.card, border: `1px solid ${T.line}`, borderRadius: 14,
                  padding: "13px 13px", cursor: "pointer", position: "relative", minHeight: 74,
                  display: "flex", flexDirection: "column", gap: 4, color: T.ink,
                }}>
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{m.title}</span>
                  {m.badge != null && <span style={{ position: "absolute", top: 10, left: 10, background: T.accSoft, color: T.acc, borderRadius: 999, fontSize: 11, fontWeight: 800, padding: "1px 8px" }}>{m.badge}</span>}
                  {m.status === "soon" && <span style={{ position: "absolute", top: 10, left: 10, background: dark ? "#2a2e38" : "#eef0f2", color: T.sub, borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>בקרוב</span>}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button onClick={() => setActive(null)} style={{ background: "none", border: "none", color: T.acc, fontWeight: 700, fontSize: 13.5, cursor: "pointer", padding: "2px 0 12px", display: "inline-flex", alignItems: "center", gap: 5 }}>→ חזרה</button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{activeMod.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{activeMod.title}</span>
              </div>
              {activeMod.render()}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Stat({ T, label, val, gold }) {
  return (
    <div style={{ flex: 1, textAlign: "center", background: gold ? T.goldSoft : T.accSoft, borderRadius: 11, padding: "7px 4px" }}>
      <div style={{ fontWeight: 800, fontSize: 17, color: gold ? T.gold : T.acc }}>{typeof val === "number" ? val.toLocaleString("he") : val}</div>
      <div style={{ fontSize: 10.5, color: T.sub, marginTop: 1 }}>{label}</div>
    </div>
  );
}

// ── מפת-הדרך האחת — «בקרוב = התוכנית האמיתית», מקובצת (במקום עשרות מודולים נעולים) ──
function Roadmap({ T }) {
  const groups = [
    ["🌳 העץ וההתקדמות", "העץ האישי החזותי · דרגת חוקר · הישגים ותגים · משימות שמזכות ב-XP"],
    ["💎 התוכן שלי", "הפוסטים שלי · האוצרות שגיליתי · המועדפים · לוח-פעילות אישי"],
    ["⭐ קרדיטים", "יתרה והיסטוריה · בונוסים ומשימות · רכישת חבילות"],
    ["👥 קהילה", "חוקרים שאני עוקב · הזמן-חוקר · הודעות בין חוקרים"],
    ["🤖 חכם", "ה-AI שמכיר את המחקר שלך · התראות לפי נושא · «מצאנו התאמה חדשה»"],
    ["🔐 מערכת", "פרטיות והרשאות · תמיכה ומשוב · מנוי וחבילות"],
  ];
  return (
    <div>
      <div style={{ background: T.accSoft, color: T.acc, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>🚧 נבנה בהדרגה — הארכיטקטורה המלאה כבר מתוכננת</div>
      <div style={{ display: "grid", gap: 10 }}>
        {groups.map(([t, d], i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: i < groups.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>{t}</div>
            <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.6, marginTop: 2 }}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ T, k, v }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.line}` }}><span style={{ color: T.sub, fontSize: 13.5 }}>{k}</span><span style={{ fontWeight: 800 }}>{typeof v === "number" ? v.toLocaleString("he") : v}</span></div>;
}

// ── ה-registry: 22 מודולים. live = פאנל אמיתי · soon = התוכנית האמיתית ──
// כל render() הוא פאנל עצמאי (לא תלוי בשלד המגירה) → אפשר לרנדר אותו בעתיד גם
// במסך-מלא (/me/:module) עם אותו registry, בלי לגעת ב-UserCenter. לכן buildModules מיוצא.
export function buildModules({ T, user, profile, isAdmin, center, signOut }) {
  const c = center || {};
  return [
    // ─── LIVE — פאנלים אמיתיים עם נתונים ───
    { id: "profile", icon: "👤", title: "הפרופיל שלי", status: "live", render: () => (
      <div>
        <Row T={T} k="סטטוס" v={c.is_publisher ? "👑 כותב · VIP" : "חוקר רשום"} />
        <Row T={T} k="פוסטים באתר" v={c.posts ?? 0} />
        <Row T={T} k="פריטים במחקר" v={c.research_items ?? 0} />
        <Row T={T} k="שמורים" v={c.saved ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>העולם האישי שלך בתוך SOD1820 — כל גילוי מרחיב את העץ שלך.</div>
      </div>
    ) },
    { id: "research", icon: "🔎", title: "המחקר שלי", status: "live", badge: c.research_items || undefined, render: () => (
      <div>
        <Row T={T} k="פריטים במחקר" v={c.research_items ?? 0} />
        <Row T={T} k="שמורים" v={c.saved ?? 0} />
        <Row T={T} k="חיפושים שבנו את העץ" v={c.searched ?? 0} />
        <Link to="/research" style={{ display: "inline-block", marginTop: 14, background: T.acc, color: "#fff", borderRadius: 10, padding: "9px 18px", textDecoration: "none", fontWeight: 700, fontSize: 13.5 }}>פתח את סביבת המחקר ←</Link>
      </div>
    ) },
    { id: "contrib", icon: "🤝", title: "התרומות שלי", status: "live", badge: c.contributions || undefined, render: () => (
      <div>
        <Row T={T} k="פריטים שהוספת (אושרו)" v={c.contributions ?? 0} />
        <Row T={T} k="מהמילים שלך במנוע" v={c.contributions ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>בקרוב: כמה נכנסו ל«אוצרות» · כמה משתמשים השתמשו · כמה צפיות קיבלו.</div>
      </div>
    ) },
    { id: "stats", icon: "📊", title: "סטטיסטיקות", status: "live", render: () => (
      <div>
        <Row T={T} k="חיפושים" v={c.searched ?? 0} />
        <Row T={T} k="פוסטים" v={c.posts ?? 0} />
        <Row T={T} k="פריטים במחקר" v={c.research_items ?? 0} />
        <Row T={T} k="תרומות" v={c.contributions ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>בקרוב: דירוג בקהילה · זמן פעילות · תגים והישגים.</div>
      </div>
    ) },
    { id: "hints", icon: "🧩", title: "הרמזים שלי", status: "live", badge: c.hints || undefined, render: () => <HintsPanel T={T} user={user} /> },
    { id: "settings", icon: "⚙️", title: "הגדרות", status: "live", render: () => <SettingsPanel T={T} profile={profile} user={user} signOut={signOut} /> },

    // ─── ROADMAP — מפת-דרך אחת (במקום עשרות מודולים נעולים). «בקרוב = התוכנית האמיתית» ───
    { id: "roadmap", icon: "🗺️", title: "מה בקרוב", status: "soon", render: () => <Roadmap T={T} /> },
  ];
}

// ── פאנל הגדרות — עריכת פרופיל בסיסית + יציאה ──
function SettingsPanel({ T, profile, user, signOut }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fld = { width: "100%", padding: "10px 12px", background: T.card, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 9, fontSize: 14, marginTop: 5, boxSizing: "border-box" };
  const lbl = { color: T.sub, fontSize: 12, marginTop: 12, display: "block" };
  const save = useCallback(async () => {
    setBusy(true); setMsg("");
    try { await updateProfile(user.id, { display_name: displayName.trim() || null, username: username.trim() || null, avatar_url: avatarUrl.trim() || null }); setMsg("נשמר ✓"); }
    catch { setMsg("שגיאה בשמירה"); } finally { setBusy(false); }
  }, [user, displayName, username, avatarUrl]);
  return (
    <div>
      <label style={lbl}>שם תצוגה</label>
      <input style={fld} value={displayName} onChange={e => setDisplayName(e.target.value)} dir="rtl" />
      <label style={lbl}>שם משתמש</label>
      <input style={fld} value={username} onChange={e => setUsername(e.target.value)} dir="rtl" />
      <label style={lbl}>קישור לתמונת פרופיל</label>
      <input style={fld} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} dir="ltr" placeholder="https://…" />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={save} disabled={busy} style={{ flex: 1, background: T.acc, color: "#fff", border: "none", borderRadius: 9, padding: "10px", fontWeight: 700, cursor: "pointer" }}>{busy ? "שומר…" : "שמירה"}</button>
        <button onClick={() => signOut?.()} style={{ background: "none", border: `1px solid ${T.line}`, color: T.sub, borderRadius: 9, padding: "10px 16px", cursor: "pointer" }}>יציאה</button>
      </div>
      {msg && <div style={{ marginTop: 10, fontSize: 13, color: T.acc, textAlign: "center" }}>{msg}</div>}
    </div>
  );
}
