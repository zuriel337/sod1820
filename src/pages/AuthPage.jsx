import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, F, LOGO_URL } from "../theme.js";
import { GoldButton } from "../components/ui.jsx";
import { signInWithGoogle, signInWithMagicLink } from "../lib/auth.js";
import { useAuth } from "../lib/AuthContext.jsx";

const card = {
  background: `linear-gradient(160deg, ${C.surface} 0%, ${C.bg} 100%)`,
  border: `1px solid ${C.border}`, borderTop: `3px solid ${C.gold}`,
  borderRadius: 12, padding: "40px 32px", boxShadow: `0 4px 40px ${C.goldDeep}`,
};

export default function AuthPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // כבר מחובר — הצגת פרופיל קצר
  if (user) {
    const name = profile?.display_name || profile?.username || user.email;
    return (
      <div style={{ direction: "rtl", maxWidth: 460, margin: "0 auto", padding: "72px 24px 120px" }}>
        <div style={{ ...card, textAlign: "center" }}>
          <Avatar profile={profile} user={user} size={72} />
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700, marginTop: 16 }}>{name}</div>
          <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, marginTop: 4 }}>
            {profile?.tier === "member" ? "👑 בני ההיכל" : "משתמש רשום"}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 26, flexWrap: "wrap" }}>
            <GoldButton to="/profile">הפרופיל שלי</GoldButton>
            <GoldButton variant="secondary" onClick={async () => { await signOut(); navigate("/"); }}>התנתקות</GoldButton>
          </div>
        </div>
      </div>
    );
  }

  async function sendMagic(e) {
    e.preventDefault();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("אנא הזן כתובת מייל תקינה"); return; }
    setBusy(true);
    const { error } = await signInWithMagicLink(email);
    setBusy(false);
    if (error) setErr(error.message || "שגיאה בשליחה"); else setSent(true);
  }

  return (
    <div style={{ direction: "rtl", maxWidth: 460, margin: "0 auto", padding: "64px 24px 120px" }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <img src={LOGO_URL} alt="SOD1820" style={{ height: 56, width: "auto", filter: "drop-shadow(0 0 18px rgba(232,200,74,0.6))" }} />
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 26, fontWeight: 700, margin: "16px 0 6px" }}>כניסה להיכל</h1>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13 }}>התחברו כדי להצטרף לקהילה ולקבל את הסודות.</div>
      </div>

      <div style={card}>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 17, fontWeight: 700, marginBottom: 8 }}>בדקו את המייל</div>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.8 }}>
              שלחנו קישור כניסה אל <b style={{ color: C.goldBright }}>{email}</b>. לחצו עליו כדי להתחבר.
            </div>
            <button onClick={() => { setSent(false); }} style={linkBtn}>חזרה</button>
          </div>
        ) : (
          <>
            <button onClick={() => signInWithGoogle()} style={googleBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.2-1.7H12z"/></svg>
              המשך עם Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: C.muted, fontSize: 12, fontFamily: F.heading }}>
              <div style={{ flex: 1, height: 1, background: C.border }} /> או <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <form onSubmit={sendMagic}>
              <label style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, display: "block", marginBottom: 6 }}>קוד כניסה למייל</label>
              <input
                type="email" value={email} dir="ltr" placeholder="you@example.com"
                onChange={e => { setEmail(e.target.value); setErr(""); }}
                style={{ width: "100%", padding: "12px 14px", background: C.bg, color: C.goldLight,
                  border: `1px solid ${err ? C.danger : C.borderGold}`, borderRadius: 8, fontFamily: F.body, fontSize: 15, outline: "none" }}
              />
              {err && <div style={{ color: C.danger, fontSize: 12, marginTop: 6, fontFamily: F.heading }}>{err}</div>}
              <button type="submit" disabled={busy} style={{ ...googleBtn, marginTop: 12, justifyContent: "center", background: C.surface2, color: C.goldBright }}>
                {busy ? "שולח…" : "שלחו לי קישור כניסה"}
              </button>
            </form>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 22 }}>
        <Link to="/" style={{ color: C.goldDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13 }}>← חזרה לאתר</Link>
      </div>
    </div>
  );
}

const googleBtn = {
  width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
  background: "#fff", color: "#222", border: `1px solid ${C.borderGold}`, borderRadius: 8,
  padding: "12px 16px", cursor: "pointer", fontFamily: F.heading, fontSize: 14, fontWeight: 700,
};
const linkBtn = {
  background: "none", border: "none", color: C.goldBright, cursor: "pointer",
  fontFamily: F.heading, fontSize: 13, marginTop: 18, textDecoration: "underline",
};

export function Avatar({ profile, user, size = 36 }) {
  const url = profile?.avatar_url;
  const seed = (profile?.display_name || profile?.username || user?.email || "?").trim();
  const initial = seed.charAt(0).toUpperCase();
  if (url) {
    return <img src={url} alt={seed} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `1px solid ${C.borderGold}` }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(circle, ${C.goldDark}, ${C.bg})`, border: `1px solid ${C.gold}`,
      color: C.goldBright, fontFamily: F.regal, fontWeight: 700, fontSize: size * 0.42,
    }}>{initial}</div>
  );
}
