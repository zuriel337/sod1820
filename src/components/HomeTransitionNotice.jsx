import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { SUPABASE_URL, SUPABASE_ANON } from "../lib/supabase.js";
import { signupAttribution, visitorId } from "../lib/acquisition.js";

// Temporary bridge between the current public home and the 2029 experience.
// Switch ONLY this value at the real, verified cutover. Do not tie it to a date.
const TRANSITION_PHASE = "building"; // "building" | "live"
const LIVE_SEEN_KEY = "sod1820_2029_welcome_seen_v1";

const HOME_PATHS = new Set(["/", "/home-new", "/בית-חדש"]);

export default function HomeTransitionNotice() {
  const { pathname } = useLocation();
  const isHome = HOME_PATHS.has(pathname);
  const [showLiveWelcome, setShowLiveWelcome] = useState(false);
  const [email, setEmail] = useState("");
  const [signupState, setSignupState] = useState("idle"); // idle | sending | new | exists | invalid | error

  useEffect(() => {
    if (!isHome || TRANSITION_PHASE !== "live") {
      setShowLiveWelcome(false);
      return;
    }

    try {
      const seen = window.localStorage.getItem(LIVE_SEEN_KEY) === "1";
      if (!seen) {
        setShowLiveWelcome(true);
        // One-time per browser/device: once it was actually rendered, do not show it again.
        window.localStorage.setItem(LIVE_SEEN_KEY, "1");
      }
    } catch {
      // If storage is unavailable, fail open: show the welcome without blocking the site.
      setShowLiveWelcome(true);
    }
  }, [isHome]);

  async function submitLaunchAlert(e) {
    e?.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value)) {
      setSignupState("invalid");
      return;
    }

    setSignupState("sending");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-signup?format=json`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: SUPABASE_ANON,
          authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          email: value,
          source: "home_2029_launch_alert",
          back: "/",
          acquisition: signupAttribution(),
          visitor_id: visitorId(),
        }),
      });
      const data = await res.json().catch(() => ({ ok: false, status: "error" }));
      setSignupState(
        data.status === "new"
          ? "new"
          : data.status === "exists"
            ? "exists"
            : data.status === "invalid"
              ? "invalid"
              : data.ok
                ? "new"
                : "error"
      );
    } catch {
      setSignupState("error");
    }
  }

  if (!isHome) return null;
  if (TRANSITION_PHASE === "live" && !showLiveWelcome) return null;

  const live = TRANSITION_PHASE === "live";

  return (
    <aside
      aria-label={live ? "ברוכים הבאים למערכת החדשה" : "עולם חדש עומד להיפתח"}
      style={{
        maxWidth: 1120,
        margin: "10px auto 12px",
        padding: "18px 20px",
        border: "1px solid rgba(212,175,55,.38)",
        borderRadius: 18,
        background: "linear-gradient(135deg,rgba(25,16,8,.96),rgba(13,8,22,.96))",
        boxShadow: "0 14px 42px rgba(0,0,0,.28)",
        color: "#f3e7bd",
        direction: "rtl",
        fontFamily: "Assistant, Heebo, sans-serif",
        position: "relative",
        zIndex: 4,
      }}
    >
      {live ? (
        <div style={{ display: "flex", gap: 13, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 520px" }}>
            <div style={{ color: "#e8c84a", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
              👑 המערכת החדשה נפתחה
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.65, color: "#d8cdb7" }}>
              כל מה שהכרתם עדיין כאן — עכשיו הוא מתחבר לעולם מחקר אחד, רציף וחכם יותר.
            </div>
          </div>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
              setShowLiveWelcome(false);
            }}
            style={{
              flex: "0 0 auto",
              textDecoration: "none",
              color: "#1a1205",
              background: "linear-gradient(135deg,#f0d66c,#cfae39)",
              borderRadius: 999,
              padding: "9px 15px",
              fontWeight: 800,
              fontSize: 13.5,
              whiteSpace: "nowrap",
            }}
          >
            התחילו לגלות ←
          </a>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#f0d66c", fontWeight: 900, fontSize: "clamp(21px,4vw,30px)", lineHeight: 1.25, marginBottom: 8 }}>
            עולם חדש עומד להיפתח
          </div>
          <div style={{ color: "#d8cdb7", fontSize: 14.5, marginBottom: 13 }}>
            רוצים לקבל התראה כשהשער ייפתח?
          </div>

          {signupState === "new" ? (
            <div style={{ color: "#d9e9bf", fontWeight: 800, fontSize: 15, padding: "8px 0" }}>
              ✓ נרשמתם. נשלח לכם מייל כשהשער ייפתח.
            </div>
          ) : signupState === "exists" ? (
            <div style={{ color: "#d9e9bf", fontWeight: 800, fontSize: 15, padding: "8px 0" }}>
              ✓ המייל הזה כבר רשום. תקבלו עדכון כשהשער ייפתח.
            </div>
          ) : (
            <form
              onSubmit={submitLaunchAlert}
              style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 560, margin: "0 auto" }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (signupState === "invalid" || signupState === "error") setSignupState("idle");
                }}
                placeholder="האימייל שלך"
                dir="ltr"
                aria-label="כתובת אימייל לקבלת התראה"
                style={{
                  flex: "1 1 250px",
                  minWidth: 210,
                  maxWidth: 360,
                  background: "rgba(255,255,255,.07)",
                  border: `1px solid ${signupState === "invalid" ? "rgba(220,90,70,.75)" : "rgba(212,175,55,.34)"}`,
                  borderRadius: 999,
                  padding: "11px 16px",
                  color: "#fff7dc",
                  fontFamily: "Assistant, Heebo, sans-serif",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="submit"
                disabled={signupState === "sending"}
                style={{
                  cursor: signupState === "sending" ? "default" : "pointer",
                  border: "none",
                  color: "#1a1205",
                  background: "linear-gradient(135deg,#f0d66c,#cfae39)",
                  borderRadius: 999,
                  padding: "11px 19px",
                  fontWeight: 900,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  opacity: signupState === "sending" ? 0.65 : 1,
                }}
              >
                {signupState === "sending" ? "נרשמים…" : "עדכנו אותי"}
              </button>
            </form>
          )}

          {signupState === "invalid" && (
            <div style={{ color: "#e7a093", fontSize: 12.5, marginTop: 8 }}>כתובת המייל לא נראית תקינה.</div>
          )}
          {signupState === "error" && (
            <div style={{ color: "#e7a093", fontSize: 12.5, marginTop: 8 }}>משהו השתבש. נסו שוב בעוד רגע.</div>
          )}
        </div>
      )}
    </aside>
  );
}
