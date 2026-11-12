import React, { useEffect } from "react";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import NewPassword2029 from "../components/auth2029/NewPassword2029.jsx";
import { applySeo } from "../lib/seo.js";
import "./auth2029.css";

// The page a password-recovery link lands on once its session is verified (route /auth/callback). Loaded only for that case, so an
// ordinary sign-in return does not pay for the full site shell.
export default function NewPassword2029Page({ returnTo = "/2029" }) {
  useEffect(() => { applySeo({ title: "בחירת סיסמה חדשה", path: "/auth/callback", noindex: true }); }, []);
  return <Sod2029Shell surface="community" title="בחירת סיסמה חדשה" introVariant="none" status="חשבון" symbol="◎">
    <main className="sod29-auth" data-experience-surface="auth-2029-recovery" dir="rtl">
      <NewPassword2029 returnTo={returnTo} />
    </main>
  </Sod2029Shell>;
}
