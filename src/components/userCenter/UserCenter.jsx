import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { usePalette } from "../../lib/palette.js";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import { supabase, getUserActivity } from "../../lib/supabase.js";
import MyTreeCard from "../MyTreeCard.jsx";
import { PUSH_CONFIGURED, getPushStatus, enablePush, disablePush } from "../../lib/push.js";
import { useSiteOnline } from "../../lib/presence.js";
import HintsPanel from "./HintsPanel.jsx";
import ProfileSettings from "../ProfileSettings.jsx";
import ResearchCenter from "../ResearchCenter.jsx";
import { rwCss, RW_VARS } from "../../lib/research/theme.js";
import { getMyNotifications, getUnreadCount, markNotificationRead, markAllRead } from "../../lib/notifications.js";
import { getMyMatrices, selfPublishMatrix } from "../../lib/elsMatrices.js";
import { getMyProfile, claimFoundingGrants, claimDailyCredit, claimWaActivityCredits, getNextActions, getAgentRoster, getAgentStats, getMyWaMemory, getMyCreditLedger, getMyLinkedPhones, requestWaLinkCode, verifyWaLinkCode, unlinkMyWa, getMyReferralStats, getMyResearchLevel } from "../../lib/commandCenter.js";
import { useWaLink, WaDot } from "../../lib/userCenter/useWaLink.jsx";

// 🟢 צ'יפ סטטוס-וואטסאפ בכותרת המגירה — גלוי מיד: מנותק = CTA לחיבור (+100 קרדיט),
//    מחובר = «מחובר ✓» + ניהול. לחיצה פותחת את מודול «הוואטסאפ שלי» (setActive('whatsapp')).
function WaHeaderChip({ T, onOpen }) {
  const { hasUser, loading, linked, phone } = useWaLink();
  if (!hasUser || loading) return null;
  const p = String(phone || "").replace(/\D/g, "");
  const mask = p ? "+" + p.slice(0, 4) + "•••" + p.slice(-3) : "";
  return (
    <button onClick={onOpen} style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%", boxSizing: "border-box", marginTop: 11,
      cursor: "pointer", textAlign: "right", fontFamily: "inherit",
      background: "rgba(37,211,102,0.13)", border: "1px solid rgba(37,211,102,0.45)", borderRadius: 12, padding: "9px 12px",
    }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: linked ? "#25D366" : "#128C4B", display: "grid", placeItems: "center", color: "#fff", fontSize: 13, flex: "none" }}>🟢</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {linked ? (
          <>
            <span style={{ display: "block", fontWeight: 800, fontSize: 13.5, color: T.ink }}>וואטסאפ מחובר ✓</span>
            <span style={{ display: "block", fontSize: 11.5, color: T.sub, direction: "ltr", textAlign: "right" }}>{mask}</span>
          </>
        ) : (
          <>
            <span style={{ display: "block", fontWeight: 800, fontSize: 13.5, color: T.ink }}>חברו וואטסאפ · +100 קרדיט</span>
            <span style={{ display: "block", fontSize: 11.5, color: T.sub }}>הבוט (רזיאל) יזהה אתכם — קוד אימות בוואטסאפ</span>
          </>
        )}
      </span>
      <span style={{ color: T.ink, fontWeight: 800, fontSize: 13, flex: "none" }}>{linked ? "נהל" : "חבר ←"}</span>
    </button>
  );
}

// 🧠 «המחקר שלי» בתוך האזור האישי — סביבת המחקר המלאה (אותם טאבים) *בפנים*, לא קישור החוצה.
// החלטת צוריאל (9.7.2026): סביבה אחת — פותחים את האזור האישי ⇒ המחקר בתוכו. אותו מפתח-טאב
// כמו הלשונית בדף-המספר (rw_hub_tab) ⇒ ההקשר נשמר במעבר (עיקרון «לא מאבדים Context»).
function DrawerResearch() {
  const [t, setT] = useState(() => { try { return localStorage.getItem("rw_hub_tab") || "saved"; } catch { return "saved"; } });
  const pick = x => { setT(x); try { localStorage.setItem("rw_hub_tab", x); } catch { /* noop */ } };
  return (
    <div style={RW_VARS}>
      <style>{rwCss()}</style>
      <ResearchCenter variant="context" tabbed activeTab={t} onTab={pick} />
    </div>
  );
}

// 🏛️ UserCenter — מרכז השליטה האישי. מגירה שמאלית אחת (overlay), זהה בטלפון ובמחשב.
// registry מודולרי: להוסיף אזור = רשומה במערך MODULES, בלי לגעת בשלד. עיצוב בהיר-מודרני
// (research_workspace_law) עם וריאנט כהה שנצמד למתג היום/לילה הגלובלי.

// ── פלטה מודרנית scoped (בהיר כברירת-מחדל, כהה נצמד לגלובלי) ──
const LIGHT = { bg: "#f6f7f9", card: "#ffffff", ink: "#1b1d22", sub: "#5b6472", line: "#e6e8ec", acc: "#2f6df6", accSoft: "#eaf1ff", gold: "#c79a2e", goldSoft: "#faf4e2" };
const DARK  = { bg: "#12141a", card: "#1b1e26", ink: "#eef0f4", sub: "#9aa2b1", line: "#2a2e38", acc: "#5b8cff", accSoft: "#1c2740", gold: "#d8b75e", goldSoft: "#2a2417" };

// 🌍 5 העולמות (personal_command_center_law) — מסגרת-על מעל אותם מודולים (עץ אחד: קיבוץ, לא שכתוב).
// כל מודול נושא world; הגריד מרונדר מקובץ לפי סדר זה. עולם ריק לא מוצג. writerOnly מוסתר ללא-כותבים.
const WORLDS = [
  { key: "me",        icon: "🌍", title: "העולם שלי",   sub: "הזהות, ההתקדמות והקרדיטים" },
  { key: "lab",       icon: "🔬", title: "המעבדה שלי",  sub: "מחקר, צפנים ורמזים" },
  { key: "agent",     icon: "🧬", title: "הסוכן האישי", sub: "מי שמכיר אותך — וואטסאפ ובוטים" },
  { key: "community", icon: "👥", title: "הקהילה שלי",  sub: "תרומות ודיון משותף" },
  { key: "create",    icon: "✍️", title: "היצירה שלי",  sub: "מה שכתבת ופרסמת", writerOnly: true },
];

// 🧠 «מה כדאי לי לעשות עכשיו?» — הכרטיס הראשון (personal_command_center_law: החוויה לפני התשתית).
// לא תפריט — כיוון. + badge יתרת-קרדיטים (בהרצה). מוקרן בראש האזור-האישי.
function NextActionCard({ T, dark, profile, myProfile, myLevel, nextActions, setActive, goto }) {
  const name = (profile?.display_name || profile?.username || "").trim().split(" ")[0] || "חוקר";
  const h = new Date().getHours();
  const greeting = h < 12 ? "בוקר טוב" : h < 18 ? "צהריים טובים" : "ערב טוב";
  const row = {
    display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "right",
    background: dark ? "#20242e" : "#f3f6ff", border: `1px solid ${T.line}`, borderRadius: 11,
    padding: "10px 12px", cursor: "pointer", color: T.ink, fontFamily: "inherit", fontSize: 13,
  };
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: "14px 15px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 15.5, fontWeight: 800 }}>🧠 {greeting}, {name}</span>
        {myProfile && (
          <button onClick={() => setActive("credits")} title="הקרדיטים שלי" style={{ marginInlineStart: "auto", background: T.goldSoft, color: T.gold, border: "none", cursor: "pointer", borderRadius: 999, fontSize: 11.5, fontWeight: 800, padding: "3px 10px", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            ◆ {(myProfile.credits || 0).toLocaleString("he-IL")}
          </button>
        )}
      </div>
      {/* 🌳 דרגת-חוקר — לחיצה פותחת «ההתקדמות שלי» */}
      {myLevel && (
        <button onClick={() => setActive("progress")} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "right", background: dark ? "#20242e" : "#f3f6ff", border: `1px solid ${T.line}`, borderRadius: 10, padding: "7px 11px", cursor: "pointer", color: T.ink, fontFamily: "inherit", margin: "6px 0 10px" }}>
          <span style={{ fontSize: 16 }}>{(LEVELS.find(l => l.n === myLevel.level) || {}).icon || "🌱"}</span>
          <span style={{ fontWeight: 800, fontSize: 12.5 }}>{myLevel.label}</span>
          <span style={{ fontSize: 11, color: T.sub }}>דרגה {myLevel.level}</span>
          {myLevel.next_label && <span style={{ marginInlineStart: "auto", fontSize: 11, color: T.acc, fontWeight: 700 }}>עוד {((myLevel.next_xp || 0) - (myLevel.xp || 0)).toLocaleString("he-IL")} XP ←</span>}
        </button>
      )}
      <div style={{ color: T.sub, fontSize: 12.5, marginBottom: 10 }}>מה כדאי לך לעשות עכשיו?</div>
      {nextActions == null ? (
        <div style={{ color: T.sub, fontSize: 12.5, padding: "4px 0" }}>טוען…</div>
      ) : nextActions.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {nextActions.map((a, i) => (
            <button key={i} onClick={() => a.module ? setActive(a.module) : goto(a.link)} style={row}>
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <span style={{ flex: 1 }}>{a.text}</span>
              <span style={{ color: T.acc, fontWeight: 800, whiteSpace: "nowrap" }}>{a.cta} ←</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.7 }}>
          עדיין לא התחלת לחקור — נסה מספר כמו <button onClick={() => goto("/number/1820")} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12.5 }}>1820 ←</button>, ואחזור עם המלצות אישיות.
        </div>
      )}
    </div>
  );
}

