import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import EntityPageBase from "./EntityPageBase.jsx";
import { supabase } from "../lib/supabase.js";
import { clearEntityJsonLd } from "../lib/seo.js";

// SEO_GATE_DELEGATE: ./EntityPageBase.jsx
// Search Indexability Contract extension: EntityPageBase already applies the canonical
// number gate. This wrapper adds the sibling phrase decision without changing addressability:
// arbitrary phrase URLs still render, but only public.is_phrase_indexable() may publish them.
function setPhraseRobots(admitted) {
  if (typeof document === "undefined") return;
  let meta = document.head.querySelector('meta[name="robots"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", admitted ? "index, follow" : "noindex, nofollow");
}

// 🚧 PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1
// מעטפת זמנית בלבד: בדף-המספר מסתירים את מונה ה"צפיות" הציבורי ומציגים "אזור בבנייה".
// EntityPageBase נשאר זהה; BOT_READ_NO_SIDE_EFFECT_V1 כבר מונע מקריאת-בוט להזין prominence.
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
  const { phrase = "" } = useParams();

  useEffect(() => {
    let alive = true;
    let decoded = "";
    try { decoded = decodeURIComponent(String(phrase || "")).trim(); }
    catch { decoded = String(phrase || "").trim(); }

    // Numeric pages remain owned by EntityPageBase + is_number_indexable().
    if (!decoded || /^\d+$/.test(decoded)) return undefined;

    // Fail closed while admission is unresolved. This does NOT block the page for humans.
    setPhraseRobots(false);
    if (!supabase) {
      clearEntityJsonLd();
      return undefined;
    }

    supabase.rpc("is_phrase_indexable", { p_phrase: decoded })
      .then(({ data, error }) => {
        if (!alive) return;
        const admitted = !error && data === true;
        setPhraseRobots(admitted);
        if (!admitted) clearEntityJsonLd();
      })
      .catch(() => {
        if (!alive) return;
        setPhraseRobots(false);
        clearEntityJsonLd();
      });

    return () => { alive = false; };
  }, [phrase]);

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
