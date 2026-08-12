import React from "react";

// 🎬 נגן-וידאו קנוני עם תמיכת-כתוביות (content_translation_law / video_transcription_law).
// crossorigin="anonymous" → מאפשר טעינת קובצי VTT חוצי-מקור מ-Supabase Storage.
// <track> לכל שפה; עברית ברירת-מחדל (הקהל בעיקר עברית). אם אין כתוביות — נגן רגיל.
// שימוש:  <CaptionedVideo src={url} poster={p} tracks={vttTracks(url)} style={...} />

const LANG_LABEL = {
  he: "עברית", en: "English", ar: "العربية", es: "Español", fr: "Français",
  ru: "Русский", pt: "Português", de: "Deutsch", yi: "ייִדיש",
};

// בונה רשימת-כתוביות לפי מוסכמת-האחסון: <basename>.<lang>.vtt ליד ה-mp4.
// langs = השפות שקיים להן קובץ (ברירת-מחדל: עברית בלבד). he תמיד default.
export function vttTracks(videoUrl, langs = ["he"]) {
  if (!videoUrl || typeof videoUrl !== "string") return [];
  const base = videoUrl.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, "");
  if (base === videoUrl) return []; // לא זוהתה סיומת-וידאו → בלי מוסכמה
  return (langs || []).map((lang) => ({
    lang,
    label: LANG_LABEL[lang] || lang,
    src: `${base}.${lang}.vtt`,
    default: lang === "he",
  }));
}

export default function CaptionedVideo({ src, poster, tracks = [], style, className, videoRef, ...rest }) {
  const hasTracks = tracks && tracks.length > 0;
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
          default={!!t.default}
        />
      ))}
    </video>
  );
}
