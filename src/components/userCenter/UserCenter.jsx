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
import { getMyMatrices } from "../../lib/elsMatrices.js";
import { getMyProfile, claimFoundingGrants, getNextActions, getAgentRoster, getAgentStats, getMyWaMemory, getMyCreditLedger, getMyLinkedPhones, requestWaLinkCode, verifyWaLinkCode } from "../../lib/commandCenter.js";

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

// 🧠 «מה כדאי לי לעשות עכשיו?» — הכרטיס הראשון (personal_command_center_law: החוויה לפני התשתית).
// לא תפריט — כיוון. + badge יתרת-קרדיטים (בהרצה). מוקרן בראש האזור-האישי.
function NextActionCard({ T, dark, profile, myProfile, nextActions, setActive, goto }) {
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
          <span title="קרדיטים — בהרצה, עדיין ללא מחירים" style={{ marginInlineStart: "auto", background: T.goldSoft, color: T.gold, borderRadius: 999, fontSize: 11.5, fontWeight: 800, padding: "3px 10px", whiteSpace: "nowrap" }}>
            ◆ {(myProfile.credits || 0).toLocaleString("he-IL")} · בהרצה
          </span>
        )}
      </div>
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
  const [nextActions, setNextActions] = useState(null); // 🧠 «מה כדאי לעשות עכשיו»

  useEffect(() => {
    if (!isOpen || !user || !supabase) return;
    let alive = true;
    supabase.rpc("my_center").then(({ data }) => { if (alive) setCenter(data || {}); }).catch(() => {});
    getUnreadCount().then(c => { if (alive) setUnread(c); }).catch(() => {});
    // 🎁 מענק-מייסד ממתין → נתבע אוטומטית (idempotent), ואז טוענים את היתרה
    claimFoundingGrants().then(() => getMyProfile()).then(p => { if (alive) setMyProfile(p); }).catch(() => {});
    return () => { alive = false; };
  }, [isOpen, user]);

  // 🧠 «הצעד הבא» — תלוי ב-center (משתמש ב-research_items שכבר נטען)
  useEffect(() => {
    if (!isOpen || !user || center == null) return;
    let alive = true;
    getNextActions({ center }).then(a => { if (alive) setNextActions(a); }).catch(() => { if (alive) setNextActions([]); });
    return () => { alive = false; };
  }, [isOpen, user, center]);

  // נעילת גלילה של הרקע כשהמגירה פתוחה
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!user) return null;
  const goto = (link) => { close(); if (link) nav(link); };
  const MODULES = buildModules({ T, user, profile, isAdmin, center, signOut, unread, onUnread: setUnread, goto });
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
          {/* פס-סטטוס — נתונים אמיתיים בלבד (my_center). לחיצים → פותחים את המודול הרלוונטי. */}
          <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
            <Stat T={T} label="במחקר" val={center?.research_items ?? "—"} onClick={() => setActive("research")} />
            <Stat T={T} label="שמורים" val={center?.saved ?? "—"}
              onClick={() => { try { localStorage.setItem("rw_hub_tab", "saved"); } catch { /* noop */ } setActive("research"); }} />
            <Stat T={T} label="חיפושים" val={center?.searched ?? "—"} onClick={() => setActive("stats")} />
            {/* «פוסטים» מוצג רק למי שכתב פוסטים — גולש רגיל לא רואה «אפס פוסטים» */}
            {(center?.posts ?? 0) > 0 && <Stat T={T} label="פוסטים" val={center.posts} gold onClick={() => setActive("stats")} />}
          </div>
        </div>

        {/* body — grid של מודולים או מודול פעיל */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: 14 }}>
          {!activeMod ? (
            <>
              <NextActionCard T={T} dark={dark} profile={profile} myProfile={myProfile} nextActions={nextActions} setActive={setActive} goto={goto} />
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
            {a.phase === "beta" && <span style={{ marginInlineStart: 6, fontSize: 10, fontWeight: 700, color: T.sub, background: T.accSoft, borderRadius: 999, padding: "1px 7px" }}>בהרצה</span>}
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
        <div style={{ fontWeight: 800, fontSize: 13.5, color: T.gold }}>🧪 בהרצה — מעבדת המחקר החיה</div>
        <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, marginTop: 3 }}>צוות חוקרי-AI, כל אחד בהתמחות שלו, שכולם תורמים לאותו עץ-ידע. מטטרון מתאם.</div>
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
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 7 }}>🧠 מה הבוטים זוכרים עליי <span style={{ fontSize: 10.5, fontWeight: 700, color: T.sub }}>(פרטי)</span></div>
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
        המערכת בהרצה. רוצה יותר מידע?{" "}
        <button onClick={() => goto("/contact")} style={{ background: "none", border: "none", color: T.acc, fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12.5 }}>דבר עם צוריאל ←</button>
      </div>
    </div>
  );
}

