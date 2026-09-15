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
        window.localStorage.setItem(LIVE_SEEN_KEY, "1");
      }
    } catch {
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
        maxWidth: 980,
        margin: "5px auto 7px",
        padding: "8px 12px",
        border: "1px solid rgba(212,175,55,.34)",
        borderRadius: 12,
        background: "linear-gradient(135deg,rgba(25,16,8,.96),rgba(13,8,22,.96))",
        boxShadow: "0 7px 22px rgba(0,0,0,.22)",
        color: "#f3e7bd",
        direction: "rtl",
        fontFamily: "Assistant, Heebo, sans-serif",
        position: "relative",
        zIndex: 50,
      }}
    >
      {live ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <div style={{ color: "#e8c84a", fontWeight: 900, fontSize: 15 }}>
            👑 המערכת החדשה נפתחה
          </div>
          <div style={{ fontSize: 13, color: "#d8cdb7" }}>
            כל מה שהכרתם עדיין כאן — עכשיו מחובר לעולם מחקר אחד.
          </div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
              setShowLiveWelcome(false);
            }}
            style={{
              textDecoration: "none",
              color: "#1a1205",
              background: "linear-gradient(135deg,#f0d66c,#cfae39)",
              borderRadius: 999,
              padding: "6px 11px",
              fontWeight: 900,
              fontSize: 12.5,
              whiteSpace: "nowrap",
            }}
          >
            התחילו לגלות ←
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ color: "#f0d66c", fontWeight: 900, fontSize: "clamp(16px,2.2vw,20px)", lineHeight: 1.15, whiteSpace: "nowrap" }}>
            עולם חדש עומד להיפתח
          </div>

          {signupState === "new" ? (
            <div style={{ color: "#d9e9bf", fontWeight: 800, fontSize: 13 }}>
              ✓ נרשמתם. נשלח לכם מייל כשהשער ייפתח.
            </div>
          ) : signupState === "exists" ? (
            <div style={{ color: "#d9e9bf", fontWeight: 800, fontSize: 13 }}>
              ✓ המייל כבר רשום. תקבלו עדכון כשהשער ייפתח.
            </div>
          ) : (
            <form
              onSubmit={submitLaunchAlert}
              style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}
            >
              <span style={{ color: "#cfc4ad", fontSize: 12.5, whiteSpace: "nowrap" }}>לקבלת התראה:</span>
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
                  width: 210,
                  maxWidth: "58vw",
                  background: "rgba(255,255,255,.07)",
                  border: `1px solid ${signupState === "invalid" ? "rgba(220,90,70,.75)" : "rgba(212,175,55,.32)"}`,
                  borderRadius: 999,
                  padding: "7px 11px",
                  color: "#fff7dc",
                  fontFamily: "Assistant, Heebo, sans-serif",
                  fontSize: 13,
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
                  padding: "7px 12px",
                  fontWeight: 900,
                  fontSize: 12.5,
                  whiteSpace: "nowrap",
                  opacity: signupState === "sending" ? 0.65 : 1,
                }}
              >
                {signupState === "sending" ? "נרשמים…" : "עדכנו אותי"}
              </button>
            </form>
          )}

          {signupState === "invalid" && <div style={{ color: "#e7a093", fontSize: 11.5 }}>מייל לא תקין.</div>}
          {signupState === "error" && <div style={{ color: "#e7a093", fontSize: 11.5 }}>נסו שוב בעוד רגע.</div>}
        </div>
      )}
    </aside>
  );
}
