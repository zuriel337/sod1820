import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import AccountEntry2029 from "../components/auth2029/AccountEntry2029.jsx";
import { safeOAuthReturnPath } from "../lib/oauthReturn.js";
import { applySeo } from "../lib/seo.js";
import "./auth2029.css";

export default function Auth2029Page() {
  const location = useLocation();
  const target = safeOAuthReturnPath(new URLSearchParams(location.search).get("returnTo") || "/2029");
  const returnTo = target === "/" ? "/2029" : target;
  useEffect(() => { applySeo({ title: "כניסה לחשבון", description: "כניסה לחשבון הקיים, לקהילה ולאזור האישי.", path: "/login", noindex: true }); }, []);
  return <Sod2029Shell surface="community" title="כניסה לחשבון" introVariant="none" status="חשבון" symbol="◎">
    <main className="sod29-auth" data-experience-surface="auth-2029" dir="rtl">
      <header className="sod29-auth-intro"><span className="sod29-auth-eyebrow">המקום שלכם בקהילה</span><h1>טוב לראות אתכם כאן</h1><p>השיחות, ההודעות והאזור האישי שלכם — באותו חשבון.</p><Link className="sod29-auth-return" to={returnTo}>חזרה לגלישה ←</Link></header>
      <AccountEntry2029 returnHref={returnTo} />
      <footer className="sod29-auth-footer">החשבון שלכם נשאר פרטי. פרופיל ציבורי מוצג רק בהתאם לבחירות שלכם.</footer>
    </main>
  </Sod2029Shell>;
}