// ◆ הקרדיטים שלי — יתרה + ספר-תנועות (בהרצה). credit_ledger own-read.
const CREDIT_REASON = { founding_grant: "🏛️ מענק חוקר מייסד", daily: "☀️ פעילות יומית", spend: "שימוש", earn: "צבירה" };
function CreditsPanel({ T }) {
  const [ledger, setLedger] = useState(null);
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    let alive = true;
    getMyProfile().then(p => { if (alive) setProfile(p); }).catch(() => {});
    getMyCreditLedger(15).then(l => { if (alive) setLedger(l); }).catch(() => { if (alive) setLedger([]); });
    return () => { alive = false; };
  }, []);
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

function WhatsAppPanel({ T, goto }) {
  const [linked, setLinked] = useState(null);   // רשימת טלפונים מקושרים
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("idle");      // idle | code_sent
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);          // {kind:'ok'|'err', text}
  const [masked, setMasked] = useState("");

  const reload = useCallback(() => {
    getMyLinkedPhones().then(l => setLinked(l)).catch(() => setLinked([]));
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
          כשמחברים, הבוט של סוד1820 (רזיאל) והסוכן האישי מזהים אותך — הרמזים והשיחות שלך בוואטסאפ מתחברים לפרופיל כאן. שולחים לך קוד בוואטסאפ לאימות שהמספר באמת שלך.
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
              </div>
            ))}
          </div>
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
export function buildModules({ T, user, profile, isAdmin, center, signOut, unread = 0, onUnread, goto }) {
  const c = center || {};
  const hasPosts = (c.posts ?? 0) > 0;   // מציגים «פוסטים» רק למי שכתב פוסטים (לא «אפס פוסטים» לגולש רגיל)
  return [
    // ─── LIVE — פאנלים אמיתיים עם נתונים ───
    { id: "notifications", icon: "🔔", title: "ההתראות שלי", status: "live", badge: unread || undefined,
      render: () => <NotificationsPanel T={T} onUnread={onUnread} goto={goto} /> },
    { id: "profile", icon: "👤", title: "הפרופיל שלי", status: "live", render: () => (
      <div>
        <Row T={T} k="סטטוס" v={c.is_publisher ? "👑 כותב · VIP" : "חוקר רשום"} />
        {hasPosts && <Row T={T} k="פוסטים באתר" v={c.posts} />}
        <Row T={T} k="פריטים במחקר" v={c.research_items ?? 0} />
        <Row T={T} k="שמורים" v={c.saved ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>העולם האישי שלך בתוך SOD1820 — כל גילוי מרחיב את העץ שלך.</div>
      </div>
    ) },
    { id: "research", icon: "🧠", title: "המחקר שלי", status: "live", badge: c.research_items || undefined, render: () => (
      <div>
        {/* סביבת המחקר המלאה בתוך האזור האישי — סביבה אחת (החלטת צוריאל 9.7.2026) */}
        <DrawerResearch />
        <Link to="/research" style={{ display: "inline-block", marginTop: 14, color: T.acc, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>למעבדה המלאה (מסך רחב) ←</Link>
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
        {hasPosts && <Row T={T} k="פוסטים" v={c.posts} />}
        <Row T={T} k="פריטים במחקר" v={c.research_items ?? 0} />
        <Row T={T} k="תרומות" v={c.contributions ?? 0} />
        <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub, lineHeight: 1.7 }}>בקרוב: דירוג בקהילה · זמן פעילות · תגים והישגים.</div>
      </div>
    ) },
    { id: "hints", icon: "🧩", title: "הרמזים שלי", status: "live", badge: c.hints || undefined, render: () => <HintsPanel T={T} user={user} /> },
    { id: "codes", icon: <img src="/els-icon.png" alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover", verticalAlign: "middle" }} />, title: "הצפנים שלי", status: "live", render: () => <MyCodesPanel T={T} user={user} goto={goto} /> },
    { id: "bots", icon: "🤖", title: "צוות הסוכנים", status: "live", render: () => <BotsTeamPanel T={T} goto={goto} /> },
    { id: "whatsapp", icon: "🟢", title: "הוואטסאפ שלי", status: "live", render: () => <WhatsAppPanel T={T} goto={goto} /> },
    { id: "credits", icon: "◆", title: "הקרדיטים שלי", status: "live", render: () => <CreditsPanel T={T} /> },
    { id: "settings", icon: "⚙️", title: "הגדרות", status: "live", render: () => <SettingsPanel T={T} /> },

    // ─── ROADMAP — מפת-דרך אחת (במקום עשרות מודולים נעולים). «בקרוב = התוכנית האמיתית» ───
    { id: "roadmap", icon: "🗺️", title: "מה בקרוב", status: "soon", render: () => <Roadmap T={T} /> },
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
  useEffect(() => { getMyMatrices(user?.id).then(setItems).catch(() => setItems([])); }, [user]);

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
      <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 2 }}>{items.length} צפנים שמרת. לחיצה על צופן שפורסם פותחת את עמודו.</div>
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
        return m.status === "published"
          ? <button key={m.id} onClick={() => goto(`/codes/${encodeURIComponent(m.slug || m.id)}`)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>{inner}</button>
          : <div key={m.id}>{inner}</div>;
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