export default function UserCenter() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const P = usePalette();
  const nav = useNavigate();
  const { isOpen, active, open, close, setActive } = useUserCenter();
  const dark = P?.mode !== "light";
  const T = dark ? DARK : LIGHT;
  const [center, setCenter] = useState(null); // my_center RPC
  const [unread, setUnread] = useState(0);     // 🔔 התראות שלא-נקראו
  const [myProfile, setMyProfile] = useState(null); // 💰 קרדיטים/דרגה (beta)
  const [myLevel, setMyLevel] = useState(null);     // 🌳 דרגת-חוקר (מנוע-הגדילה)
  const [nextActions, setNextActions] = useState(null); // 🧠 «מה כדאי לעשות עכשיו»
  // 🪗 Progressive Disclosure (research_workspace_law: «פשוט בהתחלה») — עולמות-הליבה פתוחים,
  //    השאר מקופלים בהקשה (עם מונה + נקודת-פעילות). הבחירה נזכרת בין ביקורים.
  // 🪗 עולמות מקופלים כברירת-מחדל — «הבית» (HomeTiles) נותן את העיקר; העולמות = «עוד», נפתחים בהקשה.
  //    (מונע «קיר צ'יפים» למשתמש חדש. משתמש קיים שומר את בחירתו ב-localStorage.)
  const [openWorlds, setOpenWorlds] = useState(() => {
    try { const s = localStorage.getItem("uc_worlds_open"); if (s) return new Set(JSON.parse(s)); } catch { /* noop */ }
    return new Set();
  });
  const toggleWorld = (key) => setOpenWorlds(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key);
    try { localStorage.setItem("uc_worlds_open", JSON.stringify([...next])); } catch { /* noop */ }
    return next;
  });

  useEffect(() => {
    if (!isOpen || !user || !supabase) return;
    let alive = true;
    supabase.rpc("my_center").then(({ data }) => { if (alive) setCenter(data || {}); }).catch(() => {});
    getUnreadCount().then(c => { if (alive) setUnread(c); }).catch(() => {});
    // 🎁 מענק-מייסד ממתין + ☀️ קרדיט-יומי → נתבעים אוטומטית (idempotent), ואז טוענים את היתרה
    Promise.all([claimFoundingGrants(), claimDailyCredit(), claimWaActivityCredits()]).then(() => getMyProfile()).then(p => { if (alive) setMyProfile(p); }).catch(() => {});
    // 🌳 מנוע-הגדילה — מחשב ושומר דרגה/XP, ומזין את הצ׳יפ בכרטיס-הפתיחה
    getMyResearchLevel().then(l => { if (alive) setMyLevel(l); }).catch(() => {});
    return () => { alive = false; };
  }, [isOpen, user]);

  // 🧠 «הצעד הבא» — תלוי ב-center (משתמש ב-research_items שכבר נטען)
  useEffect(() => {
    if (!isOpen || !user || center == null) return;
    let alive = true;
    getNextActions({ center, profile }).then(a => { if (alive) setNextActions(a); }).catch(() => { if (alive) setNextActions([]); });
    return () => { alive = false; };
  }, [isOpen, user, center, profile]);

  // נעילת גלילה של הרקע כשהמגירה פתוחה
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!user) return null;
  const goto = (link) => { close(); if (link) nav(link); };
  const MODULES = buildModules({ T, user, profile, isAdmin, center, signOut, unread, onUnread: setUnread, goto, setActive });
  const activeMod = MODULES.find(m => m.id === active) || null;
  const initial = (profile?.display_name || profile?.username || user.email || "א").trim().charAt(0).toUpperCase();
  // 🪪 זהות: חוקר (is_researcher) · כותב (is_writer) — משולבים. אדמין גובר. (מקור-אמת: identityOf)
  const identityLabel = identityOf(center, isAdmin);

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
        <style>{`
          .uc-whd{border-radius:10px;transition:background .14s}
          .uc-whd:hover{background:${dark ? "#20242e" : "#f1f3f7"}}
          .uc-whd:active{background:${T.accSoft}}
          .uc-wgrid{animation:uc-in .2s ease both}
          @keyframes uc-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
        `}</style>
        {/* header */}
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${T.line}`, background: T.card }}>
          {/* 🧑 מיתוג האזור — «האזור האישי» = הזהות (איחוד האזורים, החלטת צוריאל 9.7.2026).
              המחקר חי בעולם נפרד («המחקר שלי» — הלשונית בדף המספר + /research); כאן רק מפנים אליו. */}
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".07em", color: T.gold, marginBottom: 10 }}>🧑 האזור האישי</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", flex: "none" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden",
                display: "grid", placeItems: "center", background: `linear-gradient(135deg,${T.acc},${T.gold})`,
                color: "#fff", fontWeight: 800, fontSize: 22, border: `2px solid ${T.card}`, boxShadow: `0 0 0 1px ${T.line}` }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
              </div>
              {/* 🟢 נקודת סטטוס-וואטסאפ על האווטאר */}
              <WaDot size={16} ring={T.card} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.display_name || profile?.username || "החוקר"}
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                {identityLabel}
              </div>
            </div>
            <button onClick={close} aria-label="סגור" style={{ background: "none", border: "none", color: T.sub, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
          {/* פס-סטטוס — נתונים אמיתיים בלבד (my_center). לחיצים → פותחים את המודול הרלוונטי. */}
          <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
            <Stat T={T} label="במחקר" val={center?.research_items ?? "—"} onClick={() => setActive("research")} />
            <Stat T={T} label="שמורים" val={center?.saved ?? "—"}
              onClick={() => { try { localStorage.setItem("rw_hub_tab", "saved"); } catch { /* noop */ } setActive("research"); }} />
            <Stat T={T} label="חיפושים" val={center?.searched ?? "—"} onClick={() => setActive("progress")} />
            {/* «פוסטים» מוצג רק למי שכתב פוסטים — גולש רגיל לא רואה «אפס פוסטים» */}
            {(center?.posts ?? 0) > 0 && <Stat T={T} label="פוסטים" val={center.posts} gold onClick={() => setActive("myposts")} />}
          </div>
          {/* 🟢 סטטוס וואטסאפ — גלוי מיד בכותרת; מנותק = CTA לחיבור, מחובר = ניהול */}
          <WaHeaderChip T={T} onOpen={() => setActive("whatsapp")} />
        </div>

        {/* body — grid של מודולים או מודול פעיל */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: 14 }}>
          {!activeMod ? (
            <>
              {/* 🏠 הבית — האריחים החשובים ביותר במקום אחד (מותאם לסוג-המשתמש), ואז «הצעד הבא». */}
              <HomeTiles T={T} center={center} setActive={setActive} dark={dark} />
              <NextActionCard T={T} dark={dark} profile={profile} myProfile={myProfile} myLevel={myLevel} nextActions={nextActions} setActive={setActive} goto={goto} />
              {/* 🌍 5 העולמות — קיבוץ המודולים. עולם ריק לא מוצג. */}
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", color: T.sub, margin: "6px 2px 9px" }}>עוד באזור האישי</div>
              {WORLDS.map(w => {
                // 🗺️ «מה בקרוב» (roadmap) לא אריח בין הפיצ׳רים החיים — מוצג כפוטר-דק בתחתית
                const mods = MODULES.filter(m => !m.hidden && m.id !== "roadmap" && (m.world || "me") === w.key);
                if (!mods.length) return null;
                const isOpen = openWorlds.has(w.key);
                const hasActivity = mods.some(m => m.badge != null);
                return (
                  <div key={w.key} style={{ marginBottom: 14 }}>
                    <button className="uc-whd" onClick={() => toggleWorld(w.key)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "right", background: "none", border: "none", cursor: "pointer", color: T.ink, fontFamily: "inherit", padding: "6px 6px", margin: "0 -4px 7px" }}>
                      <span style={{ fontSize: 15 }}>{w.icon}</span>
                      <span style={{ fontWeight: 800, fontSize: 14.5 }}>{w.title}</span>
                      <span style={{ fontSize: 11, color: T.sub }}>{w.sub}</span>
                      <span style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 7 }}>
                        {!isOpen && hasActivity && <span title="יש פעילות חדשה" style={{ width: 7, height: 7, borderRadius: "50%", background: T.acc }} />}
                        {!isOpen && <span style={{ fontSize: 11, fontWeight: 800, color: T.sub, background: T.accSoft, borderRadius: 999, padding: "1px 8px" }}>{mods.length}</span>}
                        <span style={{ fontSize: 12, color: T.sub, width: 12, textAlign: "center" }}>{isOpen ? "▴" : "▾"}</span>
                      </span>
                    </button>
                    {isOpen && (
                    <div className="uc-wgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {mods.map(m => (
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
                    )}
                  </div>
                );
              })}
              {/* 🗺️ מה בקרוב — פוטר דק בתחתית (מפת-הדרך, לא פיצ׳ר חי) */}
              <button className="uc-whd" onClick={() => setActive("roadmap")} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "right", background: "none", border: `1px dashed ${T.line}`, borderRadius: 12, padding: "11px 13px", cursor: "pointer", color: T.sub, fontFamily: "inherit", marginTop: 4 }}>
                <span style={{ fontSize: 16 }}>🗺️</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>מה בקרוב</span>
                <span style={{ fontSize: 11.5 }}>הארכיטקטורה המלאה שנבנית</span>
                <span style={{ marginInlineStart: "auto", color: T.acc, fontWeight: 800, fontSize: 12.5 }}>←</span>
              </button>
            </>
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

// 🪪 תווית-הזהות — מקור-אמת אחד (שימוש בכותרת וגם בפאנל-הפרופיל). אדמין גובר.
function identityOf(center, isAdmin) {
  if (isAdmin) return "👑 מנהל";
  const r = center?.is_researcher, w = center?.is_writer;
  if (r && w) return "🔬 חוקר · ✍️ כותב";
  if (r) return "🔬 חוקר היכל";
  if (w) return "✍️ כותב";
  return "חוקר רשום";
}

function Stat({ T, label, val, gold, onClick }) {
  const base = { flex: 1, textAlign: "center", background: gold ? T.goldSoft : T.accSoft, borderRadius: 11, padding: "7px 4px" };
  const inner = (
    <>
      <div style={{ fontWeight: 800, fontSize: 17, color: gold ? T.gold : T.acc }}>{typeof val === "number" ? val.toLocaleString("he") : val}</div>
      <div style={{ fontSize: 10.5, color: T.sub, marginTop: 1 }}>{label}</div>
    </>
  );
  if (!onClick) return <div style={base}>{inner}</div>;
  return (
    <button onClick={onClick} style={{ ...base, border: "none", cursor: "pointer", fontFamily: "inherit" }}>{inner}</button>
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

// 🤖 צוות הסוכנים — פאנל בהרצה (agents_team_law v2). לא רשימת בוטים אלא «צוות מחקר»:
// רוסטר חי מ-agent_identity · «מה למד» מ-agent_research_stats · מטטרון = שכבת-תזמור.
const LAYER_ICON = { orchestrator: "👑", expert: "🔬", interface: "💬", assistant: "🛠️" };
function AgentCard({ T, a, stats }) {
  const [open, setOpen] = useState(false);
  const isOrch = a.layer === "orchestrator";
  return (
    <div style={{ background: T.card, border: `1px solid ${isOrch ? T.gold : T.line}`, borderRadius: 12, padding: "11px 12px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{LAYER_ICON[a.layer] || "🤖"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5 }}>
            {a.name}
            {isOrch && <span style={{ marginInlineStart: 6, fontSize: 10.5, fontWeight: 800, color: T.gold, background: T.goldSoft, borderRadius: 999, padding: "1px 7px" }}>מתאם</span>}
            {a.phase === "beta" && <span style={{ marginInlineStart: 6, fontSize: 10, fontWeight: 700, color: T.sub, background: T.accSoft, borderRadius: 999, padding: "1px 7px" }}>לומד</span>}
          </div>
          <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.55, marginTop: 2 }}>{a.domain}</div>
        </div>
        {stats && stats.length > 0 && (
          <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, fontSize: 12, cursor: "pointer", padding: "2px 4px", whiteSpace: "nowrap" }}>{open ? "▴" : "▾ מה למד"}</button>
        )}
      </div>
      {open && stats && (
        <div style={{ marginTop: 9, borderTop: `1px solid ${T.line}`, paddingTop: 9, display: "grid", gap: 6 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <span style={{ color: T.sub }}>{s.label}</span>
              <span style={{ fontWeight: 800, color: T.ink, textAlign: "left" }}>{s.value != null ? s.value : (s.detail || "—")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function BotsTeamPanel({ T, goto }) {
  const [roster, setRoster] = useState(null);
  const [stats, setStats] = useState({});
  const [mem, setMem] = useState(null);
  useEffect(() => {
    let alive = true;
    getAgentRoster().then(r => { if (alive) setRoster(r); }).catch(() => { if (alive) setRoster([]); });
    getAgentStats().then(s => { if (alive) setStats(s); }).catch(() => {});
    // הזיכרון מפתוח לפי טלפון (agent_user_memory.user_ref) → עדשת get_my_wa_memory דרך wa_account_links.
    // ריק עד שהמשתמש מקשר וואטסאפ (מודול «הוואטסאפ שלי»).
    getMyWaMemory(8).then(m => { if (alive) setMem(m); }).catch(() => { if (alive) setMem([]); });
    return () => { alive = false; };
  }, []);
  // מטטרון ראשון, אחריו מומחים
  const ordered = (roster || []).slice().sort((a, b) => (b.layer === "orchestrator") - (a.layer === "orchestrator"));
  return (
    <div>
      <div style={{ background: T.goldSoft, border: `1px solid ${T.line}`, borderRadius: 12, padding: "11px 13px", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: T.gold }}>🔬 צוות המחקר שלך</div>
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, marginTop: 3 }}>כמה עוזרי-מחקר חכמים עובדים מאחורי הקלעים — כל אחד מתמחה בתחום אחר. ככל שתחקרו יותר, כך הם מכירים אתכם טוב יותר ועוזרים לגלות.</div>
      </div>
      {roster == null ? (
        <div style={{ color: T.sub, fontSize: 12.5, padding: "6px 0" }}>טוען…</div>
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {ordered.map(a => <AgentCard key={a.agent_id} T={T} a={a} stats={stats[a.agent_id]} />)}
        </div>
      )}
      {/* 🧠 מה הבוטים זוכרים עליי — פרטי (RLS own-read). מוצג רק אם יש. */}
      {mem && mem.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 7 }}>🧠 מה הצוות זוכר עליי <span style={{ fontSize: 10.5, fontWeight: 700, color: T.sub }}>(פרטי — רק אני רואה)</span></div>
          <div style={{ display: "grid", gap: 7 }}>
            {mem.map(m => (
              <div key={m.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 11px" }}>
                <div style={{ fontSize: 12.5, color: T.ink, lineHeight: 1.5 }}>{(m.topic ? m.topic + " — " : "") + (m.content || "").slice(0, 120)}</div>
                <div style={{ fontSize: 10.5, color: T.sub, marginTop: 3 }}>{m.agent}{m.memory_type ? " · " + m.memory_type : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>
        הצוות רק מתחיל להכיר אתכם — ככל שתחקרו, כך ייטב.{" "}
        <button onClick={() => goto("/contact")} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12.5 }}>יש שאלה או רעיון? כתבו לנו ←</button>
      </div>
    </div>
  );
}

// 🌳 הדרגה שלי — מנוע-הגדילה (my_research_level). דרגה + XP + מה מרכיב + הדרך קדימה.
const LEVELS = [
  { n: 1, icon: "🌱", label: "מתחיל" }, { n: 2, icon: "🌿", label: "חוקר מתעורר" },
  { n: 3, icon: "🔬", label: "חוקר" }, { n: 4, icon: "🎓", label: "חוקר בכיר" }, { n: 5, icon: "👑", label: "חוקר היכל" },
];
const PART_META = [
  ["posts", "📝 פוסטים שפרסמת"], ["gematria", "🧮 חיפושי גימטריה"], ["research", "🧠 פריטי מחקר"], ["days", "📅 ימים פעילים"],
  ["contrib", "🤝 תרומות שאושרו"], ["ai", "🤖 ניתוחי AI"], ["whatsapp", "💬 הודעות וואטסאפ"], ["referrals", "👥 חברים שהזמנת"],
];
function LevelPanel({ T }) {
  const [lv, setLv] = useState(undefined);
  useEffect(() => { getMyResearchLevel().then(setLv).catch(() => setLv(null)); }, []);
  if (lv === undefined) return <div style={{ color: T.sub, fontSize: 12.5, padding: "6px 0" }}>טוען…</div>;
  if (!lv) return <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.7 }}>התחילו לחקור — חיפוש, מחקר, שיתוף — והדרגה שלכם תיבנה כאן.</div>;
  const cur = LEVELS.find(l => l.n === lv.level) || LEVELS[0];
  const pct = lv.next_xp ? Math.min(100, Math.max(3, Math.round(((lv.xp - lv.floor) / (lv.next_xp - lv.floor)) * 100))) : 100;
  const toNext = lv.next_xp ? lv.next_xp - lv.xp : 0;
  return (
    <div>
      <div style={{ background: T.goldSoft, border: `1px solid ${T.line}`, borderRadius: 16, padding: "16px 15px", textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 34 }}>{cur.icon}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.gold, marginTop: 2 }}>{cur.label}</div>
        <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>דרגה {lv.level} מתוך 5 · {(lv.xp || 0).toLocaleString("he-IL")} XP</div>
        <div style={{ height: 9, background: T.card, borderRadius: 999, marginTop: 11, overflow: "hidden", border: `1px solid ${T.line}` }}>
          <div style={{ width: pct + "%", height: "100%", background: `linear-gradient(90deg,${T.acc},${T.gold})` }} />
        </div>
        <div style={{ fontSize: 11.5, color: T.sub, marginTop: 6 }}>
          {lv.next_label ? <>עוד <b style={{ color: T.acc }}>{toNext.toLocaleString("he-IL")} XP</b> עד «{lv.next_label}»</> : "הגעת לדרגה הגבוהה ביותר 👑"}
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 7 }}>מה בונה את הדרגה שלך</div>
      <div style={{ display: "grid", gap: 6 }}>
        {PART_META.map(([k, lbl]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 12.5, color: T.ink }}>{lbl}</span>
            <span style={{ fontWeight: 800, fontSize: 12.5, color: (lv.parts?.[k] || 0) > 0 ? T.ink : T.sub }}>{(lv.parts?.[k] || 0).toLocaleString("he-IL")}</span>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 800, fontSize: 13, margin: "16px 0 7px" }}>הדרך שלך</div>
      <div style={{ display: "grid", gap: 6 }}>
        {LEVELS.map(l => {
          const done = l.n < lv.level, here = l.n === lv.level;
          return (
            <div key={l.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 10,
              background: here ? T.accSoft : "transparent", border: `1px solid ${here ? T.acc : T.line}`, opacity: done ? 0.55 : 1 }}>
              <span style={{ fontSize: 17 }}>{l.icon}</span>
              <span style={{ flex: 1, fontWeight: here ? 800 : 600, fontSize: 13, color: T.ink }}>{l.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: done ? "#2e9e5b" : here ? T.acc : T.sub }}>{done ? "✓ הושלם" : here ? "אתם כאן" : "בהמשך"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ◆ הקרדיטים שלי — יתרה + ספר-תנועות (בהרצה). credit_ledger own-read.
const CREDIT_REASON = { founding_grant: "🏛️ מענק חוקר מייסד", wa_link: "🟢 חיבור וואטסאפ", wa_activity: "💬 הודעות בקבוצות", daily: "☀️ פעילות יומית", share: "🔗 שיתוף", referral: "👥 חבר שהזמנת נרשם", referral_welcome: "🎁 בונוס-קבלה", spend: "שימוש", earn: "צבירה" };
function CreditsPanel({ T }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { close } = useUserCenter();
  const [ledger, setLedger] = useState(null);
  const [profile, setProfile] = useState(null);
  const [invited, setInvited] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    getMyProfile().then(p => { if (alive) setProfile(p); }).catch(() => {});
    getMyCreditLedger(15).then(l => { if (alive) setLedger(l); }).catch(() => { if (alive) setLedger([]); });
    getMyReferralStats().then(s => { if (alive) setInvited(s?.invited ?? 0); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const inviteUrl = user ? `${typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il"}/?ref=${user.id}` : "";
  const inviteMsg = `בוא לגלות את הקוד שמאחורי המספרים ב-סוד 1820 👑\n${inviteUrl}`;
  const copyInvite = () => { try { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* noop */ } };
  return (
    <div>
      <div style={{ background: T.goldSoft, border: `1px solid ${T.line}`, borderRadius: 14, padding: "14px 15px", marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 11.5, color: T.sub, fontWeight: 700 }}>היתרה שלי · בהרצה</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: T.gold, marginTop: 2 }}>◆ {(profile?.credits || 0).toLocaleString("he-IL")}</div>
        <div style={{ fontSize: 11.5, color: T.sub, marginTop: 4, lineHeight: 1.6 }}>צוברים קרדיטים בפעילות באתר — ואפשר גם לרכוש חבילה בדף הקרדיטים.</div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 7 }}>תנועות אחרונות</div>
      {ledger == null ? (
        <div style={{ color: T.sub, fontSize: 12.5, padding: "6px 0" }}>טוען…</div>
      ) : ledger.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          {ledger.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.line}` }}>
              <span style={{ fontSize: 12.5, color: T.sub }}>{CREDIT_REASON[l.reason] || l.reason}</span>
              <span style={{ fontWeight: 800, color: l.amount >= 0 ? "#2e9e5b" : "#c0564a" }}>{l.amount >= 0 ? "+" : ""}{l.amount.toLocaleString("he-IL")}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.7 }}>עדיין אין תנועות. פעילות באתר תתחיל לצבור קרדיטים (בהרצה).</div>
      )}
      {/* 👥 הזמן חברים — צבירה אמיתית (הכי משתלמת) */}
      <div style={{ marginTop: 16, background: T.accSoft, border: `1px solid ${T.line}`, borderRadius: 14, padding: "13px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, color: T.acc }}>👥 הזמן חברים</span>
          {invited > 0 && <span style={{ marginInlineStart: "auto", fontSize: 11, fontWeight: 800, color: T.acc, background: T.card, borderRadius: 999, padding: "2px 9px" }}>{invited} הצטרפו</span>}
        </div>
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, margin: "5px 0 10px" }}>
          שתף את הקישור שלך — כל חבר שנרשם מזכה אותך ב-<b style={{ color: T.acc }}>100 קרדיטים</b>, והוא מקבל <b style={{ color: T.acc }}>50</b> לפתיחה.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={`https://wa.me/?text=${encodeURIComponent(inviteMsg)}`} target="_blank" rel="noreferrer"
            style={{ flex: 1, minWidth: 130, textAlign: "center", background: "#25D366", color: "#fff", borderRadius: 10, padding: "10px", fontWeight: 800, fontSize: 13, textDecoration: "none" }}>🟢 שתף בוואטסאפ</a>
          <button onClick={copyInvite} style={{ flex: 1, minWidth: 110, background: T.card, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{copied ? "✓ הועתק" : "📋 העתק קישור"}</button>
        </div>
      </div>

      {/* איך צוברים */}
      <div style={{ marginTop: 16, fontWeight: 800, fontSize: 13, marginBottom: 7 }}>איך צוברים</div>
      <div style={{ display: "grid", gap: 6 }}>
        {[["👥 חבר שהזמנת נרשם", "+100", "לכל חבר"], ["🔗 שיתוף", "+5", "עד 3 ליום"], ["🟢 חיבור וואטסאפ", "+100", "פעם אחת"], ["💬 הודעה בקבוצת וואטסאפ", "+3", "לכל הודעה"], ["☀️ כניסה יומית", "+5", "כל יום"], ["🏛️ מענק חוקר מייסד", "+5,000", "לחוקרים ותיקים"]].map(([k, v, note], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 12.5, color: T.ink, flex: 1 }}>{k}</span>
            <span style={{ fontSize: 10.5, color: T.sub }}>{note}</span>
            <span style={{ fontWeight: 800, color: "#2e9e5b", fontSize: 12.5, minWidth: 52, textAlign: "left" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* 💳 רכישת קרדיטים — מקור-אחד: דף הקרדיטים הקנוני (/credits), לא משטח-קנייה מקביל */}
      <div style={{ marginTop: 16, background: T.goldSoft, border: `1px solid ${T.line}`, borderRadius: 14, padding: "13px 14px" }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: T.gold, marginBottom: 4 }}>💳 רכישת קרדיטים</div>
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, marginBottom: 10 }}>חבילות ותשלום מאובטח (ביט / העברה) בדף הקרדיטים.</div>
        <button onClick={() => { try { close?.(); } catch { /* noop */ } nav("/credits"); }}
          style={{ display: "block", width: "100%", boxSizing: "border-box", textAlign: "center", background: T.gold, color: "#1a0e00", border: "none", borderRadius: 10, padding: "11px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>💎 לרכישת קרדיטים ←</button>
      </div>
    </div>
  );
}

// ── 🟢 הוואטסאפ שלי — חיבור מאומת (OTP) בין החשבון למספר הוואטסאפ ──
// למה: הבוט (רזיאל) והסוכן האישי מזהים אותך לפי מספר הטלפון. חיבור מאומת = הזיכרון
// והשיחות שלך בוואטסאפ מתחברים לפרופיל כאן. אימות-בעלות חובה (קוד נשלח בוואטסאפ) —
// לא מניחים שמספר שייך לך בלי הוכחה. עובד לכל מספר, גם אם עוד לא דיברת עם הבוט.
const WA_ERR = {
  auth_required: "צריך להיות מחובר לחשבון.",
  bad_phone: "מספר לא תקין — בדוק והזן שוב.",
  phone_taken: "המספר הזה כבר מקושר לחשבון אחר.",
  rate_limited: "יותר מדי בקשות. נסה שוב בעוד שעה.",
  no_code: "לא נמצא קוד פעיל — בקש קוד חדש.",
  expired: "הקוד פג תוקף — בקש קוד חדש.",
  too_many_attempts: "יותר מדי ניסיונות — בקש קוד חדש.",
  wrong_code: "קוד שגוי. נסה שוב.",
  no_client: "אין חיבור לשרת כרגע.",
};
function waErr(e) { return WA_ERR[e] || "משהו השתבש. נסה שוב."; }

function WhatsAppPanel({ T, goto, setActive }) {
  const [linked, setLinked] = useState(null);   // רשימת טלפונים מקושרים
  const [mem, setMem] = useState(null);          // 🧬 מה הסוכן כבר יודע (get_my_wa_memory)
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("idle");      // idle | code_sent
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);          // {kind:'ok'|'err', text}
  const [masked, setMasked] = useState("");

  const reload = useCallback(() => {
    getMyLinkedPhones().then(l => {
      setLinked(l);
      if (Array.isArray(l) && l.length) getMyWaMemory(6).then(setMem).catch(() => setMem([]));
      else setMem([]);
    }).catch(() => setLinked([]));
  }, []);
  useEffect(() => { reload(); }, [reload]);

  async function sendCode() {
    if (busy) return;
    setMsg(null); setBusy(true);
    const r = await requestWaLinkCode(phone);
    setBusy(false);
    if (r.already_linked) { setMsg({ kind: "ok", text: "המספר כבר מקושר לחשבון שלך ✓" }); reload(); return; }
    if (!r.ok) { setMsg({ kind: "err", text: waErr(r.error) }); return; }
    setMasked(r.masked || "");
    setStep("code_sent");
    setMsg({ kind: "ok", text: "שלחנו קוד בן 6 ספרות בוואטסאפ. הזן אותו כאן." });
  }
  async function verify() {
    if (busy) return;
    setMsg(null); setBusy(true);
    const r = await verifyWaLinkCode(phone, code);
    setBusy(false);
    if (!r.ok) { setMsg({ kind: "err", text: waErr(r.error) }); return; }
    setMsg({ kind: "ok", text: "🎉 הוואטסאפ חובר בהצלחה! מעכשיו הבוט מזהה אותך." });
    setStep("idle"); setPhone(""); setCode(""); setMasked("");
    reload();
    try { window.dispatchEvent(new Event("sod:wa-changed")); } catch { /* noop */ } // עדכון הנקודה/צ'יפ חי
  }

  const input = {
    width: "100%", boxSizing: "border-box", background: T.card, color: T.ink,
    border: `1px solid ${T.line}`, borderRadius: 10, padding: "11px 12px",
    fontSize: 16 /* ≥16 כדי למנוע zoom אוטומטי באייפון */, fontFamily: "inherit", direction: "ltr", textAlign: "center",
  };
  const btn = (bg, disabled) => ({
    width: "100%", background: disabled ? T.line : bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "12px", fontWeight: 800, fontSize: 14.5,
    cursor: disabled ? "default" : "pointer", fontFamily: "inherit", marginTop: 10,
  });

  return (
    <div>
      {/* למה זה חשוב */}
      <div style={{ background: "#e9f9ef", border: "1px solid #bfe9cd", borderRadius: 12, padding: "11px 13px", marginBottom: 13 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1a7f37" }}>🟢 חבר את החשבון שלך לבוט רזיאל</div>
        <div style={{ fontSize: 12.5, color: "#2f6b46", lineHeight: 1.6, marginTop: 3 }}>
          כשמחברים, הבוט של סוד 1820 (רזיאל) והסוכן האישי מזהים אותך — הרמזים והשיחות שלך בוואטסאפ מתחברים לפרופיל כאן. שולחים לך קוד בוואטסאפ לאימות שהמספר באמת שלך.
          <span style={{ display: "block", marginTop: 5, opacity: .85 }}>💡 זהו החיבור האישי שלך לבוט — לא קבוצת-וואטסאפ ולא הפיד של דף-כתב.</span>
        </div>
      </div>

      {/* מספרים מקושרים */}
      {linked && linked.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 7 }}>מקושרים לחשבון שלי</div>
          <div style={{ display: "grid", gap: 7 }}>
            {linked.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 12px" }}>
                <span style={{ fontSize: 15 }}>🟢</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, direction: "ltr", textAlign: "left" }}>+{l.phone}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#1a7f37", background: "#e6f4ea", borderRadius: 999, padding: "2px 9px" }}>מחובר ✓</span>
                <button onClick={async () => { if (busy) return; setBusy(true); await unlinkMyWa(l.phone); setBusy(false); reload(); try { window.dispatchEvent(new Event("sod:wa-changed")); } catch { /* noop */ } }}
                  disabled={busy} title="נתק מספר זה"
                  style={{ background: "none", border: "none", color: T.sub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "0 2px", fontFamily: "inherit" }}>נתק</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🧬 הסוכן כבר מכיר אותך — תגמול על החיבור (מזכיר שהזיכרון נפתח) */}
      {linked && linked.length > 0 && mem && mem.length > 0 && (
        <div style={{ background: T.accSoft, border: `1px solid ${T.line}`, borderRadius: 12, padding: "11px 13px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 15 }}>🧬</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: T.acc }}>הסוכן האישי כבר מכיר אותך</span>
            <span style={{ marginInlineStart: "auto", fontSize: 11, fontWeight: 800, color: T.acc, background: T.card, borderRadius: 999, padding: "2px 9px" }}>{mem.length}+ דברים</span>
          </div>
          <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.55, marginTop: 6 }}>
            «{((mem[0].topic ? mem[0].topic + " — " : "") + (mem[0].content || "")).slice(0, 90)}…»
          </div>
          {setActive && (
            <button onClick={() => setActive("bots")} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, cursor: "pointer", padding: "6px 0 0", fontFamily: "inherit", fontSize: 12.5 }}>🧠 מה הבוטים זוכרים עליי ←</button>
          )}
        </div>
      )}

      {/* טופס חיבור */}
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
        {linked && linked.length ? "חיבור מספר נוסף" : "חיבור מספר וואטסאפ"}
      </div>

      {step === "idle" ? (
        <>
          <input dir="ltr" inputMode="tel" type="tel" placeholder="05X-XXX-XXXX" value={phone}
            onChange={e => setPhone(e.target.value)} style={input} />
          <button onClick={sendCode} disabled={busy || phone.replace(/\D/g, "").length < 9} style={btn("#25D366", busy || phone.replace(/\D/g, "").length < 9)}>
            {busy ? "שולח…" : "📩 שלח לי קוד בוואטסאפ"}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 8, lineHeight: 1.6 }}>
            שלחנו קוד למספר {masked ? <b dir="ltr" style={{ direction: "ltr" }}>+{masked}</b> : "שלך"}. לא הגיע? ייתכן שהמספר לא רשום בוואטסאפ — {" "}
            <button onClick={() => { setStep("idle"); setCode(""); setMsg(null); }} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12.5 }}>שנה מספר</button>.
          </div>
          <input dir="ltr" inputMode="numeric" type="text" maxLength={6} placeholder="––––––" value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))} style={{ ...input, letterSpacing: "0.4em", fontSize: 22, fontWeight: 800 }} />
          <button onClick={verify} disabled={busy || code.length < 4} style={btn(T.acc, busy || code.length < 4)}>
            {busy ? "מאמת…" : "✅ אמת וחבר"}
          </button>
          <button onClick={sendCode} disabled={busy} style={{ width: "100%", background: "none", border: "none", color: T.sub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginTop: 8, fontFamily: "inherit" }}>שלח קוד שוב</button>
        </>
      )}

      {msg && (
        <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, lineHeight: 1.6, borderRadius: 10, padding: "9px 12px",
          background: msg.kind === "ok" ? "#e9f9ef" : "#fdecea", color: msg.kind === "ok" ? "#1a7f37" : "#b3261e",
          border: `1px solid ${msg.kind === "ok" ? "#bfe9cd" : "#f5c6c0"}` }}>
          {msg.text}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 11.5, color: T.sub, lineHeight: 1.7 }}>
        🔒 המספר נשמר מאובטח ומשמש רק לזיהוי מול הבוט. תוכל לנתק בכל עת.{" "}
        <button onClick={() => goto("/contact")} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 11.5 }}>שאלה? דבר איתנו ←</button>
      </div>
    </div>
  );
}

