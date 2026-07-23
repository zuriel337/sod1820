import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { GoldButton } from "../components/ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import MyTreeCard from "../components/MyTreeCard.jsx";
import ProfileSettings from "../components/ProfileSettings.jsx";
import { Avatar } from "./AuthPage.jsx";
import { supabase, getUserActivity, getMyResearch } from "../lib/supabase.js";
import { PUSH_CONFIGURED, getPushStatus, enablePush, disablePush } from "../lib/push.js";
import ResearchCenter from "../components/ResearchCenter.jsx";
import { rwCss, RW_VARS } from "../lib/research/theme.js";
import { useSiteOnline } from "../lib/presence.js";

// 🟢 מחוברים עכשיו — מונה חי (Realtime Presence). לאדמין בלבד.
// מפריד בין מחוברים (עם חשבון) לגולשים אנונימיים. מתעדכן תוך שנייה בכניסה/יציאה.
function OnlineNowCard({ P, card }) {
  const { total, members, guests } = useSiteOnline();
  const stat = (n, label, dot) => (
    <div style={{ flex: 1, minWidth: 92, textAlign: "center", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, boxShadow: `0 0 8px ${dot}` }} />
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{n}</span>
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, marginTop: 6 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ ...card, marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 24 }}>🟢</span>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>מחוברים עכשיו</div>
        <span style={{ marginInlineStart: "auto", color: P.accentDim, fontFamily: F.heading, fontSize: 11, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 999, padding: "3px 10px" }}>LIVE · אדמין</span>
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginBottom: 14 }}>
        כמה אנשים באתר ברגע זה — חי, מתעדכן מיד. (רואה רק אתה.)
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {stat(total, "סה״כ באתר", "#5bd16a")}
        {stat(members, "מחוברים (חשבון)", "#f0c14b")}
        {stat(guests, "גולשים (אורחים)", "#7bb7ff")}
      </div>
    </div>
  );
}

// 🔔 כרטיס מצב התראות Push — מראה אם המכשיר הזה רשום + כפתור הפעלה/ביטול.
// סך המנויים הכולל מוצג *רק לאדמין* (לבדיקה) — לא חושפים אותו לגולשים.
function PushStatusCard({ P, card, user, isAdmin }) {
  const [status, setStatus] = useState(null);   // { supported, configured, permission, subscribed }
  const [total, setTotal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const refreshCount = React.useCallback(async () => {
    if (!isAdmin) return;   // המונה לאדמין בלבד
    try {
      const { data } = await supabase.rpc("push_sub_count");
      if (data && typeof data.total === "number") setTotal(data.total);
    } catch { /* noop */ }
  }, [isAdmin]);

  const refresh = React.useCallback(async () => {
    try { setStatus(await getPushStatus()); } catch { /* noop */ }
    refreshCount();
  }, [refreshCount]);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggle() {
    setNote(""); setBusy(true);
    try {
      if (status?.subscribed) {
        await disablePush();
        setNote("ההרשמה בוטלה במכשיר זה.");
      } else {
        const r = await enablePush({ userId: user?.id || null, topics: [] });
        if (!r.ok) {
          setNote(r.reason === "denied" ? "הדפדפן חסם התראות — צריך לאשר בהגדרות האתר." :
                  r.reason === "unsupported" ? "הדפדפן הזה לא תומך בהתראות." : "ההפעלה נכשלה.");
        } else { setNote("נרשמת להתראות במכשיר זה ✦"); }
      }
    } catch { setNote("שגיאה — נסו שוב."); }
    // המתנה קצרה כדי שה-DB יתעדכן לפני קריאת הספירה מחדש
    await new Promise(r => setTimeout(r, 600));
    await refresh();
    setBusy(false);
  }

  if (!PUSH_CONFIGURED) return null;

  const subscribed = !!status?.subscribed;
  const unsupported = status && !status.supported;

  return (
    <div style={{ ...card, marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 26 }}>🔔</span>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>התראות Push</div>
      </div>

      {/* מצב המכשיר הנוכחי */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, margin: "8px 0 4px",
        background: P.cardSoft, border: `1px solid ${subscribed ? "#2e7d32" : P.borderStrong}`,
        borderRadius: 999, padding: "6px 16px",
        color: subscribed ? "#5bd16a" : P.accentDim, fontFamily: F.heading, fontWeight: 700, fontSize: 13.5,
      }}>
        {unsupported ? "⚠️ הדפדפן הזה לא תומך בהתראות"
          : subscribed ? "✅ רשום להתראות במכשיר זה"
          : "○ לא רשום במכשיר זה"}
      </div>

      {/* סך המנויים — לאדמין בלבד (לבדיקה). לא נחשף לגולשים. */}
      {isAdmin && (
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, marginTop: 8 }}>
          סך המנויים (אדמין): <b style={{ color: P.accentText, fontSize: 15 }}>{total ?? "…"}</b>
          <button onClick={refresh} title="רענון" style={{
            marginInlineStart: 8, background: "none", border: "none", cursor: "pointer",
            color: P.accentDim, fontSize: 13, padding: 0,
          }}>↻</button>
        </div>
      )}

      {!unsupported && (
        <div style={{ marginTop: 16 }}>
          <GoldButton onClick={toggle} disabled={busy} variant={subscribed ? "secondary" : "primary"}>
            {busy ? "…" : subscribed ? "בטל הרשמה במכשיר זה" : "הפעל התראות במכשיר זה"}
          </GoldButton>
        </div>
      )}

      {note && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, marginTop: 12 }}>{note}</div>}

      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, lineHeight: 1.7, marginTop: 14, opacity: 0.85 }}>
        💡 כל מכשיר/דפדפן נרשם בנפרד. הפעלה כאן רושמת את המכשיר, ביטול מסיר אותו.
        באייפון נדרש להוסיף את האתר למסך הבית לפני שאפשר להירשם.
      </div>
    </div>
  );
}

