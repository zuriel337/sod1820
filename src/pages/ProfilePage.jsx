import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { GoldButton } from "../components/ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { updateProfile } from "../lib/auth.js";
import { Avatar } from "./AuthPage.jsx";

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
