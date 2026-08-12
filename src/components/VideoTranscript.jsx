import React, { useEffect, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getVideoTranscripts } from "../lib/supabase.js";

// 🎬 תמלול רב-לשוני לסרטון (video_transcription_law) — רכיב קנוני יחיד.
// לשוניות-שפה מעל תיבת-תמלול; RTL ל-he/ar, LTR לשאר. theme-aware (usePalette).
// שימוש: <VideoTranscript videoKey="Dbqu_0tssh1" title="..." /> (או yt / sourceUrl).
// אם אין תמלול מפורסם — לא מרנדר כלום (חינני).

const LANG = {
  he: { name: "עברית", flag: "🇮🇱", rtl: true },
  en: { name: "English", flag: "🇬🇧", rtl: false },
  ar: { name: "العربية", flag: "🇸🇦", rtl: true },
  es: { name: "Español", flag: "🇪🇸", rtl: false },
  fr: { name: "Français", flag: "🇫🇷", rtl: false },
  ru: { name: "Русский", flag: "🇷🇺", rtl: false },
  pt: { name: "Português", flag: "🇵🇹", rtl: false },
  de: { name: "Deutsch", flag: "🇩🇪", rtl: false },
  yi: { name: "ייִדיש", flag: "✡️", rtl: true },
  it: { name: "Italiano", flag: "🇮🇹", rtl: false },
  nl: { name: "Nederlands", flag: "🇳🇱", rtl: false },
};
const langMeta = (l) => LANG[l] || { name: l, flag: "🌐", rtl: false };
// סדר-תצוגה מועדף (המקור נדחף לראש ממילא)
const ORDER = ["he", "en", "ar", "es", "fr", "ru", "pt", "de", "yi", "it", "nl"];

export default function VideoTranscript({ videoKey, yt, sourceUrl, title, defaultOpen = false }) {
  const P = usePalette();
  const [rows, setRows] = useState(null); // null=טוען, []=אין
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    let alive = true;
    getVideoTranscripts({ videoKey, yt, sourceUrl })
      .then((data) => { if (!alive) return; setRows(data || []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [videoKey, yt, sourceUrl]);

  useEffect(() => {
    if (!rows || !rows.length) return;
    // ברירת-מחדל: שפת-המקור (is_original) → אחרת עברית → אחרת הראשונה
    const orig = rows.find((r) => r.is_original) || rows.find((r) => r.lang === "he") || rows[0];
    setActive((cur) => cur || orig.lang);
  }, [rows]);

  if (rows === null || rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => {
    if (a.is_original && !b.is_original) return -1;
    if (!a.is_original && b.is_original) return 1;
    return ORDER.indexOf(a.lang) - ORDER.indexOf(b.lang);
  });
  const cur = sorted.find((r) => r.lang === active) || sorted[0];
  const meta = langMeta(cur.lang);

  const copy = () => { try { navigator.clipboard.writeText(cur.transcript || ""); } catch { /* noop */ } };

  return (
    <section style={{ marginTop: 14, direction: "rtl" }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        background: "none", border: "none", cursor: "pointer", padding: "6px 0",
        color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 800,
      }}>
        <span>📝 תמלול הסרטון</span>
        <span style={{ color: P.inkSoft, fontWeight: 700, fontSize: 12 }}>
          · {sorted.length} {sorted.length === 1 ? "שפה" : "שפות"}
        </span>
        <span style={{ marginInlineStart: "auto", color: P.inkSoft, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          border: `1px solid ${P.border}`, borderRadius: 12, padding: 12,
          background: P.cardBg || P.cardGrad, marginTop: 6,
        }}>
          {/* לשוניות-שפה */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {sorted.map((r) => {
              const m = langMeta(r.lang);
              const on = r.lang === cur.lang;
              return (
                <button key={r.lang} onClick={() => setActive(r.lang)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                  fontFamily: F.heading, fontSize: 12.5, fontWeight: 700,
                  border: `1px solid ${on ? P.accent : P.border}`,
                  background: on ? P.accent : "transparent",
                  color: on ? "#fff" : P.accentText,
                }}>
                  <span>{m.flag}</span><span>{m.name}</span>
                  {r.is_original && <span style={{ fontSize: 10, opacity: 0.85 }}>· מקור</span>}
                </button>
              );
            })}
          </div>

          {/* גוף התמלול */}
          <div dir={meta.rtl ? "rtl" : "ltr"} style={{
            textAlign: meta.rtl ? "right" : "left",
            color: P.ink, fontFamily: F.body || F.royal, fontSize: 15, lineHeight: 1.85,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {cur.transcript}
          </div>

          {/* מטא + פעולות */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginTop: 12,
            paddingTop: 10, borderTop: `1px solid ${P.border}`,
            color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 600,
          }}>
            <button onClick={copy} style={{
              background: "none", border: `1px solid ${P.border}`, borderRadius: 8,
              color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 700,
              padding: "4px 10px", cursor: "pointer",
            }}>📋 העתק</button>
            <span>
              {cur.is_original
                ? "תמלול מקור"
                : `תורגם אוטומטית${cur.translated_by ? ` (${cur.translated_by.replace("anthropic:", "AI · ")})` : ""}`}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
