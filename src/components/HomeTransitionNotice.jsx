import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

// Temporary bridge between the current public home and the 2029 experience.
// Switch ONLY this value at the real, verified cutover. Do not tie it to a date.
const TRANSITION_PHASE = "building"; // "building" | "live"
const LIVE_SEEN_KEY = "sod1820_2029_welcome_seen_v1";

const HOME_PATHS = new Set(["/", "/home-new", "/בית-חדש"]);

export default function HomeTransitionNotice() {
  const { pathname } = useLocation();
  const isHome = HOME_PATHS.has(pathname);
  const [showLiveWelcome, setShowLiveWelcome] = useState(false);

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

  if (!isHome) return null;
  if (TRANSITION_PHASE === "live" && !showLiveWelcome) return null;

  const live = TRANSITION_PHASE === "live";

  return (
    <aside
      aria-label={live ? "ברוכים הבאים למערכת החדשה" : "SOD1820 נבנה מחדש"}
      style={{
        maxWidth: 1120,
        margin: "10px auto 12px",
        padding: "14px 18px",
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
      <div style={{ display: "flex", gap: 13, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 520px" }}>
          <div style={{ color: "#e8c84a", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
            {live ? "👑 המערכת החדשה נפתחה" : "🏗️ SOD1820 משתנה"}
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.65, color: "#d8cdb7" }}>
            {live
              ? "כל מה שהכרתם עדיין כאן — עכשיו הוא מתחבר לעולם מחקר אחד, רציף וחכם יותר."
              : "האתר שאתם מכירים נבנה מחדש מבפנים. מספרים, צפנים, מקורות, אירועים ורזיאל מתחברים בהדרגה למערכת מחקר אחת."}
          </div>
        </div>

        <a
          href={live ? "#" : "#build-progress"}
          onClick={live ? (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
            setShowLiveWelcome(false);
          } : undefined}
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
          {live ? "התחילו לגלות ←" : "מה נבנה עכשיו ←"}
        </a>
      </div>
    </aside>
  );
}
