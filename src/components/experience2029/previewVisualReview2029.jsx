import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { resolve2029Palette } from "../../lib/palette.js";
import { setThemePreset, useThemePreset } from "../../lib/themeMode.js";
import "./previewVisualCalibration2029.css";

// Review controls only. All variants use the existing presets and App2029.
export const VISUAL_REVIEW_OPTIONS = Object.freeze([
  { id: "1", name: "כחול · קומפקטי", preset: "dark", detail: "תיקייה בשורה דקה מעל העבודה; כלים צפים למטה." },
  { id: "2", name: "סגול · זכוכית", preset: "dark", detail: "עומק ושקיפות; התיקייה אחרי העבודה וכלים מימין במחשב." },
  { id: "3", name: "טורקיז · פתוח", preset: "dark", detail: "משטח רחב, עם הכלים מתחת למטריצה במחשב." },
  { id: "4", name: "יום · כחול", preset: "light", detail: "התיקייה לצד העבודה במחשב ובשורה אחת בנייד." },
  { id: "5", name: "קלף · קווים דקים", preset: "parchment", detail: "גוונים חמים ומסגרות עדינות; התיקייה מתחת לעבודה." },
  { id: "6", name: "לילה · תוכן בחזית", preset: "dark", detail: "פחות תיבות, יותר רוחב; הספרייה מתחת לעבודה." },
  { id: "7", name: "יום · כלים למעלה", preset: "light", detail: "טורקיז עדין; כלים למעלה במחשב ולמטה בנייד." },
  { id: "8", name: "שחור · אור הכתר", preset: "dark", detail: "שחור עמוק, כתב מואר; זהב, ספיר וטורקיז בתפקידים נפרדים." },
]);
const reviewPages = [
  { label: "דילוגים", href: "/els" },
  { label: "מחשבון", href: "/2029/gematria" },
  { label: "פוסט", href: "/post/mah-kore-nza-hasoara" },
];
const fromUrl = () => new URLSearchParams(location.search).get("visual");
const valid = (id) => VISUAL_REVIEW_OPTIONS.some((option) => option.id === id);

function VisualReview({ initial }) {
  const [selected, setSelected] = useState(initial);
  const [explanations, setExplanations] = useState(false);
  const preset = useThemePreset();
  const palette = resolve2029Palette(preset);
  const option = VISUAL_REVIEW_OPTIONS.find((item) => item.id === selected);
  useEffect(() => {
    document.documentElement.dataset.sodVisualOption = selected;
    setThemePreset(option.preset);
    const url = new URL(location.href);
    url.searchParams.set("visual", selected);
    history.replaceState(history.state, "", url);
    return () => { delete document.documentElement.dataset.sodVisualOption; };
  }, [selected, option.preset]);
  useEffect(() => {
    document.documentElement.dataset.sodReviewExplanations = String(explanations);
    return () => { delete document.documentElement.dataset.sodReviewExplanations; };
  }, [explanations]);
  useEffect(() => {
    const onBack = () => { const id = fromUrl(); if (valid(id)) setSelected(id); };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  return <aside className="sod29-visual-review" dir="rtl" aria-label="השוואת שמונה חלופות עיצוב"
    style={{ "--vr-page": palette.cardRaised, "--vr-ink": palette.ink, "--vr-muted": palette.inkSoft,
      "--vr-line": palette.borderStrong, "--vr-accent": palette.accentText, "--vr-focus": palette.focusRing }}>
    <div className="sod29-visual-review-choice">
      <label htmlFor="sod29-visual-option">חלופה {selected} / {VISUAL_REVIEW_OPTIONS.length}</label>
      <select id="sod29-visual-option" value={selected} onChange={(event) => setSelected(event.target.value)} aria-describedby="sod29-visual-option-detail">
        {VISUAL_REVIEW_OPTIONS.map((item) => <option value={item.id} key={item.id}>{item.id}. {item.name}</option>)}
      </select>
    </div>
    <nav aria-label="אותה חלופה בשלושה דפים אמיתיים">
      {reviewPages.map((page) => <a key={page.href} href={`${page.href}?visual=${selected}`} aria-current={location.pathname === page.href ? "page" : undefined}>{page.label}</a>)}
      <button type="button" aria-pressed={explanations} onClick={() => setExplanations((value) => !value)}>{explanations ? "קפל פתיחים" : "הצג פתיחים"}</button>
    </nav>
    <small id="sod29-visual-option-detail">{option.detail}</small>
  </aside>;
}
export function mountPreviewVisualReview2029() {
  const initial = fromUrl();
  if (!valid(initial) || document.getElementById("sod29-visual-review-host")) return;
  const host = document.createElement("div");
  host.id = "sod29-visual-review-host";
  document.getElementById("root").before(host);
  createRoot(host).render(<VisualReview initial={initial} />);
  // The comparison controls are outside the product frame. Keep its existing
  // fixed rails below them, including when the review toolbar wraps on mobile.
  const observer = new ResizeObserver(() => {
    document.documentElement.style.setProperty("--sod-review-offset", `${host.getBoundingClientRect().height}px`);
  });
  observer.observe(host);
}
