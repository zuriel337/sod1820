import React, { useEffect, useState } from "react";
import "./bookFullscreen2029.css";

function activeFullscreenElement() {
  if (typeof document === "undefined") return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export default function BookFullscreenButton2029({ targetRef, fallbackHref, className = "", controls }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(activeFullscreenElement() === targetRef?.current);
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, [targetRef]);

  const toggleFullscreen = async () => {
    const target = targetRef?.current;
    try {
      if (activeFullscreenElement()) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
        return;
      }
      const enter = target?.requestFullscreen || target?.webkitRequestFullscreen;
      if (enter) {
        await enter.call(target);
        return;
      }
    } catch {
      // Embedded/mobile browsers can reject the API. The original PDF is the fallback.
    }
    if (fallbackHref) window.open(fallbackHref, "_blank", "noopener,noreferrer");
  };

  return <button
    type="button"
    className={`book-fullscreen29-button ${className}`.trim()}
    onClick={toggleFullscreen}
    aria-pressed={active}
    aria-controls={controls}
    title={active ? "יציאה ממסך מלא" : "פתיחת הספר במסך מלא"}
  >
    <span aria-hidden="true">{active ? "⊡" : "⛶"}</span>
    {active ? "יציאה ממסך מלא" : "מסך מלא"}
  </button>;
}
