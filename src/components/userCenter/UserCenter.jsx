import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { usePalette } from "../../lib/palette.js";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import { supabase } from "../../lib/supabase.js";
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
      {/* 🌳 דרגת-חוקר — לחיצה פותחת «הדרגה שלי» */}
      {myLevel && (
        <button onClick={() => setActive("level")} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "right", background: dark ? "#20242e" : "#f3f6ff", border: `1px solid ${T.line}`, borderRadius: 10, padding: "7px 11px", cursor: "pointer", color: T.ink, fontFamily: "inherit", margin: "6px 0 10px" }}>
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
  const [openWorlds, setOpenWorlds] = useState(() => {
    try { const s = localStorage.getItem("uc_worlds_open"); if (s) return new Set(JSON.parse(s)); } catch { /* noop */ }
    return new Set(["me", "lab"]);
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
            <Stat T={T} label="חיפושים" val={center?.searched ?? "—"} onClick={() => setActive("stats")} />
            {/* «פוסטים» מוצג רק למי שכתב פוסטים — גולש רגיל לא רואה «אפס פוסטים» */}
            {(center?.posts ?? 0) > 0 && <Stat T={T} label="פוסטים" val={center.posts} gold onClick={() => setActive("stats")} />}
          </div>
          {/* 🟢 סטטוס וואטסאפ — גלוי מיד בכותרת; מנותק = CTA לחיבור, מחובר = ניהול */}
          <WaHeaderChip T={T} onOpen={() => setActive("whatsapp")} />
        </div>

        {/* body — grid של מודולים או מודול פעיל */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: 14 }}>
          {!activeMod ? (
            <>
              <NextActionCard T={T} dark={dark} profile={profile} myProfile={myProfile} myLevel={myLevel} nextActions={nextActions} setActive={setActive} goto={goto} />
              {/* 🌍 5 העולמות — קיבוץ המודולים. עולם ריק לא מוצג. */}
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
const ZURIEL_WA = "972556651237"; // רכישת קרדיטים = פנייה אישית בוואטסאפ
function CreditsPanel({ T }) {
  const { user } = useAuth();
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
        <div style={{ fontSize: 11.5, color: T.sub, marginTop: 4, lineHeight: 1.6 }}>הקרדיטים בהרצה — עדיין ללא מחירים. מחלקים כדי ללמוד מה עובד; ההגדרה הסופית בקרוב.</div>
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

      {/* 💳 רכישת קרדיטים — כרגע פנייה אישית בוואטסאפ */}
      <div style={{ marginTop: 16, background: T.goldSoft, border: `1px solid ${T.line}`, borderRadius: 14, padding: "13px 14px" }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: T.gold, marginBottom: 4 }}>💳 רכישת קרדיטים</div>
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, marginBottom: 10 }}>רוצה עוד קרדיטים עכשיו? שלח לי הודעה אישית בוואטסאפ ונסדר.</div>
        <a href={`https://wa.me/${ZURIEL_WA}?text=${encodeURIComponent("היי, אשמח לרכוש קרדיטים ל-סוד 1820")}`} target="_blank" rel="noreferrer"
          style={{ display: "block", textAlign: "center", background: "#25D366", color: "#fff", borderRadius: 10, padding: "11px", fontWeight: 800, fontSize: 13.5, textDecoration: "none" }}>🟢 לרכישה — הודעה בוואטסאפ</a>
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
        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1a7f37" }}>🟢 חבר את הוואטסאפ שלך</div>
        <div style={{ fontSize: 12.5, color: "#2f6b46", lineHeight: 1.6, marginTop: 3 }}>
          כשמחברים, הבוט של סוד 1820 (רזיאל) והסוכן האישי מזהים אותך — הרמזים והשיחות שלך בוואטסאפ מתחברים לפרופיל כאן. שולחים לך קוד בוואטסאפ לאימות שהמספר באמת שלך.
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

// ── ה-registry: 22 מודולים. live = פאנל אמיתי · soon = התוכנית האמיתית ──
// כל render() הוא פאנל עצמאי (לא תלוי בשלד המגירה) → אפשר לרנדר אותו בעתיד גם
// במסך-מלא (/me/:module) עם אותו registry, בלי לגעת ב-UserCenter. לכן buildModules מיוצא.
export function buildModules({ T, user, profile, isAdmin, center, signOut, unread = 0, onUnread, goto, setActive }) {
  const c = center || {};
  const hasPosts = (c.posts ?? 0) > 0;   // מציגים «פוסטים» רק למי שכתב פוסטים (לא «אפס פוסטים» לגולש רגיל)
  const isWriter = !!(c.is_writer || c.is_publisher);
  return [
    // ─── LIVE — פאנלים אמיתיים עם נתונים · world = שיוך לאחד מ-5 העולמות ───
    { id: "notifications", world: "me", icon: "🔔", title: "ההתראות שלי", status: "live", badge: unread || undefined,
      render: () => <NotificationsPanel T={T} onUnread={onUnread} goto={goto} /> },
    { id: "profile", world: "me", icon: "👤", title: "הפרופיל שלי", status: "live", render: () => (
      <div>
        <Row T={T} k="סטטוס" v={identityOf(c, isAdmin)} />
        {hasPosts && <Row T={T} k="פוסטים באתר" v={c.posts} />}
        <Row T={T} k="פריטים במחקר" v={c.research_items ?? 0} />
        <Row T={T} k="שמורים" v={c.saved ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>העולם האישי שלך בתוך SOD1820 — כל גילוי מרחיב את העץ שלך.</div>
      </div>
    ) },
    { id: "level", world: "me", icon: "🌳", title: "הדרגה שלי", status: "live", render: () => <LevelPanel T={T} /> },
    { id: "research", world: "lab", icon: "🧠", title: "המחקר שלי", status: "live", badge: c.research_items || undefined, render: () => (
      <div>
        {/* סביבת המחקר המלאה בתוך האזור האישי — סביבה אחת (החלטת צוריאל 9.7.2026) */}
        <DrawerResearch />
        <Link to="/research" style={{ display: "inline-block", marginTop: 14, color: T.acc, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>למעבדה המלאה (מסך רחב) ←</Link>
      </div>
    ) },
    { id: "contrib", world: "community", icon: "🤝", title: "התרומות שלי", status: "live", badge: c.contributions || undefined, render: () => (
      <div>
        <Row T={T} k="פריטים שהוספת (אושרו)" v={c.contributions ?? 0} />
        <Row T={T} k="מהמילים שלך במנוע" v={c.contributions ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>בקרוב: כמה נכנסו ל«אוצרות» · כמה משתמשים השתמשו · כמה צפיות קיבלו.</div>
      </div>
    ) },
    { id: "stats", world: "me", icon: "📊", title: "סטטיסטיקות", status: "live", render: () => (
      <div>
        <Row T={T} k="חיפושים" v={c.searched ?? 0} />
        {hasPosts && <Row T={T} k="פוסטים" v={c.posts} />}
        <Row T={T} k="פריטים במחקר" v={c.research_items ?? 0} />
        <Row T={T} k="תרומות" v={c.contributions ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>בקרוב: דירוג בקהילה · זמן פעילות · תגים והישגים.</div>
      </div>
    ) },
    { id: "hints", world: "lab", icon: "🧩", title: "הרמזים שלי", status: "live", badge: c.hints || undefined, render: () => <HintsPanel T={T} user={user} /> },
    { id: "codes", world: "lab", icon: <img src="/els-icon.png" alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover", verticalAlign: "middle" }} />, title: "הצפנים שלי", status: "live", render: () => <MyCodesPanel T={T} user={user} goto={goto} /> },
    { id: "bots", world: "agent", icon: "🤖", title: "צוות הסוכנים", status: "live", render: () => <BotsTeamPanel T={T} goto={goto} /> },
    { id: "whatsapp", world: "agent", icon: "🟢", title: "הוואטסאפ שלי", status: "live", render: () => <WhatsAppPanel T={T} goto={goto} setActive={setActive} /> },
    { id: "credits", world: "me", icon: "◆", title: "הקרדיטים שלי", status: "live", render: () => <CreditsPanel T={T} /> },
    { id: "settings", world: "me", icon: "⚙️", title: "הגדרות", status: "live", render: () => <SettingsPanel T={T} /> },

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
      <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 2 }}>{items.length} צפנים שמרת. סמן «בתיק שלי» כדי שיופיעו ב<button onClick={() => goto("/community/researcher/me")} style={{ border: "none", background: "none", padding: 0, color: T.acc, fontWeight: 700, cursor: "pointer", fontSize: 12.5, textDecoration: "underline" }}>תיק המחקר שלך</button> — גם לפני אישור לאתר.</div>
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
function SettingsPanel({ T }) {
  return (
    <ProfileSettings
      t={{ fieldBg: T.card, ink: T.ink, line: T.line, sub: T.sub, acc: T.acc, btnText: "#fff" }}
      showSignOut
    />
  );
}