// 👑 «הדף הפומבי שלי» — הגשר בין הקוקפיט הפרטי (המגירה) לפנים הפומביות (דף-הכתב).
//    המודל הפשוט: אני → האזור האישי → הדף שלי → צפה / ערוך. «צפה» = תצוגה ציבורית מדויקת
//    (?view=public, בלי כלי-בעלים); «ערוך» = הדף שלי עם כלי-הבעלים (השער ל-Editor העתידי).
function PublicPageCard({ T, goto }) {
  const bBase = { width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, borderRadius: 11, padding: "13px 16px", minHeight: 48, marginBottom: 10 };
  return (
    <div>
      <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.75, marginBottom: 15 }}>
        המודל פשוט: <b style={{ color: T.ink }}>אני → האזור האישי → הדף שלי → צפה / ערוך</b>.<br />הדף הפומבי הוא בדיוק מה שכל מבקר רואה — לא גרסה מיוחדת.
      </div>
      <button onClick={() => goto("/community/researcher/me?view=public")} style={{ ...bBase, background: T.acc, color: "#fff", border: "none" }}>
        👁 צפה בדף כפי שהציבור רואה
      </button>
      <button onClick={() => goto("/community/researcher/me")} style={{ ...bBase, background: "transparent", color: T.ink, border: `1px solid ${T.line}` }}>
        ✍️ ערוך את הדף שלי
      </button>
      <div style={{ fontSize: 11.5, color: T.sub, marginTop: 4, lineHeight: 1.65 }}>
        «צפה» = תצוגה ציבורית מדויקת (בלי כלי-עריכה). «ערוך» = הדף שלך עם כלי-הבעלים; עורך-הדף המלא בדרך.
      </div>
    </div>
  );
}

