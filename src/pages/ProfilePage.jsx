import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, F } from "../theme.js";
import { GoldButton } from "../components/ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { updateProfile } from "../lib/auth.js";
import { Avatar } from "./AuthPage.jsx";

const card = {
  background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
  border: `1px solid ${C.border}`, borderTop: `3px solid ${C.gold}`,
  borderRadius: 12, padding: "36px 30px", boxShadow: `0 4px 40px ${C.goldDeep}`,
};
const field = {
  width: "100%", padding: "11px 13px", background: C.bg, color: C.goldLight,
  border: `1px solid ${C.borderGold}`, borderRadius: 8, fontFamily: F.body, fontSize: 14, outline: "none",
};
const label = { color: C.goldDim, fontFamily: F.heading, fontSize: 12, display: "block", margin: "14px 0 6px" };

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  if (!loading && !user) {
    return (
      <div style={{ direction: "rtl", maxWidth: 460, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 20, marginBottom: 16 }}>צריך להתחבר כדי לראות את הפרופיל</div>
        <GoldButton to="/login">כניסה</GoldButton>
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
    <div style={{ direction: "rtl", maxWidth: 520, margin: "0 auto", padding: "56px 24px 120px" }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <Avatar profile={{ ...profile, avatar_url: avatarUrl }} user={user} size={64} />
          <div>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 20, fontWeight: 700 }}>{displayName || username || "פרופיל"}</div>
            <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, marginTop: 3 }}>
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
        {msg && <div style={{ color: C.gold, fontSize: 13, marginTop: 12, fontFamily: F.heading }}>{msg}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <GoldButton onClick={save} disabled={busy}>{busy ? "שומר…" : "שמירה"}</GoldButton>
          <GoldButton variant="secondary" onClick={async () => { await signOut(); navigate("/"); }}>התנתקות</GoldButton>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link to="/" style={{ color: C.goldDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13 }}>← חזרה לאתר</Link>
      </div>
    </div>
  );
}
