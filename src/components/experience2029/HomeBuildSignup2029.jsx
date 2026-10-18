// Home 2029 presentation of existing milestone readiness and the canonical
// newsletter-signup edge function. No local metric store.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BUILD_PROGRESS, FIRST_STAGE_RELEASE_GATES } from "../../lib/knowledgeMap.js";
import { SUPABASE_URL, SUPABASE_ANON } from "../../lib/supabase.js";
import { signupAttribution } from "../../lib/acquisition.js";
import { getVisitorId } from "../../lib/tracking.js";
import "./homeBuildSignup2029.css";

const SIGNUP_SOURCE = "home-2029-discovery";
const emailIsValid = value => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(value || "").trim());

export default function HomeBuildSignup2029() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const closed = FIRST_STAGE_RELEASE_GATES.filter(gate => gate.state === "closed").length;
  const total = FIRST_STAGE_RELEASE_GATES.length;
  const submit = async event => {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!emailIsValid(value)) { setStatus("invalid"); return; }
    if (status === "sending" || status === "new" || status === "exists") return;
    setStatus("sending");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-signup?format=json`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({
          email: value,
          source: SIGNUP_SOURCE,
          back: "/",
          acquisition: signupAttribution(),
          visitor_id: getVisitorId(),
        }),
      });
      const data = await response.json().catch(() => ({ ok: false }));
      if (response.ok && (data.status === "new" || data.status === "exists" || data.ok)) {
        setStatus(data.status === "exists" ? "exists" : "new");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return <section className="hb29" aria-label="האתר בבנייה והצטרפות לעדכונים" data-experience-capability="home-build-and-updates" data-scroll-anchor="home:build-signup">
    <div className="hb29-progress">
      <div className="h29-kicker">העולם החדש נבנה</div>
      <h2>כבר אפשר לגלות. אנחנו ממשיכים לפתוח עוד.</h2>
      <p>המחקרים והכלים הזמינים נשארים פתוחים; מרכיבים חדשים מצטרפים בהדרגה ובבדיקה.</p>
      <div className="hb29-meter-head">
        <strong>מוכנות לשלב הציבורי הראשון</strong>
        <b>{BUILD_PROGRESS}%</b>
      </div>
      <div className="hb29-meter" role="progressbar" aria-label="מוכנות לשלב הציבורי הראשון"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={BUILD_PROGRESS}>
        <span style={{ inlineSize: `${BUILD_PROGRESS}%` }} />
      </div>
      <small>{closed} מתוך {total} שערי הכנה נסגרו לפי מפת המערכת. זה אינו אחוז ההשלמה של האתר כולו; המיפוי עודכן ב־9.10.2026.</small>
      <Link className="hb29-link" to="/map">מה פתוח ומה נבנה ←</Link>
    </div>

    <div className="hb29-signup">
      <div className="h29-kicker">להיות חלק מהדרך</div>
      <h2>מקבלים עדכונים על גילויים חדשים</h2>
      <p>הצטרפו לרשימת העדכונים של SOD1820 — צפנים, מחקרים וכלים שנפתחים באתר.</p>
      {status === "new" || status === "exists"
        ? <p className="hb29-message" role="status">{status === "exists" ? "הכתובת כבר רשומה לעדכונים." : "ההרשמה התקבלה. תודה שהצטרפתם!"}</p>
        : <form onSubmit={submit} className="hb29-form">
          <label htmlFor="hb29-email">כתובת אימייל</label>
          <div className="hb29-field">
            <input id="hb29-email" type="email" autoComplete="email" dir="ltr" value={email}
              required placeholder="name@example.com" disabled={status === "sending"}
              onChange={event => { setEmail(event.target.value); if (status !== "idle") setStatus("idle"); }}/>
            <button type="submit" disabled={status === "sending"}>{status === "sending" ? "שולח…" : "הרשמה לעדכונים"}</button>
          </div>
          {status === "invalid" ? <p className="hb29-error" role="alert">נא להזין כתובת אימייל תקינה.</p> : null}
          {status === "error" ? <p className="hb29-error" role="alert">לא הצלחנו להשלים את ההרשמה. אפשר לנסות שוב.</p> : null}
        </form>}
      <small>הרשמה חינמית לעדכונים במייל, עם אפשרות להסרה בכל עת.</small>
    </div>
  </section>;
}