// 🕒 פעילות אישית אחרונה — חיפושי גימטריה / פוסטים שנגלשו (פר-משתמש, RLS).
function RecentActivity({ P, card, user }) {
  const [searches, setSearches] = useState(null);
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!user) return;
    getUserActivity(["gematria"], 8).then(d => { if (alive) setSearches(d); });
    getUserActivity(["post"], 6).then(d => { if (alive) setPosts(d); });
    return () => { alive = false; };
  }, [user]);

  const chip = {
    display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
    background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 999,
    padding: "6px 13px", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 600,
  };
  const row = {
    display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
    padding: "9px 4px", borderBottom: `1px solid ${P.border}`, color: P.ink, fontFamily: F.body, fontSize: 14,
  };

  const hasSearch = searches && searches.length > 0;
  const hasPosts = posts && posts.length > 0;

  return (
    <>
      {/* חיפושי גימטריה אחרונים */}
      <div style={{ ...card, marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>🔢</span>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>חיפושי הגימטריה האחרונים שלך</div>
        </div>
        {searches === null ? (
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13 }}>טוען…</div>
        ) : hasSearch ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {searches.map((s, i) => (
              <Link key={i} to={`/beit-midrash?w=${encodeURIComponent(s.ref)}`} style={chip}>
                <span>{s.ref}</span>
                {s.title ? <span style={{ color: P.accentDim, fontSize: 12 }}>= {s.title}</span> : null}
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
            עוד לא חיפשת גימטריות. כל חיפוש ב<Link to="/beit-midrash" style={{ color: P.accentText }}>בית המדרש</Link> יופיע כאן.
          </div>
        )}
      </div>

      {/* פוסטים שגלשת בהם */}
      <div style={{ ...card, marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>📜</span>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>פוסטים שגלשת בהם</div>
        </div>
        {posts === null ? (
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13 }}>טוען…</div>
        ) : hasPosts ? (
          <div>
            {posts.map((p, i) => (
              <Link key={i} to={`/${p.ref}`} style={row}>
                <span style={{ fontSize: 15 }}>›</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || p.ref}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
            הפוסטים שתקרא יופיעו כאן, כדי שתוכל לחזור אליהם בקלות.
          </div>
        )}
      </div>
    </>
  );
}

// ✨ בקרוב — מפת-דרך אחת קומפקטית (במקום עשרות כרטיסים נעולים). «בקרוב = התוכנית האמיתית».
function ComingSoonCard({ P, card }) {
  const rows = [
    ["🌳", "העץ וההתקדמות", "העץ האישי · דרגת חוקר · הישגים · משימות"],
    ["💎", "התוכן שלי", "הפוסטים · האוצרות · המועדפים · לוח פעילות"],
    ["📊", "תובנות", "הסטטיסטיקה שלי · דילוגי ELS שמורים · התראות לפי נושא"],
    ["👥", "קהילה", "חוקרים שאני עוקב · הזמן חוקר · הודעות"],
  ];
  return (
    <div style={{ ...card, marginTop: 22, padding: "26px 26px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 22 }}>✨</span>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>בקרוב באזור האישי</div>
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginBottom: 14 }}>
        מפת הדרך — הכלים האישיים נפתחים בהדרגה. 👑
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map(([e, t, d], i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "9px 0", borderBottom: i < rows.length - 1 ? `1px solid ${P.border}` : "none" }}>
            <span style={{ fontSize: 19, opacity: 0.85 }}>{e}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>{t}</div>
              <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.6 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 🧠 עולם המשתמש בתוך הפרופיל — אותו ResearchCenter בדיוק (עץ אחד), כך שהמסעות · השמורים ·
// המחקר הפעיל · הפנקס מעודכנים כאן בדיוק כמו בסרגל «עולם המשתמש». פלטה בהירה scoped בכרטיס.
function MyResearchCard({ P, card }) {
  const [tab, setTab] = useState("active");
  return (
    <div style={{ ...card, marginTop: 22, padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 26px 4px" }}>
        <span style={{ fontSize: 24 }}>🧠</span>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>עולם המשתמש — המחקר שלי</div>
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, padding: "0 26px 10px" }}>
        המסעות · השמורים · המחקר הפעיל · הפנקס — מסונכרנים עם «עולם המשתמש» שבדפי המספר.
      </div>
      <style>{rwCss()}</style>
      <div style={{ ...RW_VARS, background: "#f7f4ec", padding: "10px 12px 16px", borderTop: `1px solid ${P.border}` }}>
        <ResearchCenter variant="context" tabbed activeTab={tab} onTab={setTab} />
      </div>
    </div>
  );
}

// 👋 המשכיות — «בפעם הקודמת חקרת X» (research_items). ההוכחה שהמחקר ממשיך (לא ChatGPT).
function ContinuityStrip({ P, card, navigate }) {
  const [last, setLast] = useState(null);
  useEffect(() => {
    let alive = true;
    getMyResearch({ limit: 1 }).then(r => { if (alive) setLast((r && r[0]) || null); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!last) return null;
  const to = last.link || `/number/${encodeURIComponent(last.entity_ref)}`;
  return (
    <button onClick={() => navigate(to)} style={{ ...card, marginTop: 22, padding: "16px 20px", width: "100%", textAlign: "start", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderTop: "3px solid #25d366" }}>
      <span style={{ fontSize: 26, flex: "none" }}>👋</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>בפעם הקודמת חקרת «{last.title || last.entity_ref}»</span>
        <span style={{ display: "block", color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 1 }}>המשך מהמקום שעצרת →</span>
      </span>
    </button>
  );
}

// 🪪 הפרטים שלי — שם מלא + תאריך-לידה (פרטי). פותח ניתוח-שם במנוע + רזיאל «מכיר אותך».
function MyInfoCard({ P, card, navigate }) {
  const [name, setName] = useState("");
  const [bdate, setBdate] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.from("profiles").select("full_name, birth_date").maybeSingle()
      .then(({ data }) => { if (!alive) return; setName(data?.full_name || ""); setBdate(data?.birth_date || ""); setLoaded(true); })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);
  async function save() {
    setBusy(true); setNote("");
    try {
      const { data } = await supabase.rpc("save_my_info", { p_full_name: name.trim() || null, p_birth_date: bdate || null });
      setNote(data?.ok ? "✓ נשמר — רזיאל מכיר אותך עכשיו" : "לא נשמר — נסו שוב");
    } catch { setNote("שגיאה — נסו שוב"); }
    setBusy(false);
  }
  const input = { width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10, background: P.cardSoft, border: `1px solid ${P.borderStrong}`, color: P.ink, fontFamily: F.body, fontSize: 16, outline: "none" };
  return (
    <div style={{ ...card, marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 24 }}>🪪</span>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>הפרטים שלי</div>
        <span style={{ marginInlineStart: "auto", color: P.accentDim, fontSize: 11, fontFamily: F.heading }}>פרטי · רק אתה</span>
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginBottom: 14, lineHeight: 1.6 }}>
        השם ותאריך-הלידה פותחים ניתוח-שם אישי במנוע, ומאפשרים לרזיאל להכיר אותך.
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <input value={name} onChange={e => setName(e.target.value)} dir="rtl" placeholder="השם המלא שלי (שם + שם משפחה)" style={input} />
        <div>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, marginBottom: 4 }}>תאריך לידה</div>
          <input type="date" value={bdate || ""} onChange={e => setBdate(e.target.value)} style={{ ...input, direction: "ltr" }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <GoldButton onClick={save} disabled={busy || !loaded}>{busy ? "שומר…" : "שמור"}</GoldButton>
          {name.trim() && <button onClick={() => navigate(`/name-lab?w=${encodeURIComponent(name.trim())}`)} style={{ background: "none", border: `1px solid ${P.border}`, color: P.accentText, borderRadius: 10, padding: "10px 16px", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>🔮 נתח את השם שלי →</button>}
        </div>
        {note && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13 }}>{note}</div>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const P = usePalette();
  const { user, profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  // סגנונות תלויי-תמה (יום/לילה)
  const card = {
    background: P.cardGrad,
    border: `1px solid ${P.border}`, borderTop: `3px solid ${P.accent}`,
    borderRadius: 12, padding: "36px 30px", boxShadow: `0 4px 40px ${P.glow}`,
  };

  // גלילה ל"ניהול עדכונים" כשמגיעים עם #notifications (מהתפריט/פוטר)
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#notifications") return;
    const t = setTimeout(() => document.getElementById("notifications")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    return () => clearTimeout(t);
  }, [user, profile]);

  // 🔒 האזור האישי פרטי — לא לאינדקס (SEO = דף החוקר הציבורי בלבד). מונע דליפת דף-משתמש לגוגל.
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { try { document.head.removeChild(m); } catch { /* noop */ } };
  }, []);

  if (!loading && !user) {
    return (
      <div style={{ background: P.pageBg, minHeight: "100vh" }}>
        <div style={{ direction: "rtl", maxWidth: 460, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 20, marginBottom: 16 }}>צריך להתחבר כדי לראות את הפרופיל</div>
          <GoldButton to="/login">כניסה</GoldButton>
        </div>
      </div>
    );
  }

  const lightMode = P.mode === "light";

  return (
    <div style={{ background: lightMode ? "#f6f1e6" : P.pageBg, minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* רקע עיר מותאם ליום: בהיר ועדין (בלילה הרקע הגלובלי הכהה כבר קיים) */}
      {lightMode && (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/city-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(0.45) brightness(1.55) contrast(0.85)", opacity: 0.14 }} />
          <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", background: "linear-gradient(180deg, rgba(184,134,11,0.07), rgba(123,76,176,0.06))" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(246,241,230,0.55) 12%, #f6f1e6 30%, #f6f1e6 70%, rgba(246,241,230,0.55) 88%, transparent 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 40% at 50% 0%, rgba(184,134,11,0.10), transparent 60%)" }} />
        </div>
      )}
    <div style={{ direction: "rtl", maxWidth: 520, margin: "0 auto", padding: "56px 24px 120px", position: "relative", zIndex: 1 }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <Avatar profile={profile} user={user} size={64} />
          <div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 700 }}>{profile?.display_name || profile?.username || "פרופיל"}</div>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, marginTop: 3 }}>
              {profile?.tier === "member" ? "👑 בני ההיכל" : "משתמש רשום"}{profile?.role === "admin" ? " · אדמין" : ""}
            </div>
          </div>
        </div>

        <MyTreeCard />

        {/* עורך-הפרופיל הקנוני — אותו רכיב בדיוק כמו במגירת «האזור האישי» (חוק העץ האחד) */}
        <div style={{ marginTop: 8 }}>
          <ProfileSettings
            t={{ fieldBg: P.cardSoft, ink: P.ink, line: P.borderStrong, sub: P.accentDim, acc: P.accentText, danger: C.danger, btnBg: P.accentBtn, btnText: P.onAccent }}
            showSignOut
            onSignOut={() => navigate("/")}
          />
        </div>
      </div>

      <ContinuityStrip P={P} card={card} navigate={navigate} />

      {isAdmin && <OnlineNowCard P={P} card={card} />}

      {/* 📁 תיק המחקר שלי — כניסה מרכזית לכל חוקר (researcher_dossier_law) */}
      <button onClick={() => navigate("/community/researcher/me")} style={{ ...card, marginTop: 22, width: "100%", textAlign: "start", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, borderTop: `3px solid ${P.accent}` }}>
        <span style={{ fontSize: 34, flex: "none" }}>📁</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 800 }}>תיק המחקר שלי</span>
          <span style={{ display: "block", color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 }}>הגילויים, הצפנים, הקשרים והיומן שלך — במקום אחד</span>
        </span>
        <span style={{ color: P.accent, fontSize: 20, flex: "none" }}>←</span>
      </button>

      <MyInfoCard P={P} card={card} navigate={navigate} />

      <MyResearchCard P={P} card={card} />

      <PushStatusCard P={P} card={card} user={user} isAdmin={isAdmin} />

      <RecentActivity P={P} card={card} user={user} />

      <ComingSoonCard P={P} card={card} />


      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link to="/" style={{ color: P.accentDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13 }}>← חזרה לאתר</Link>
      </div>
    </div>
    </div>
  );
}
