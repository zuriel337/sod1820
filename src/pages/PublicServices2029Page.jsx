import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { publicMapLinks2029 } from "../lib/publicMap2029.js";
import React, { lazy, Suspense, useEffect } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import PrivacyPage from "./PrivacyPage.jsx";
import UnsubscribePage from "./UnsubscribePage.jsx";
import NotFoundPage from "./NotFound2029Page.jsx";
import { NewsletterSignup2029 } from "../components/StayUpdatedCTA.jsx";
import { applySeo } from "../lib/seo.js";
import "./auth2029.css";
import { PUBLIC_LAUNCH_READ_ONLY_PREVIEW } from "../lib/publicLaunch2029.js";
import { PUBLIC_READING_PRODUCTION_ARTIFACT } from "../lib/publicReadingRelease2029.js";

const NumberLanding2029 = lazy(() => import("../components/number2029/NumberLanding2029.jsx"));
const icons = { map: "map", "number-search": "number", privacy: "privacy", unsubscribe: "mail", updates: "mail" };
const LABELS = { "launch-closed": "האזור ייפתח בהמשך", privacy: "פרטיות", unsubscribe: "הסרה מהדיוור", updates: "עדכונים במייל", map: "מפת האתר", "number-search": "מספר או ביטוי", "not-found": "העמוד לא נמצא" };
export default function PublicServices2029Page({ kind }) {
  useEffect(() => {
    if (["privacy", "unsubscribe", "not-found"].includes(kind)) return;
    applySeo({ title: LABELS[kind], path: kind === "number-search" ? "/number" : `/${kind}`, noindex: kind === "updates", ...(kind === "number-search" ? { description: "חפשו מספר, שם, פסוק או רמז: גימטריה בכל השיטות, ביטויים בערך זהה, הצלבות, מספרי יסוד, מספר היום והמספרים החמים באתר." } : {}) });
  }, [kind]);
  return <Sod2029Shell surface="community" symbol={<NavigationIcon2029 name={icons[kind] || "help"} />} title={LABELS[kind]} introVariant="none" pageOwnsEmblem={kind === "unsubscribe"}>
    {PUBLIC_LAUNCH_READ_ONLY_PREVIEW && !PUBLIC_READING_PRODUCTION_ARTIFACT && (kind === "updates" || kind === "unsubscribe") ? <section className="sod29-section"><h1>{LABELS[kind]}</h1><p>פעולות הדיוור אינן פעילות בגרסה זו. קישורי ההסרה הקיימים באתר הוותיק נשארים ללא שינוי.</p><Link to="/privacy">פרטיות ויצירת קשר</Link></section> : <>
    {kind === "launch-closed" ? <section className="sod29-section"><h1>האזור ייפתח בהמשך</h1><p>גרסת הקריאה הציבורית כוללת בית, עולם, פוסטים, מספרים, ביטויים, מחשבון וגלריות. פעולות חשבון, כתיבה ומודלים עדיין אינן פעילות.</p><Link to="/">חזרה לבית</Link></section> : kind === "privacy" ? <PrivacyPage /> : kind === "unsubscribe" ? <UnsubscribePage /> : kind === "number-search" ? <Suspense fallback={<section className="sod29-section" aria-busy="true" style={{ minHeight: 560 }} />}><NumberLanding2029 /></Suspense>
      : kind === "not-found" ? <NotFoundPage /> : kind === "updates" ? <>
        <h1>עדכונים במייל</h1><NewsletterSignup2029 /><p>להסרה: השתמשו בקישור האישי שבתחתית המייל שקיבלתם. <Link to="/unsubscribe">עזרה בהסרה</Link> · <Link to="/privacy">פרטיות ויצירת קשר</Link></p>
      </> : <section className="sod29-section"><h1>מפת האתר</h1><p>קריאה, מקורות ושירותים. חלק מהיכולות החדשות עדיין בבנייה; כניסה לדף אינה מפעילה כתיבה או כלי מחקר.</p><nav aria-label="דפי האתר" className="sod29-actions">
        {publicMapLinks2029(PUBLIC_READING_PRODUCTION_ARTIFACT).map(([href, label]) => <Link key={href} className="sod29-action" to={href}>{label}</Link>)}
      </nav><h2>עדיין בבנייה</h2><p>סביבת העבודה בהיכל טרם נבנתה. פעולות מחקר מתקדמות מתוכננות להמשך.</p><nav className="sod29-actions" aria-label="יכולות בתהליך התאמה">{[["/raziel", "רזיאל"], ["/name", "מחקר השם"], ["/credits", "קרדיטים ותשלומים"]].map(([href, label]) => <Link key={href} className="sod29-action" to={href}>{label}</Link>)}</nav></section>}</>}
  </Sod2029Shell>;
}