// 🎨 עורך-הדף — «ערוך את הדף שלי» תחת ✍️ היצירה. כותב/קורא update_my_page_config (RPC חי, allowlist).
//    ה-allowlist כאן חייב להתאים במדויק ל-RPC אחרת השמירה נדחית. accent/emblem/bio מסונכרנים לעמודות.
const PE_ACCENTS = ['#9c7a1e','#b07d16','#7a52c8','#127f70','#3f8a2f','#c0453c','#9a6a12','#1f6f9c','#8a6a1c','#8a5a2a','#2b6f9c','#d4af37'];
const PE_EMBLEMS = ['👑','✦','🔤','🔠','🔢','📅','🌅','🕰️','📜','🛸','🔡','✡️','🧭','🔬','🧠','🧩','📖','📊','💎','🌍','🔍','🕯️','📚','✨','🌊','🔥','🎬','⭐'];
const PE_SECTIONS = [
  { id: 'highlights',       label: '⭐ מובחרים (בראש)' },
  { id: 'verified_gematrias', label: '🔢 הגימטריות המאומתות' },
  { id: 'events',           label: '📅 ציר פעילות ואירועים' },
  { id: 'posts',            label: '📝 הפוסטים שלי' },
  { id: 'convergences',     label: '🎯 התכנסויות' },
  { id: 'featured_gallery', label: '🖼️ גלריה מוצגת' },
  { id: 'forum',            label: '💬 דיונים ופורום' },
  { id: 'dossier',          label: '📁 תיק החוקר' },
  { id: 'links',            label: '🔗 קישורים חיצוניים' },
];
function PageEditor({ T, goto }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [accent, setAccent] = useState("");
  const [emblem, setEmblem] = useState("");
  const [bio, setBio] = useState("");
  const [sections, setSections] = useState(PE_SECTIONS.map(s => ({ id: s.id, visible: true })));
  const [links, setLinks] = useState([]);
  const [highlights, setHighlights] = useState([]); // נשמר כפי-שהוא (עריכת-מובחרים בגרסה נפרדת)

  useEffect(() => {
    let a = true;
    if (!user?.id) { setLoaded(true); return; }
    supabase.from("contributors").select("page_config,accent,emblem,bio").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!a) return;
        const pc = data?.page_config || {};
        setAccent(pc.accent || data?.accent || "");
        setEmblem(pc.emblem || data?.emblem || "");
        setBio(pc.bio || data?.bio || "");
        setHighlights(Array.isArray(pc.highlights) ? pc.highlights : []);
        setLinks(Array.isArray(pc.links) ? pc.links : []);
        // ממזגים סדר/נראות שמורים עם ברירת-המחדל, כדי שמדור חדש לא ייעלם
        const saved = Array.isArray(pc.sections) ? pc.sections : [];
        const byId = Object.fromEntries(saved.map(s => [s.id, s]));
        const ordered = [
          ...saved.filter(s => PE_SECTIONS.some(d => d.id === s.id)).map(s => ({ id: s.id, visible: s.visible !== false })),
          ...PE_SECTIONS.filter(d => !byId[d.id]).map(d => ({ id: d.id, visible: true })),
        ];
        setSections(ordered);
        setLoaded(true);
      })
      .catch(() => { if (a) setLoaded(true); });
    return () => { a = false; };
  }, [user?.id]);

  const labelOf = id => (PE_SECTIONS.find(s => s.id === id)?.label || id);
  const move = (i, dir) => setSections(prev => {
    const n = [...prev]; const j = i + dir; if (j < 0 || j >= n.length) return prev;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const toggle = i => setSections(prev => prev.map((s, k) => k === i ? { ...s, visible: !s.visible } : s));
  const addLink = () => setLinks(prev => prev.length >= 6 ? prev : [...prev, { label: "", url: "" }]);
  const setLink = (i, k, v) => setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const rmLink = i => setLinks(prev => prev.filter((_, idx) => idx !== i));

  async function save() {
    setBusy(true); setMsg(null);
    const p_config = {
      version: 1,
      accent: accent || undefined,
      emblem: emblem || undefined,
      bio: bio?.trim() || undefined,
      sections,
      highlights,
      links: links.filter(l => l.label?.trim() && l.url?.trim()).map(l => ({ label: l.label.trim(), url: l.url.trim() })),
    };
    try {
      const { data, error } = await supabase.rpc("update_my_page_config", { p_config });
      if (error || !data?.ok) {
        const e = data?.error || "";
        setMsg({ kind: "err", text: e === "bio_too_long" ? "הביו ארוך מדי (עד 600 תווים)." : e.startsWith("bad_link") ? "קישור לא תקין — בדקו כותרת (עד 40) וכתובת (https:// או /)." : "שמירה נכשלה. נסו שוב." });
      } else {
        setMsg({ kind: "ok", text: "נשמר! הדף שלך עודכן ✓" });
      }
    } catch { setMsg({ kind: "err", text: "שגיאת רשת, נסו שוב." }); }
    setBusy(false);
  }

  if (!loaded) return <div style={{ color: T.sub, fontSize: 13, padding: "10px 0" }}>טוען…</div>;

  const chip = { border: `1px solid ${T.line}`, borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", background: T.bg, color: T.ink, fontFamily: "inherit" };
  const H = ({ children }) => <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, margin: "16px 0 8px" }}>{children}</div>;
  const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, background: T.bg, border: `1px solid ${T.line}`, color: T.ink, fontFamily: "inherit", fontSize: 16, outline: "none" };

  return (
    <div>
      <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.7, marginBottom: 6 }}>
        עצב את הדף הפומבי שלך. השינויים נשמרים ומופיעים לכל מבקר.{" "}
        <button onClick={() => goto("/community/researcher/me?view=public")} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12.5 }}>👁 תצוגה מקדימה ←</button>
      </div>

      <H>🎨 צבע-נושא</H>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PE_ACCENTS.map(hex => (
          <button key={hex} onClick={() => setAccent(hex)} title={hex}
            style={{ width: 30, height: 30, borderRadius: "50%", background: hex, cursor: "pointer",
              border: accent === hex ? `3px solid ${T.ink}` : `2px solid ${T.line}`, boxShadow: accent === hex ? `0 0 0 2px ${hex}55` : "none" }} />
        ))}
      </div>

      <H>✦ סמל</H>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PE_EMBLEMS.map(e => (
          <button key={e} onClick={() => setEmblem(emblem === e ? "" : e)}
            style={{ ...chip, padding: "5px 9px", fontSize: 17, background: emblem === e ? T.accSoft : T.bg, borderColor: emblem === e ? T.acc : T.line }}>{e}</button>
        ))}
      </div>

      <H>📝 ביו קצר (עד 600 תווים)</H>
      <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 600))} rows={3}
        placeholder="כמה מילים עליך ועל המחקר שלך…" style={{ ...input, resize: "vertical", minHeight: 64 }} />
      <div style={{ fontSize: 11, color: T.sub, textAlign: "end", marginTop: 3 }}>{bio.length}/600</div>

      <H>📑 מדורים — סדר ונראות</H>
      <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 8 }}>הזז מדור למעלה/למטה או הסתר אותו מהדף שלך (מדור מוסתר לא נעלם — פשוט לא מוצג).</div>
      <div style={{ display: "grid", gap: 6 }}>
        {sections.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 10px" }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: s.visible ? T.ink : T.sub, opacity: s.visible ? 1 : .6 }}>{labelOf(s.id)}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...chip, padding: "4px 9px", opacity: i === 0 ? .4 : 1 }}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} style={{ ...chip, padding: "4px 9px", opacity: i === sections.length - 1 ? .4 : 1 }}>↓</button>
            <button onClick={() => toggle(i)} style={{ ...chip, padding: "4px 11px", background: s.visible ? T.accSoft : T.bg, borderColor: s.visible ? T.acc : T.line, color: s.visible ? T.acc : T.sub }}>{s.visible ? "מוצג" : "מוסתר"}</button>
          </div>
        ))}
      </div>

      <H>🔗 קישורים חיצוניים (עד 6)</H>
      <div style={{ display: "grid", gap: 8 }}>
        {links.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
            <input value={l.label} onChange={e => setLink(i, "label", e.target.value)} placeholder="כותרת" style={{ ...input, fontSize: 14 }} />
            <input value={l.url} onChange={e => setLink(i, "url", e.target.value)} placeholder="https://…" dir="ltr" style={{ ...input, fontSize: 14 }} />
            <button onClick={() => rmLink(i)} style={{ ...chip, padding: "8px 11px", color: "#c0453c" }}>✕</button>
          </div>
        ))}
        {links.length < 6 && <button onClick={addLink} style={{ ...chip, justifySelf: "start" }}>➕ הוסף קישור</button>}
      </div>

      {msg && (
        <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, lineHeight: 1.6, borderRadius: 10, padding: "9px 12px",
          background: msg.kind === "ok" ? "#e9f9ef" : "#fdecea", color: msg.kind === "ok" ? "#1a7f37" : "#b3261e", border: `1px solid ${msg.kind === "ok" ? "#bfe9cd" : "#f5c6c0"}` }}>
          {msg.text}
        </div>
      )}
      <button onClick={save} disabled={busy} style={{ width: "100%", marginTop: 14, background: T.acc, color: "#fff", border: "none", borderRadius: 11, padding: "13px 16px", minHeight: 48, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? .7 : 1 }}>
        {busy ? "שומר…" : "💾 שמור את הדף שלי"}
      </button>
    </div>
  );
}

