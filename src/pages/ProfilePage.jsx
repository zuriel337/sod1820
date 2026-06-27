import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { GoldButton } from "../components/ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { updateProfile } from "../lib/auth.js";
import { Avatar } from "./AuthPage.jsx";
import { supabase, getUserActivity } from "../lib/supabase.js";
import { PUSH_CONFIGURED, getPushStatus, enablePush, disablePush } from "../lib/push.js";

// 🔔 כרטיס מצב התראות Push — מראה אם המכשיר הזה רשום + סך המנויים הכולל,
// עם כפתור הפעלה/ביטול כדי שאפשר יהיה לאמת שהמספר עולה/יורד.
function PushStatusCard({ P, card, user }) {
  const [status, setStatus] = useState(null);   // { supported, configured, permission, subscribed }
  const [total, setTotal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const refreshCount = React.useCallback(async () => {
    try {
      const { data } = await supabase.rpc("push_sub_count");
      if (data && typeof data.total === "number") setTotal(data.total);
    } catch { /* noop */ }
  }, []);

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

      {/* סך המנויים — לבדיקה שהמספר עולה/יורד */}
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, marginTop: 8 }}>
        סך המנויים בקהילה: <b style={{ color: P.accentText, fontSize: 15 }}>{total ?? "…"}</b>
        <button onClick={refresh} title="רענון" style={{
          marginInlineStart: 8, background: "none", border: "none", cursor: "pointer",
          color: P.accentDim, fontSize: 13, padding: 0,
        }}>↻</button>
      </div>

      {!unsupported && (
        <div style={{ marginTop: 16 }}>
          <GoldButton onClick={toggle} disabled={busy} variant={subscribed ? "secondary" : "primary"}>
            {busy ? "…" : subscribed ? "בטל הרשמה במכשיר זה" : "הפעל התראות במכשיר זה"}
          </GoldButton>
        </div>
      )}

      {note && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, marginTop: 12 }}>{note}</div>}

      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, lineHeight: 1.7, marginTop: 14, opacity: 0.85 }}>
        💡 כל מכשיר/דפדפן נרשם בנפרד. הפעלה כאן מוסיפה למונה, ביטול מוריד.
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

