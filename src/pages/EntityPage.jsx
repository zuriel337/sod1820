import React, { useLayoutEffect, useRef } from "react";
import EntityPageBase from "./EntityPageBase.jsx";

// 🚧 PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1
// מעטפת זמנית בלבד: בדף-המספר מסתירים את מונה ה"צפיות" הציבורי ומציגים "אזור בבנייה".
// EntityPageBase נשאר זהה ולכן logView/track/Traffic Intelligence ממשיכים למדוד את הניסוי.
function scrubPublicTrafficCounter(root) {
  if (!root) return;
  const labels = Array.from(root.querySelectorAll("span")).filter(
    el => el.childElementCount === 0 && String(el.textContent || "").trim() === "צפיות"
  );

  for (const label of labels) {
    const pill = label.parentElement;
    const group = pill?.parentElement;
    if (!pill || !group) continue;
    const hasConnectionsSibling = Array.from(group.querySelectorAll("span")).some(
      el => el.childElementCount === 0 && String(el.textContent || "").trim() === "חיבורים"
    );
    if (!hasConnectionsSibling) continue;

    const icon = document.createElement("span");
    icon.textContent = "🚧";
    icon.style.fontSize = "13px";

    const text = document.createElement("span");
    text.textContent = "אזור בבנייה";
    text.style.fontSize = "12.5px";
    text.style.fontWeight = "800";

    pill.replaceChildren(icon, text);
    pill.dataset.trafficSurfacePaused = "true";
    pill.setAttribute("aria-label", "מונה התנועה — אזור בבנייה");
    pill.title = "נתוני התנועה ממשיכים להימדד ברקע אך אינם מוצגים כרגע";
    return;
  }
}

export default function EntityPage(props) {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof MutationObserver === "undefined") return undefined;
    scrubPublicTrafficCounter(root);
    const observer = new MutationObserver(() => scrubPublicTrafficCounter(root));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} data-number-traffic-surface-experiment="paused">
      <EntityPageBase {...props} />
    </div>
  );
}
