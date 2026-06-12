import React from "react";
import { C, F } from "../theme.js";
import { useAuth } from "./AuthProvider.jsx";
import EmailVerify from "./EmailVerify.jsx";

/**
 * חוק מערכת: subscribe_gate_law
 * אחרי 2 חידושים חינמיים, ההמשך נחשף רק למשתמש מאומת — מי שאימת את המייל שלו
 * (Supabase Auth OTP). ההרשמה חינמית; זה לא אזור המנויים בתשלום "בני ההיכל".
 */

// משתמש "פתוח" = משתמש מאומת (יש session). נשמר לשם תאימות עם קוד קיים.
export function useSubscribed() {
  const { verified } = useAuth();
  return { subscribed: verified, markSubscribed: () => {} };
}

export default function SubscribeGate({ lockedCount = 0, source = "site", onUnlock }) {
  const { verified } = useAuth();
  if (verified) return null;

  return (
    <div style={{
      direction: "rtl", textAlign: "center",
      background: `linear-gradient(180deg, ${C.surface2}, ${C.surface})`,
      border: `1px solid ${C.borderGold}`, borderRadius: 16,
      padding: "32px 24px", margin: "20px 0",
      boxShadow: "0 0 40px rgba(212,175,55,0.08) inset",
    }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>🔓</div>
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700 }}>
        להמשך — הירשמו (חינם) ואמתו את המייל
      </div>
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, maxWidth: 460, margin: "10px auto 22px" }}>
        {lockedCount > 0 ? `עוד ${lockedCount} חידושים ממתינים לכם. ` : ""}
        רישום חד-פעמי עם אימות במייל פותח את כל החידושים — וגם מצרף אתכם לעדכונים.
      </p>
      <EmailVerify source={source} onVerified={onUnlock} />
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 16 }}>
        ללא תשלום · אימות חד-פעמי במייל · זה לא אזור המנויים «בני ההיכל»
      </div>
    </div>
  );
}