// 🔒 פיצ'רים בפיתוח — כרטיסים נעולים "בקרוב".
function ComingSoonGrid({ P, card }) {
  const items = [
    { e: "🔍", t: "דילוגי אותיות (ELS) שמורים", d: "החיפושים שלך בתורה — שמורים וזמינים לחזרה." },
    { e: "🧭", t: "המסלולים שלי", d: "המסעות וההתכנסויות שאספת — אוסף אישי." },
    { e: "⭐", t: "מועדפים", d: "מספרים, רמזים ופוסטים ששמרת לכוכב." },
    { e: "🔔", t: "התראות לפי נושא", d: "בחירת נושאים שתרצה לקבל עליהם פוש בלבד." },
    { e: "📊", t: "הסטטיסטיקה שלי", d: "כמה חיפשת, אילו מספרים ריתקו אותך, מגמות." },
    { e: "🏅", t: "דרגת חוקר", d: "ניקוד אישי על חקירה, שיתופים ותגליות." },
  ];
  return (
    <div style={{ ...card, marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 24 }}>✨</span>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>בקרוב באזור האישי</div>
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13, marginBottom: 16 }}>
        כלים אישיים שנפתח בהדרגה — שווה לחכות. 👑
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            position: "relative", background: P.cardSoft, border: `1px solid ${P.borderStrong}`,
            borderRadius: 12, padding: "16px 14px", opacity: 0.92, overflow: "hidden",
          }}>
            <div style={{ fontSize: 26, marginBottom: 6, filter: "grayscale(0.2)" }}>{it.e}</div>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>{it.t}</div>
            <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 1.6 }}>{it.d}</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10,
              background: "rgba(0,0,0,0.25)", border: `1px solid ${P.border}`, borderRadius: 999,
              padding: "3px 10px", color: P.accentDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700,
            }}>🔒 בקרוב</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const P = usePalette();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // סגנונות תלויי-תמה (יום/לילה)
  const card = {
    background: P.cardGrad,
    border: `1px solid ${P.border}`, borderTop: `3px solid ${P.accent}`,
    borderRadius: 12, padding: "36px 30px", boxShadow: `0 4px 40px ${P.glow}`,
  };
  const field = {
    width: "100%", padding: "11px 13px", background: P.cardSoft, color: P.ink,
    border: `1px solid ${P.borderStrong}`, borderRadius: 8, fontFamily: F.body, fontSize: 14, outline: "none",
  };
  const label = { color: P.accentDim, fontFamily: F.heading, fontSize: 12, display: "block", margin: "14px 0 6px" };

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  // גלילה ל"ניהול עדכונים" כשמגיעים עם #notifications (מהתפריט/פוטר)
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#notifications") return;
    const t = setTimeout(() => document.getElementById("notifications")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    return () => clearTimeout(t);
  }, [user, profile]);

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

  async function save() {
    setErr(""); setMsg("");
    if (username.trim().length < 2) { setErr("שם המשתמש קצר מדי"); return; }
    setBusy(true);
    try {
      await updateProfile(user.id, {
        username: username.trim(),
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await refreshProfile();
      setMsg("נשמר בהצלחה ✦");
    } catch (e) {
      setErr(e?.message?.includes("duplicate") ? "שם המשתמש כבר תפוס" : (e?.message || "שגיאה בשמירה"));
    }
    setBusy(false);
  }

  return (
    <div style={{ background: P.pageBg, minHeight: "100vh" }}>
    <div style={{ direction: "rtl", maxWidth: 520, margin: "0 auto", padding: "56px 24px 120px" }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <Avatar profile={{ ...profile, avatar_url: avatarUrl }} user={user} size={64} />
          <div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 700 }}>{displayName || username || "פרופיל"}</div>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, marginTop: 3 }}>
              {profile?.tier === "member" ? "👑 בני ההיכל" : "משתמש רשום"}{profile?.role === "admin" ? " · אדמין" : ""}
            </div>
          </div>
        </div>

        <label style={label}>שם משתמש (ציבורי)</label>
        <input style={field} value={username} onChange={e => setUsername(e.target.value)} dir="rtl" />

        <label style={label}>שם תצוגה</label>
        <input style={field} value={displayName} onChange={e => setDisplayName(e.target.value)} dir="rtl" />

        <label style={label}>קישור לתמונת פרופיל (URL)</label>
        <input style={field} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} dir="ltr" placeholder="https://…" />

        {err && <div style={{ color: C.danger, fontSize: 13, marginTop: 12, fontFamily: F.heading }}>{err}</div>}
        {msg && <div style={{ color: P.accentText, fontSize: 13, marginTop: 12, fontFamily: F.heading }}>{msg}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <GoldButton onClick={save} disabled={busy}>{busy ? "שומר…" : "שמירה"}</GoldButton>
          <GoldButton variant="secondary" onClick={async () => { await signOut(); navigate("/"); }}>התנתקות</GoldButton>
        </div>
      </div>

      <PushStatusCard P={P} card={card} user={user} />

      <RecentActivity P={P} card={card} user={user} />

      <ComingSoonGrid P={P} card={card} />

      {/* "הזרם שלך" — נעול כרגע (הפתעות בדרך). id נשמר כדי שגלילת ה-#notifications תעבוד */}
      <div id="notifications" style={{ ...card, textAlign: "center", marginTop: 22, position: "relative", overflow: "hidden" }}>
        <div style={{ fontSize: 42, filter: "drop-shadow(0 0 16px rgba(212,175,55,0.4))" }}>🌊</div>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 22, fontWeight: 800, marginTop: 4 }}>הזרם שלך</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, margin: "14px 0 12px",
          background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "5px 16px",
          color: P.accentDim, fontFamily: F.heading, fontWeight: 700, fontSize: 13 }}>
          🔒 נעול כרגע
        </div>
        <div style={{ color: P.ink, fontFamily: F.body, fontSize: 15.5, lineHeight: 1.9, maxWidth: 380, margin: "0 auto" }}>
          ✨ הפתעות בדרך — בקרוב נפתח כאן את <b style={{ color: P.accentText }}>ההתאמה האישית של הזרם שלך</b>:
          השערים, עוצמת הזרם והעדכונים שלך. שווה לחכות. 👑
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link to="/" style={{ color: P.accentDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13 }}>← חזרה לאתר</Link>
      </div>
    </div>
    </div>
  );
}
