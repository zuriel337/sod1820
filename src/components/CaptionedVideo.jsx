import React from "react";

// 🎬 נגן-וידאו קנוני עם תמיכת-כתוביות (content_translation_law / video_transcription_law).
// crossorigin="anonymous" → מאפשר טעינת קובצי VTT חוצי-מקור מ-Supabase Storage.
// <track> לכל שפה; עברית ברירת-מחדל (הקהל בעיקר עברית). אם אין כתוביות — נגן רגיל.
// שימוש:  <CaptionedVideo src={url} poster={p} tracks={vttTracks(url)} style={...} />

const LANG_LABEL = {
  he: "עברית", en: "English", ar: "العربية", es: "Español", fr: "Français",
  ru: "Русский", pt: "Português", de: "Deutsch", yi: "ייִדיש",
};

// שפת-האתר הנוכחית → קובעת איזו כתובית פתוחה כברירת-מחדל.
// עכשיו האתר עברי (→ עברית). כשהאתר יעלה לרב-לשוני ויוגדר sod_lang / <html lang> —
// הכתובית מתהפכת אוטומטית לשפת-הצפייה (למשל אנגלית). fallback: עברית.
export function siteLang() {
  try {
    const l = (localStorage.getItem("sod_lang") || document.documentElement.lang || "he");
    return String(l).slice(0, 2).toLowerCase() || "he";
  } catch { return "he"; }
}

// בונה רשימת-כתוביות לפי מוסכמת-האחסון: <basename>.<lang>.vtt ליד ה-mp4.
// langs = השפות שקיים להן קובץ (ברירת-מחדל: עברית בלבד).
export function vttTracks(videoUrl, langs = ["he"]) {
  if (!videoUrl || typeof videoUrl !== "string") return [];
  const base = videoUrl.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, "");
  if (base === videoUrl) return []; // לא זוהתה סיומת-וידאו → בלי מוסכמה
  return (langs || []).map((lang) => ({
    lang,
    label: LANG_LABEL[lang] || lang,
    src: `${base}.${lang}.vtt`,
  }));
}

export default function CaptionedVideo({ src, poster, tracks = [], style, className, videoRef, ...rest }) {
  const hasTracks = tracks && tracks.length > 0;
  // ברירת-המחדל = שפת-האתר אם קיימת לה כתובית; אחרת עברית; אחרת הראשונה.
  const langsAvail = hasTracks ? tracks.map((t) => t.lang) : [];
  const sl = hasTracks ? siteLang() : null;
  const defLang = !hasTracks ? null
    : langsAvail.includes(sl) ? sl
    : langsAvail.includes("he") ? "he"
    : langsAvail[0];
  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      controls
      playsInline
      preload="none"
      // crossOrigin נחוץ רק כשטוענים <track> חוצה-מקור; בלי כתוביות לא מכריחים CORS על הווידאו.
      crossOrigin={hasTracks ? "anonymous" : undefined}
      className={className}
      style={style}
      {...rest}
    >
      {hasTracks && tracks.map((t) => (
        <track
          key={t.lang}
          kind="subtitles"
          src={t.src}
          srcLang={t.lang}
          label={t.label || LANG_LABEL[t.lang] || t.lang}
          default={t.lang === defLang}
        />
      ))}
    </video>
  );
}