// 🪪 הפרטים שלי (הועבר מ-/profile) — שם מלא + תאריך-לידה (save_my_info). פרטי; פותח ניתוח-שם + רזיאל.
function MyInfoPanel({ T }) {
  const nav = useNavigate();
  const { close } = useUserCenter();
  const [name, setName] = useState(""); const [bdate, setBdate] = useState("");
  const [busy, setBusy] = useState(false); const [note, setNote] = useState(""); const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let a = true;
    supabase.from("profiles").select("full_name, birth_date").maybeSingle()
      .then(({ data }) => { if (!a) return; setName(data?.full_name || ""); setBdate(data?.birth_date || ""); setLoaded(true); })
      .catch(() => { if (a) setLoaded(true); });
    return () => { a = false; };
  }, []);
  async function save() {
    setBusy(true); setNote("");
    try { const { data } = await supabase.rpc("save_my_info", { p_full_name: name.trim() || null, p_birth_date: bdate || null }); setNote(data?.ok ? "✓ נשמר — רזיאל מכיר אותך עכשיו" : "לא נשמר — נסו שוב"); }
    catch { setNote("שגיאה — נסו שוב"); }
    setBusy(false);
  }
  const input = { width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10, background: T.bg, border: `1px solid ${T.line}`, color: T.ink, fontFamily: "inherit", fontSize: 16, outline: "none" };
  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>🪪</span>
        <span style={{ color: T.ink, fontWeight: 800, fontSize: 14.5 }}>הפרטים שלי</span>
        <span style={{ marginInlineStart: "auto", color: T.sub, fontSize: 11 }}>פרטי · רק אתה</span>
      </div>
      <div style={{ color: T.sub, fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>השם ותאריך-הלידה פותחים ניתוח-שם אישי במנוע, ומאפשרים לרזיאל להכיר אותך.</div>
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 4 }}>שם מלא (פרטי — לניתוח-שם, לא מוצג בפומבי)</div>
          <input value={name} onChange={e => setName(e.target.value)} dir="rtl" placeholder="השם המלא שלי (שם + שם משפחה)" style={input} />
        </div>
        <div>
          <div style={{ color: T.sub, fontSize: 11.5, marginBottom: 4 }}>תאריך לידה</div>
          <input type="date" value={bdate || ""} onChange={e => setBdate(e.target.value)} style={{ ...input, direction: "ltr" }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={save} disabled={busy || !loaded} style={{ background: T.acc, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", opacity: (busy || !loaded) ? .6 : 1 }}>{busy ? "שומר…" : "שמור"}</button>
          {name.trim() && <button onClick={() => { close(); nav(`/name-lab?w=${encodeURIComponent(name.trim())}`); }} style={{ background: "none", border: `1px solid ${T.line}`, color: T.ink, borderRadius: 10, padding: "10px 16px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>🔮 נתח את השם שלי →</button>}
        </div>
        {note && <div style={{ color: T.ink, fontSize: 13, fontWeight: 700 }}>{note}</div>}
      </div>
    </div>
  );
}

// 🔔 התראות Push (הועבר מ-/profile) — מצב המכשיר + הפעלה/ביטול. סך-מנויים לאדמין בלבד.
function PushPanel({ T, user, isAdmin }) {
  const [status, setStatus] = useState(null); const [total, setTotal] = useState(null);
  const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
  const refreshCount = useCallback(async () => { if (!isAdmin) return; try { const { data } = await supabase.rpc("push_sub_count"); if (data && typeof data.total === "number") setTotal(data.total); } catch { /* noop */ } }, [isAdmin]);
  const refresh = useCallback(async () => { try { setStatus(await getPushStatus()); } catch { /* noop */ } refreshCount(); }, [refreshCount]);
  useEffect(() => { refresh(); }, [refresh]);
  async function toggle() {
    setNote(""); setBusy(true);
    try {
      if (status?.subscribed) { await disablePush(); setNote("ההרשמה בוטלה במכשיר זה."); }
      else { const r = await enablePush({ userId: user?.id || null, topics: [] }); setNote(!r.ok ? (r.reason === "denied" ? "הדפדפן חסם התראות — צריך לאשר בהגדרות האתר." : r.reason === "unsupported" ? "הדפדפן הזה לא תומך בהתראות." : "ההפעלה נכשלה.") : "נרשמת להתראות במכשיר זה ✦"); }
    } catch { setNote("שגיאה — נסו שוב."); }
    await new Promise(r => setTimeout(r, 600)); await refresh(); setBusy(false);
  }
  if (!PUSH_CONFIGURED) return null;
  const subscribed = !!status?.subscribed; const unsupported = status && !status.supported;
  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>🔔</span><span style={{ color: T.ink, fontWeight: 800, fontSize: 14.5 }}>התראות Push במכשיר זה</span>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 4, background: T.bg, border: `1px solid ${subscribed ? "#2e7d32" : T.line}`, borderRadius: 999, padding: "6px 15px", color: subscribed ? "#2e9e5b" : T.sub, fontWeight: 700, fontSize: 13 }}>
        {unsupported ? "⚠️ הדפדפן הזה לא תומך בהתראות" : subscribed ? "✅ רשום להתראות במכשיר זה" : "○ לא רשום במכשיר זה"}
      </div>
      {isAdmin && <div style={{ color: T.sub, fontSize: 12.5, marginTop: 8 }}>סך המנויים (אדמין): <b style={{ color: T.ink }}>{total ?? "…"}</b></div>}
      {!unsupported && (
        <div style={{ marginTop: 14 }}>
          <button onClick={toggle} disabled={busy} style={{ background: subscribed ? "transparent" : T.acc, color: subscribed ? T.ink : "#fff", border: subscribed ? `1px solid ${T.line}` : "none", borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", opacity: busy ? .6 : 1 }}>
            {busy ? "…" : subscribed ? "בטל הרשמה במכשיר זה" : "הפעל התראות במכשיר זה"}
          </button>
        </div>
      )}
      {note && <div style={{ color: T.ink, fontSize: 13, fontWeight: 700, marginTop: 12 }}>{note}</div>}
      <div style={{ color: T.sub, fontSize: 11.5, lineHeight: 1.65, marginTop: 12, opacity: .85 }}>💡 כל מכשיר/דפדפן נרשם בנפרד. באייפון נדרש להוסיף את האתר למסך-הבית לפני הרשמה.</div>
    </div>
  );
}

// 🕒 פעילות אישית אחרונה (הועבר מ-/profile) — חיפושי גימטריה + פוסטים שנגלשו (RLS פר-משתמש).
function RecentActivityPanel({ T }) {
  const nav = useNavigate(); const { close } = useUserCenter();
  const [searches, setSearches] = useState(null); const [posts, setPosts] = useState(null);
  useEffect(() => {
    let a = true;
    getUserActivity(["gematria"], 8).then(d => { if (a) setSearches(d); }).catch(() => {});
    getUserActivity(["post"], 6).then(d => { if (a) setPosts(d); }).catch(() => {});
    return () => { a = false; };
  }, []);
  const go = (to) => { close(); nav(to); };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 999, padding: "6px 12px", color: T.ink, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 };
  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>🕒</span><span style={{ color: T.ink, fontWeight: 800, fontSize: 14.5 }}>הפעילות האחרונה שלי</span>
      </div>
      <div style={{ color: T.sub, fontSize: 12, marginBottom: 6 }}>🔢 חיפושי גימטריה</div>
      {searches === null ? <div style={{ color: T.sub, fontSize: 12.5 }}>טוען…</div>
        : searches.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{searches.map((s, i) => <button key={i} onClick={() => go(`/beit-midrash?w=${encodeURIComponent(s.ref)}`)} style={chip}><span>{s.ref}</span>{s.title ? <span style={{ color: T.sub, fontSize: 11.5 }}>= {s.title}</span> : null}</button>)}</div>
        : <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.6 }}>כל חיפוש בבית המדרש יופיע כאן.</div>}
      <div style={{ color: T.sub, fontSize: 12, margin: "14px 0 6px" }}>📜 פוסטים שגלשת בהם</div>
      {posts === null ? <div style={{ color: T.sub, fontSize: 12.5 }}>טוען…</div>
        : posts.length ? <div style={{ display: "grid", gap: 2 }}>{posts.map((p, i) => <button key={i} onClick={() => go(`/${p.ref}`)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "none", border: "none", borderBottom: `1px solid ${T.line}`, padding: "8px 2px", color: T.ink, fontFamily: "inherit", fontSize: 13.5, textAlign: "start" }}><span>›</span><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || p.ref}</span></button>)}</div>
        : <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.6 }}>הפוסטים שתקרא יופיעו כאן.</div>}
    </div>
  );
}

