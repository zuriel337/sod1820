import React, { useEffect, useRef, useState } from "react";
import { fetchHomeUpdates } from "../lib/homeUpdates.js";
import { track } from "../lib/tracking.js";
import LatestUpdatesRail from "./LatestUpdatesRail.jsx";

// 📜 «עדכונים אחרונים» לשימוש-חוזר בפוסט/צ'אט — עדשה על אותו source/visibility בדיוק כמו הבית
// (fetchHomeUpdates → LatestUpdatesRail הקנוני). אין feed/query/visibility מקבילים: אם הבית מסתיר
// פריט, הוא מוסתר גם כאן. ברירת-מחדל 10 פריטים + «פתח עוד» (limit מועבר לרכיב הקנוני).
//
// 📊 instrumentation-only: מודד אם הטור/הרצועה באמת נראים, לחיצות, ועומק-גלילה בפוסט.
// אין טבלה חדשה ואין שינוי UI — הכל נכתב ל-visitor_events/events דרך track() הקנוני.
const seen = new Set();
const once = (key, fn) => {
  if (seen.has(key)) return;
  seen.add(key);
  try { fn(); } catch { /* noop */ }
};

function pageContext(explicitSurface) {
  if (typeof window === "undefined") return { surface: explicitSurface || "UNKNOWN", slug: null, layout: "unknown" };
  const path = window.location.pathname || "/";
  const surface = explicitSurface || (/^\/chat\/?$/i.test(path) ? "CHAT" : "POST_PAGE");
  let slug = path.replace(/^\/+|\/+$/g, "") || "home";
  try { slug = decodeURIComponent(slug); } catch { /* keep encoded */ }
  const layout = surface === "POST_PAGE"
    ? (window.matchMedia?.("(min-width:1200px)")?.matches ? "side" : "stacked")
    : (window.matchMedia?.("(min-width:1000px)")?.matches ? "side" : "stacked");
  return { surface, slug: slug.slice(0, 180), layout };
}

export default function LatestUpdatesPanel({ limit = 10, surface: explicitSurface = null }) {
  const [d, setD] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchHomeUpdates()
      .then((r) => { if (alive) setD(r); })
      .catch(() => { if (alive) setD({ posts: [], hints: [], researchers: [], ciphers: [] }); });
    return () => { alive = false; };
  }, []);

  // עצם קיום רכיב «עדכונים אחרונים» במסך/עמוד. בפוסט רחב זה גם proxy לכך שטור-הצד פעיל.
  useEffect(() => {
    const c = pageContext(explicitSurface);
    if (c.surface !== "POST_PAGE" && c.surface !== "CHAT") return;
    once(`layout:${c.surface}:${c.slug}:${c.layout}`, () =>
      track("post_experience", c.slug, "layout_present", {
        surface: c.surface,
        layout: c.layout,
        component: "latest_updates",
      })
    );
  }, [explicitSurface]);

  // חשיפה איכותית ל«עדכונים אחרונים»: לפחות 50% מהרכיב במשך שנייה.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const c = pageContext(explicitSurface);
    let timer = null;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e?.isIntersecting && e.intersectionRatio >= 0.5) {
        if (!timer) timer = setTimeout(() => {
          timer = null;
          once(`latest-impression:${c.surface}:${c.slug}:${c.layout}`, () =>
            track("post_experience", c.slug, "latest_impression", {
              surface: c.surface,
              layout: c.layout,
              threshold: 0.5,
              dwell_ms: 1000,
            })
          );
          io.disconnect();
        }, 1000);
      } else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }, { threshold: [0.5] });
    io.observe(el);
    return () => { if (timer) clearTimeout(timer); io.disconnect(); };
  }, [d, explicitSurface]);

  // עומק גלילה בפוסט — מאפשר לבדוק אם משתמשים עם טור-צד מגיעים פחות עמוק בתוכן.
  useEffect(() => {
    const c = pageContext(explicitSurface);
    if (c.surface !== "POST_PAGE" || typeof window === "undefined") return;
    const thresholds = [25, 50, 75, 90];
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const depth = Math.max(0, Math.min(100, Math.round((window.scrollY / max) * 100)));
      thresholds.forEach((t) => {
        if (depth < t) return;
        once(`scroll:${c.slug}:${c.layout}:${t}`, () =>
          track("post_experience", c.slug, "scroll_depth", {
            surface: c.surface,
            layout: c.layout,
            depth: t,
          })
        );
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [explicitSurface]);

  if (!d) return null;

  // Event delegation — לא נוגעים ברכיב הקנוני LatestUpdatesRail ולא משכפלים handlers.
  const onClickCapture = (e) => {
    const node = e.target?.closest?.("a,button,[role='link']");
    if (!node || !rootRef.current?.contains(node)) return;
    const c = pageContext(explicitSurface);
    const href = node.getAttribute?.("href") || null;
    const label = (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120) || null;
    track("post_experience", c.slug, "latest_click", {
      surface: c.surface,
      layout: c.layout,
      href,
      label,
    });
  };

  return (
    <div ref={rootRef} onClickCapture={onClickCapture} data-analytics="latest-updates-panel">
      <LatestUpdatesRail heading posts={d.posts} convergences={[]} hints={d.hints}
        researchers={d.researchers} ciphers={d.ciphers} limit={limit} />
    </div>
  );
}