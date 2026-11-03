import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import PrivacyPage from "./PrivacyPage.jsx";
import UnsubscribePage from "./UnsubscribePage.jsx";
import NotFoundPage from "./NotFoundPage.jsx";
import { NewsletterSignup2029 } from "../components/StayUpdatedCTA.jsx";
import { applySeo } from "../lib/seo.js";
import "./auth2029.css";
import { PUBLIC_LAUNCH_READ_ONLY_PREVIEW } from "../lib/publicLaunch2029.js";
import { PUBLIC_READING_PRODUCTION_ARTIFACT } from "../lib/publicReadingRelease2029.js";

const LABELS = { "launch-closed": "האזור ייפתח בהמשך", privacy: "פרטיות", unsubscribe: "הסרה מהדיוור", updates: "עדכונים במייל", map: "מפת האתר", "number-search": "מספר או ביטוי", "not-found": "העמוד לא נמצא" };
function NumberEntry() {
  const [term, setTerm] = useState(""); const navigate = useNavigate();
  return <section className="sod29-section sod29-auth-card"><h1>מספר או ביטוי</h1><p>המספרים, הביטויים והמקורות במנוע הקיים. חיפוש אינו פרסום ציבורי.</p>
    <form className="sod29-actions" onSubmit={e => { e.preventDefault(); if (term.trim()) navigate(`/number/${encodeURIComponent(term.trim())}`); }}>
      <label>מה מחפשים? <input required maxLength={500} value={term} onChange={e => setTerm(e.target.value)} placeholder="למשל 1820 או בראשית" /></label>
      <button type="submit" className="sod29-action">פתיחה</button>
    </form></section>;
}
export default function PublicServices2029Page({ kind }) {
  useEffect(() => {
    if (["privacy", "unsubscribe", "not-found"].includes(kind)) return;
    applySeo({ title: LABELS[kind], path: kind === "number-search" ? "/number" : `/${kind}`, noindex: kind === "updates" });
  }, [kind]);
  return <Sod2029Shell surface="community" title={LABELS[kind]} introVariant="none">
    {PUBLIC_LAUNCH_READ_ONLY_PREVIEW && (kind === "updates" || (kind === "unsubscribe" && !PUBLIC_READING_PRODUCTION_ARTIFACT)) ? <section className="sod29-section"><h1>{LABELS[kind]}</h1><p>פעולות הדיוור אינן פעילות בגרסה זו. קישורי ההסרה הקיימים באתר הוותיק נשארים ללא שינוי.</p><Link to="/privacy">פרטיות ויצירת קשר</Link></section> : <>
    {kind === "launch-closed" ? <section className="sod29-section"><h1>האזור ייפתח בהמשך</h1><p>גרסת הקריאה הציבורית כוללת בית, עולם, פוסטים, מספרים, ביטויים, מחשבון וגלריות. פעולות חשבון, כתיבה ומודלים עדיין אינן פעילות.</p><Link to="/">חזרה לבית</Link></section> : kind === "privacy" ? <PrivacyPage /> : kind === "unsubscribe" ? <UnsubscribePage /> : kind === "number-search" ? <NumberEntry />
      : kind === "not-found" ? <NotFoundPage /> : kind === "updates" ? <>
        <h1>עדכונים במייל</h1><NewsletterSignup2029 /><p>להסרה: השתמשו בקישור האישי שבתחתית המייל שקיבלתם. <Link to="/unsubscribe">עזרה בהסרה</Link> · <Link to="/privacy">פרטיות ויצירת קשר</Link></p>
      </> : <section className="sod29-section"><h1>מפת האתר</h1><p>קריאה, מקורות ושירותים. חלק מהיכולות החדשות עדיין בבנייה; כניסה לדף אינה מפעילה כתיבה או כלי מחקר.</p><nav aria-label="דפי האתר" className="sod29-actions">
        {[["/", "בית"], ["/world", "העולם"], ["/post", "פוסטים"], ["/number", "מספר או ביטוי"], ["/gematria", "מחשבון גימטריה"], ["/community/calculator", "מחשבון הקהילה"], ["/gallery", "גלריות"], ["/or-geula", "אור הגאולה"], ["/community/chat", "הצ׳אט הקהילתי · קריאה"], ["/community/researchers", "אנשים וכתבים"], ["/books", "ספרים ומקורות"], ["/codes", "צפנים שפורסמו"], ["/contact", "דיווח או הצעה"], ["/login", "כניסה לחשבון"], ["/updates", "עדכונים במייל · בהכנה"], ["/privacy", "פרטיות ומחיקת נתונים"], ["/unsubscribe", "הסרה מהדיוור"]].map(([href, label]) => <Link key={href} className="sod29-action" to={href}>{label}</Link>)}
      </nav><h2>עדיין בבנייה</h2><nav className="sod29-actions" aria-label="יכולות בתהליך התאמה">{[["/code", "כלי הצופן"], ["/heichal", "ההיכל"], ["/journey", "מסע החיים"], ["/raziel", "רזיאל"], ["/forum", "פורום המחקר"], ["/name", "מחקר השם"], ["/credits", "קרדיטים ותשלומים"]].map(([href, label]) => <Link key={href} className="sod29-action" to={href}>{label}</Link>)}</nav></section>}</>}
  </Sod2029Shell>;
}
