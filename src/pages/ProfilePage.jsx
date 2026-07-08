import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { GoldButton } from "../components/ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import MyTreeCard from "../components/MyTreeCard.jsx";
import { updateProfile } from "../lib/auth.js";
import { Avatar } from "./AuthPage.jsx";
import { supabase, getUserActivity } from "../lib/supabase.js";
import { PUSH_CONFIGURED, getPushStatus, enablePush, disablePush } from "../lib/push.js";
import ResearchCenter from "../components/ResearchCenter.jsx";
import { rwCss, RW_VARS } from "../lib/research/theme.js";

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

export default function ProfilePage() {
  const P = usePalette();
  const { user, profile, loading, isAdmin, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

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

  async function pickAvatar(e) {
    const f = e.target.files?.[0];
    e.target.value = "";   // לאפשר בחירה חוזרת של אותו קובץ
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("נא לבחור קובץ תמונה"); return; }
    if (f.size > 5 * 1024 * 1024) { setErr("התמונה גדולה מדי (מקסימום 5MB)"); return; }
    setErr(""); setMsg(""); setUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gallery").upload(path, f, { upsert: false, contentType: f.type });
      if (error) throw error;
      const url = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
      setAvatarUrl(url);
      setMsg("התמונה הועלתה — לחצו שמירה לעדכון ✦");
    } catch (e2) {
      setErr(e2?.message || "שגיאה בהעלאת התמונה");
    }
    setUploading(false);
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
          <Avatar profile={{ ...profile, avatar_url: avatarUrl }} user={user} size={64} />
          <div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 700 }}>{displayName || username || "פרופיל"}</div>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, marginTop: 3 }}>
              {profile?.tier === "member" ? "👑 בני ההיכל" : "משתמש רשום"}{profile?.role === "admin" ? " · אדמין" : ""}
            </div>
          </div>
        </div>

        <MyTreeCard />

        <label style={label}>שם משתמש (ציבורי)</label>
        <input style={field} value={username} onChange={e => setUsername(e.target.value)} dir="rtl" />

        <label style={label}>שם תצוגה</label>
        <input style={field} value={displayName} onChange={e => setDisplayName(e.target.value)} dir="rtl" />

        <label style={label}>תמונת פרופיל</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Avatar profile={{ ...profile, avatar_url: avatarUrl }} user={user} size={52} />
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 8, cursor: uploading ? "wait" : "pointer",
            background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 10,
            padding: "10px 18px", color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700,
          }}>
            {uploading ? "מעלה…" : "📷 העלאת תמונה מהמכשיר"}
            <input type="file" accept="image/*" onChange={pickAvatar} disabled={uploading} style={{ display: "none" }} />
          </label>
          {avatarUrl && !uploading && (
            <button onClick={() => { setAvatarUrl(""); setMsg(""); }} style={{
              background: "none", border: "none", cursor: "pointer", color: P.accentDim,
              fontFamily: F.heading, fontSize: 12.5, textDecoration: "underline", textUnderlineOffset: 2,
            }}>הסר</button>
          )}
        </div>
        <button onClick={() => setShowUrl(v => !v)} style={{
          background: "none", border: "none", cursor: "pointer", color: P.accentDim,
          fontFamily: F.heading, fontSize: 12, marginTop: 8, padding: 0, textDecoration: "underline", textUnderlineOffset: 2,
        }}>{showUrl ? "הסתר" : "או הדבק קישור (URL)"}</button>
        {showUrl && (
          <input style={{ ...field, marginTop: 8 }} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} dir="ltr" placeholder="https://…" />
        )}

        {err && <div style={{ color: C.danger, fontSize: 13, marginTop: 12, fontFamily: F.heading }}>{err}</div>}
        {msg && <div style={{ color: P.accentText, fontSize: 13, marginTop: 12, fontFamily: F.heading }}>{msg}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <GoldButton onClick={save} disabled={busy}>{busy ? "שומר…" : "שמירה"}</GoldButton>
          <GoldButton variant="secondary" onClick={async () => { await signOut(); navigate("/"); }}>התנתקות</GoldButton>
        </div>
      </div>

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