// 🟢 מחוברים עכשיו (הועבר מ-/profile) — מונה חי, אדמין בלבד. משתמש בו-Presence הגלובלי.
function AdminOnlinePanel({ T }) {
  const { total, members, guests } = useSiteOnline();
  const stat = (n, label, dot) => (
    <div style={{ flex: 1, minWidth: 84, textAlign: "center", background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
        <span style={{ color: T.ink, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{n}</span>
      </div>
      <div style={{ color: T.sub, fontSize: 11, marginTop: 5 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>🟢</span><span style={{ color: T.ink, fontWeight: 800, fontSize: 14.5 }}>מחוברים עכשיו</span>
        <span style={{ marginInlineStart: "auto", color: T.sub, fontSize: 10.5, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 999, padding: "2px 9px" }}>LIVE · אדמין</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>{stat(total, "סה״כ", "#5bd16a")}{stat(members, "מחוברים", "#f0c14b")}{stat(guests, "אורחים", "#7bb7ff")}</div>
    </div>
  );
}

// 📨 הודעות — המקום היחיד העתידי לכל ההודעות (placeholder; המערכת עצמה עדיין לא נבנתה).
function MessagesPlaceholder({ T }) {
  return (
    <div>
      <div style={{ background: T.accSoft, border: `1px solid ${T.line}`, borderRadius: 14, padding: "16px 15px", textAlign: "center" }}>
        <div style={{ fontSize: 30 }}>📨</div>
        <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>ההודעות שלי — בקרוב</div>
        <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.7, marginTop: 6 }}>
          כאן יתרכזו <b>כל</b> ההודעות שלך במקום אחד — בלי לחפש בכמה מסכים:
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {[["✉️", "הודעות לכתב", "מישהו כתב לך ישירות"], ["💬", "הודעות פרטיות (DM)", "שיחה בינך לבין משתמש אחר"], ["🗣", "תגובות ודיונים אליי", "מה שכתבו על מחקר/פוסט שלך"]].map(([e, t, s], i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "11px 13px" }}>
            <span style={{ fontSize: 18 }}>{e}</span>
            <div><div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{t}</div><div style={{ color: T.sub, fontSize: 11.5, lineHeight: 1.5 }}>{s}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 🏠 «הבית» של המגירה — האריחים החשובים ביותר במקום אחד (5–10 שניות: מי אני · הדף שלי · המחקר
//    שלי · הודעות · קרדיטים · התראות). לא מסך/עולם חדש — סקשן בראש ה-Home. מותאם לסוג-המשתמש.
const HOME_TILE = {
  profile:       { icon: "👤", title: "החשבון שלי",   sub: "מי אני והפרטים שלי" },
  "public-page": { icon: "👑", title: "הדף שלי",      sub: "מה שהעולם רואה" },
  research:      { icon: "🧠", title: "המחקר שלי",    sub: "מחקר · שמורים · צפנים" },
  myposts:       { icon: "✍️", title: "היצירה שלי",   sub: "הפוסטים שכתבתי" },
  messages:      { icon: "📨", title: "ההודעות שלי",  sub: "הודעות ותגובות אליי", soon: true },
  notifications: { icon: "🔔", title: "התראות",       sub: "מה חדש עבורי" },
  credits:       { icon: "◆",  title: "קרדיטים",      sub: "היתרה שלי" },
  whatsapp:      { icon: "🟢", title: "החיבור לרזיאל", sub: "חיבור החשבון לבוט בוואטסאפ" },
};
function HomeTiles({ T, center, setActive, dark }) {
  const c = center || {};
  const hasPage = !!(c.has_dossier || c.is_writer || c.is_publisher || c.is_researcher);
  const isWriter = !!(c.is_writer || c.is_publisher);
  const ids = ["profile"];
  if (hasPage) ids.push("public-page");
  ids.push("research");
  if (isWriter) ids.push("myposts", "messages");
  ids.push("notifications", "credits", "whatsapp");
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", color: T.sub, margin: "2px 2px 9px" }}>הדברים שלי</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ids.map(id => {
          const t = HOME_TILE[id]; if (!t) return null;
          return (
            <button key={id} onClick={() => setActive(id)} style={{
              textAlign: "right", background: T.card, border: `1px solid ${T.line}`, borderTop: `3px solid ${T.acc}`,
              borderRadius: 14, padding: "12px 13px", cursor: "pointer", position: "relative", minHeight: 78,
              display: "flex", flexDirection: "column", gap: 3, color: T.ink, fontFamily: "inherit" }}>
              <span style={{ fontSize: 21 }}>{t.icon}</span>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>{t.title}</span>
              <span style={{ color: T.sub, fontSize: 11, lineHeight: 1.4 }}>{t.sub}</span>
              {t.soon && <span style={{ position: "absolute", top: 10, left: 10, background: dark ? "#2a2e38" : "#eef0f2", color: T.sub, borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>בקרוב</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ה-registry: 22 מודולים. live = פאנל אמיתי · soon = התוכנית האמיתית ──
// כל render() הוא פאנל עצמאי (לא תלוי בשלד המגירה) → אפשר לרנדר אותו בעתיד גם
// במסך-מלא (/me/:module) עם אותו registry, בלי לגעת ב-UserCenter. לכן buildModules מיוצא.
export function buildModules({ T, user, profile, isAdmin, center, signOut, unread = 0, onUnread, goto, setActive }) {
  const c = center || {};
  const isWriter = !!(c.is_writer || c.is_publisher);
  // 👑 «הדף הפומבי שלי» מוצג רק למי שיש לו דף-כתב/תורם (has_dossier) או שהוא כותב/חוקר.
  //    קורא רגיל לא רואה. הופך לכתב/תורם → hasPage=true → הכרטיס חוזר אוטומטית (לא נמחק).
  const hasPage = !!(c.has_dossier || c.is_writer || c.is_publisher || c.is_researcher);
  return [
    // ─── LIVE — פאנלים אמיתיים עם נתונים · world = שיוך לאחד מ-5 העולמות ───
    { id: "notifications", world: "me", icon: "🔔", title: "ההתראות שלי", status: "live", badge: unread || undefined,
      render: () => <div><NotificationsPanel T={T} onUnread={onUnread} goto={goto} /><PushPanel T={T} user={user} isAdmin={isAdmin} /></div> },
    // 👑 הגשר לפנים הפומביות — «הדף הפומבי שלי» (צפה / ערוך). מוצג רק למי שיש לו דף (hasPage).
    { id: "public-page", world: "me", icon: "👑", title: "הדף הפומבי שלי", status: "live", hidden: !hasPage, render: () => <PublicPageCard T={T} goto={goto} /> },
    // 🎨 עורך-הדף — «ערוך את הדף שלי» תחת ✍️ היצירה (כותב update_my_page_config). מוצג רק למי שיש דף.
    { id: "page-editor", world: "create", icon: "🎨", title: "ערוך את הדף שלי", status: "live", hidden: !hasPage, render: () => <PageEditor T={T} goto={goto} /> },
    // 👤 הפרופיל שלי = זהות/חשבון בלבד (איחד את «הגדרות» לתוכו):
    //    סטטוס · תמונה+שם-תצוגה+שם-משתמש+התנתקות (ProfileSettings) · שם-מלא+תאריך-לידה.
    //    דרגה/עץ/מספרים גרים במודול אחד «📈 ההתקדמות שלי» — בלי כפילות (איחוד #1).
    { id: "profile", world: "me", icon: "👤", title: "הפרופיל שלי", status: "live", render: () => (
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.accSoft, color: T.acc, border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 12px", fontSize: 12.5, fontWeight: 800, marginBottom: 14 }}>{identityOf(c, isAdmin)}</div>
        <ProfileSettings t={{ fieldBg: T.card, ink: T.ink, line: T.line, sub: T.sub, acc: T.acc, btnText: "#fff" }} showSignOut onSignOut={() => goto("/")} />
        <MyInfoPanel T={T} />
      </div>
    ) },
    // 📈 ההתקדמות שלי — מודול אחד לדרגה+עץ+מספרים+פעילות (איחד את «הדרגה» ו«סטטיסטיקות»).
    { id: "progress", world: "me", icon: "📈", title: "ההתקדמות שלי", status: "live", render: () => (
      <div>
        <LevelPanel T={T} />
        <div style={{ marginTop: 18 }}><MyTreeCard /></div>
        <RecentActivityPanel T={T} />
        {isAdmin && <AdminOnlinePanel T={T} />}
      </div>
    ) },
    { id: "research", world: "lab", icon: "🧠", title: "המחקר שלי", status: "live", badge: c.research_items || undefined, render: () => (
      <div>
        {/* סביבת המחקר המלאה בתוך האזור האישי — סביבה אחת (החלטת צוריאל 9.7.2026) */}
        <DrawerResearch />
        <Link to="/research" style={{ display: "inline-block", marginTop: 14, color: T.acc, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>למעבדה המלאה (מסך רחב) ←</Link>
      </div>
    ) },
    // 📨 הודעות — כניסה אחת עתידית (הודעות-לכתב · DM פרטי · תגובות אליי). placeholder בלבד, לא בנוי.
    { id: "messages", world: "community", icon: "📨", title: "ההודעות שלי", status: "soon", render: () => <MessagesPlaceholder T={T} /> },
    { id: "contrib", world: "community", icon: "🤝", title: "התרומות שלי", status: "live", badge: c.contributions || undefined, render: () => (
      <div>
        <Row T={T} k="פריטים שהוספת (אושרו)" v={c.contributions ?? 0} />
        <Row T={T} k="מהמילים שלך במנוע" v={c.contributions ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>בקרוב: כמה נכנסו ל«אוצרות» · כמה משתמשים השתמשו · כמה צפיות קיבלו.</div>
      </div>
    ) },
    { id: "hints", world: "lab", icon: "🧩", title: "הרמזים שלי", status: "live", badge: c.hints || undefined, render: () => <HintsPanel T={T} user={user} /> },
    { id: "codes", world: "lab", icon: <img src="/els-icon.png" alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover", verticalAlign: "middle" }} />, title: "הצפנים שלי", status: "live", render: () => <MyCodesPanel T={T} user={user} goto={goto} /> },
    { id: "bots", world: "agent", icon: "🤖", title: "צוות הסוכנים", status: "live", render: () => <BotsTeamPanel T={T} goto={goto} /> },
    { id: "whatsapp", world: "agent", icon: "🟢", title: "החיבור לרזיאל", status: "live", render: () => <WhatsAppPanel T={T} goto={goto} setActive={setActive} /> },
    { id: "credits", world: "me", icon: "◆", title: "הקרדיטים שלי", status: "live", render: () => <CreditsPanel T={T} /> },

    // ─── היצירה שלי — לכותבים בלבד (writerOnly) ───
    ...(isWriter ? [{ id: "myposts", world: "create", icon: "📝", title: "הפוסטים שלי", status: "live", render: () => (
      <div>
        <Row T={T} k="פוסטים שפרסמת" v={c.posts ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>היצירה שלך באתר. בקרוב: עריכה מהירה · צפיות ותגובות לכל פוסט · טיוטות.</div>
        <button onClick={() => goto("/post")} style={{ marginTop: 12, background: T.acc, color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>לכל הפוסטים ←</button>
      </div>
    ) }] : []),

    // ─── ROADMAP — מפת-דרך אחת (במקום עשרות מודולים נעולים). «בקרוב = התוכנית האמיתית» ───
    { id: "roadmap", world: "me", icon: "🗺️", title: "מה בקרוב", status: "soon", render: () => <Roadmap T={T} /> },
  ];
}

// ── 🔠 הצפנים שלי — כל מטריצות-הדילוג ששמרתי (els_records שבבעלותי), עם סטטוס ──
// עץ אחד: כרטיס = עדשה שמקשרת לעמוד הקנוני /codes/:slug (לפורסמו), לא משכפלת תוכן.
function codeBadge(status) {
  if (status === "published") return { t: "✓ פורסם", c: "#1a7f37", b: "#e6f4ea" };
  if (status === "hidden") return { t: "🔒 מוסתר", c: "#8a8270", b: "rgba(0,0,0,0.05)" };
  return { t: "⏳ ממתין לאישור", c: "#9a6b00", b: "#fdf3d7" };
}
function MyCodesPanel({ T, user, goto }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);   // id שמתחלף כרגע
  const [note, setNote] = useState("");      // הודעת-מצב (למשל סף-דרגה)
  useEffect(() => { getMyMatrices(user?.id).then(setItems).catch(() => setItems([])); }, [user]);

  // 📁 החלפת «בתיק שלי» — RPC (סף level>=3 נאכף בשרת). מעדכן מקומית, ומסביר אם נחסם.
  async function toggleDossier(m) {
    setBusy(m.id); setNote("");
    try {
      const r = await selfPublishMatrix(m.id, !m.self_published);
      if (r?.ok) {
        setItems(list => list.map(x => x.id === m.id ? { ...x, self_published: r.self_published } : x));
        setNote(r.self_published ? "✓ נוסף לתיק המחקר שלך" : "הוסר מהתיק");
      } else {
        setNote("לא הצלחנו לעדכן — נסה שוב.");
      }
    } catch { setNote("שגיאה — נסה שוב."); }
    setBusy(null);
  }

  if (items === null) return <div style={{ color: T.sub, fontSize: 13.5, padding: "8px 0" }}>טוען…</div>;
  if (!items.length) return (
    <div style={{ textAlign: "center", padding: "26px 12px", color: T.sub }}>
      <img src="/els-icon.png" alt="" style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover", marginBottom: 10 }} />
      <div style={{ fontSize: 13.5, lineHeight: 1.7, marginBottom: 14 }}>
        עוד לא שמרת צפנים. חפש דילוג בכלי «הצופן התנ״כי» ולחץ «שמור» — הוא יופיע כאן, ותוכל לעקוב אם אושר ופורסם.
      </div>
      <button onClick={() => goto("/code")} style={{ background: T.acc, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}>🔍 לכלי הצופן ←</button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {/* ✨ כניסה לתיק-המחקר — באנר בולט (כניסה 4 לאשף/לתיק) */}
      <button onClick={() => goto("/community/researcher/me")} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "right",
        background: `linear-gradient(135deg,${T.acc}22,${T.gold}18)`, border: `1px solid ${T.acc}55`, borderRadius: 12, padding: "11px 13px", cursor: "pointer", color: T.ink, fontFamily: "inherit" }}>
        <span style={{ fontSize: 22, flex: "none" }}>📁</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 800, fontSize: 13.5 }}>{items.length ? "פתח את תיק המחקר שלך" : "הכן את תיק המחקר שלך"}</span>
          <span style={{ display: "block", fontSize: 11.5, color: T.sub }}>הגילויים, הקשרים והיומן שלך — במקום אחד</span>
        </span>
        <span style={{ color: T.acc, fontSize: 15, flex: "none" }}>←</span>
      </button>
      <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 2 }}>{items.length} צפנים שמרת. סמן «בתיק שלי» כדי שיופיעו בתיק המחקר — גם לפני אישור לאתר.</div>
      {note && <div style={{ fontSize: 12, color: T.acc, background: T.card, border: `1px solid ${T.line}`, borderRadius: 9, padding: "8px 10px" }}>{note}</div>}
      {items.map(m => {
        const bd = codeBadge(m.status);
        const inner = (
          <div style={{ display: "flex", gap: 11, alignItems: "center", padding: 9, borderRadius: 12, border: `1px solid ${T.line}`, background: T.card, width: "100%" }}>
            {m.image_url ? (
              <img src={m.image_url} alt="" loading="lazy" style={{ width: 46, height: 46, borderRadius: 9, objectFit: "cover", flex: "none", border: `1px solid ${T.line}` }} />
            ) : (
              <img src="/els-icon.png" alt="" style={{ width: 46, height: 46, borderRadius: 9, objectFit: "cover", flex: "none", border: `1px solid ${T.line}` }} />
            )}
            <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title || m.search_term}</div>
              <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>
                {m.skip_distance ? `דילוג ${m.skip_distance}` : ""}{m.scope === "tanakh" ? " · כל התנ״ך" : m.skip_distance ? " · תורה" : ""}
              </div>
              <span style={{ display: "inline-block", marginTop: 5, fontSize: 10.5, fontWeight: 800, color: bd.c, background: bd.b, borderRadius: 999, padding: "1px 8px" }}>{bd.t}</span>
            </div>
          </div>
        );
        // צופן שפורסם לאתר כבר מופיע בתיק אוטומטית; לממתין/טיוטה מציגים מתג «בתיק שלי».
        const card = m.status === "published"
          ? <button onClick={() => goto(`/codes/${encodeURIComponent(m.slug || m.id)}`)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "block", width: "100%" }}>{inner}</button>
          : inner;
        return (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {card}
            {m.status !== "published" && (
              <button onClick={() => toggleDossier(m)} disabled={busy === m.id}
                style={{ alignSelf: "flex-start", marginInlineStart: 57, border: `1px solid ${m.self_published ? T.acc : T.line}`,
                  background: m.self_published ? T.card : "none", color: m.self_published ? T.acc : T.sub,
                  borderRadius: 999, padding: "3px 11px", fontSize: 11.5, fontWeight: 700, cursor: busy === m.id ? "default" : "pointer" }}>
                {busy === m.id ? "…" : m.self_published ? "✓ בתיק שלי" : "➕ הצג בתיק שלי"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 🔔 פאנל ההתראות — אותה עדשה כמו הפעמון בסרגל, בתוך האזור-האישי (מקור-אמת אחד) ──
function relTime(ts) {
  try {
    const diff = (Date.now() - new Date(ts)) / 1000;
    if (diff < 60) return "עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`;
    if (diff < 604800) return `לפני ${Math.floor(diff / 86400)} ימים`;
    return new Date(ts).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  } catch { return ""; }
}
function NotificationsPanel({ T, onUnread, goto }) {
  const [items, setItems] = useState(null);
  useEffect(() => { getMyNotifications().then(setItems).catch(() => setItems([])); }, []);

  async function pick(n) {
    if (!n.read_at) { await markNotificationRead(n.id); onUnread?.(u => Math.max(0, (u || 1) - 1)); }
    if (n.link) goto?.(n.link);
  }
  async function readAll() {
    await markAllRead();
    onUnread?.(0);
    setItems(list => (list || []).map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  }

  if (items === null) return <div style={{ color: T.sub, fontSize: 13, padding: 14 }}>טוען…</div>;
  if (!items.length) return (
    <div style={{ textAlign: "center", padding: "28px 16px", color: T.sub, fontSize: 13.5, lineHeight: 1.7 }}>
      <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.7 }}>🌱</div>
      אין התראות עדיין.<br />כאן יופיעו עדכונים אישיים — כמו אישור חידוש ששלחתם.
    </div>
  );
  const anyUnread = items.some(n => !n.read_at);
  return (
    <div>
      {anyUnread && (
        <div style={{ textAlign: "left", marginBottom: 8 }}>
          <button onClick={readAll} style={{ background: "none", border: "none", cursor: "pointer", color: T.acc, fontSize: 12.5, fontWeight: 700 }}>סמן הכל כנקרא</button>
        </div>
      )}
      <div style={{ display: "grid", gap: 9 }}>
        {items.map(n => (
          <button key={n.id} onClick={() => pick(n)} style={{
            textAlign: "right", cursor: n.link ? "pointer" : "default", width: "100%",
            background: n.read_at ? T.card : T.accSoft, border: `1px solid ${n.read_at ? T.line : T.acc}`,
            borderRadius: 12, padding: "12px 13px", color: T.ink,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              {!n.read_at && <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.acc, flexShrink: 0 }} />}
              <span style={{ flex: 1, fontWeight: 800, fontSize: 13.5 }}>{n.title}</span>
              <span style={{ color: T.sub, fontSize: 10.5, whiteSpace: "nowrap" }}>{relTime(n.created_at)}</span>
            </div>
            {n.body && <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.6 }}>{n.body}</div>}
            {n.link && <div style={{ color: T.acc, fontSize: 11.5, fontWeight: 700, marginTop: 5 }}>לצפייה ←</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── פאנל הגדרות — עורך-פרופיל קנוני (ProfileSettings), אותו רכיב כמו בעמוד /profile ──
