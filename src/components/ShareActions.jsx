import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TYPEFACE } from "../lib/designTokens.js";
import NavigationIcon2029 from "./experience2029/NavigationIcon2029.jsx";
import "./experience2029/contentActions2029.css";

import { use2029Palette } from "../lib/palette2029.js";
import { CHANNELS as CH, SHARE_SITE as SITE, canNativeShare, nativeShareOutcome, pageOwnShareTitle, copyLink, canShareFile, shareImageFile } from "../lib/share.js";
import { createShareIntent, resolveModality } from "../lib/share/shareObject.js";
import { emitShare, shareSlug, attributedShareUrl } from "../lib/share/shareTelemetry.js";
import { canonicalPostShareUrl } from "../lib/publicPostUrls.js";
import { openBarShare } from "../lib/share/barShare2029.js";

// One share window (ZURIEL 19.11.2026): where the 2029 bar is mounted (it marks <html data-share-bar>), a share placed in a page shows one
// "שיתוף" entry that opens the bar's window with exactly these props (same channels, same telemetry). Without the bar the row below stays.
const SHARE_NOUN = Object.freeze({ post: "הפוסט", number: "המספר", gematria_result: "התוצאה", finding: "הממצא", community_message: "ההודעה",
  image: "התמונה", video: "הסרטון", topic: "הנושא", researcher: "דף הכותב", calculator: "החישוב", "or-geula": "העדכון", page: "העמוד" });
// The entry's own look (royal blue like every share, Design V2 §14.2). A React-hoisted <style> (one copy in <head>, deduplicated by href)
// instead of a CSS file: a new CSS asset would be listed by every page that shares, in the entry's preload map (speed law, shell budget).
const SHARE_ENTRY_CSS = `.sod29-root .sod-share-actions.is-entry{display:inline-flex;padding:0;overflow:visible}.sod29-root .sod-share-actions.is-entry .sod-share-entry{gap:8px;padding:0 18px!important;border-radius:999px!important;font-weight:700;color:var(--s29-accent-text)!important;border-color:color-mix(in srgb,var(--s29-accent) 52%,var(--s29-line))!important;background:color-mix(in srgb,var(--s29-accent) 11%,var(--s29-panel))!important}.sod29-root .sod-share-actions.is-entry.is-icon .sod-share-entry,.sod29-root .sod-share-actions.is-entry .sod-share-entry:not(:has(span)){inline-size:44px;padding:0!important}`;
const hasShareBar = () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-share-bar");

// 🔗 ShareActions — רכיב-השיתוף הקנוני היחיד באתר (canonical_ui_components_law).
// כל מסך (מספר/צופן/פוסט/גלריה/כל ישות) מעביר פרמטרים בלבד — לא משכפל קוד שיתוף.
//   type   — סוג הישות (number/code/post/gallery…) — לתיוג ואנליטיקס
//   url    — ה-URL הקנוני לשיתוף (ברירת-מחדל: הכתובת הנוכחית)
//   title  — הכותרת/טקסט השיתוף
//   image  — תמונת ה-OG (הרובוטים מושכים אותה דרך /api/og; משמשת גם לשיתוף-קובץ)
//   channels — אילו ערוצים להציג (ברירת-מחדל: כולם) · compact — אייקונים בלבד · extra — פעולות נוספות
//   force — נשמר לתאימות בלבד; אין לו השפעה (אין ווידג׳ט צף ב־2029)
// שינוי אייקון/טקסט/ערוץ/באג = פעם אחת כאן → מתעדכן בכל האתר.
// מיקום (ZURIEL 18.11.2026): השורה מופיעה בכל מקום שדף מציב אותה. share_placement_law (צף או שורה) נגנז ב־15.9.2026 והווידג׳ט
//    הצף יצא עם Legacy, כך שהכלל הישן הסתיר את השיתוף בדפים רבים בלי תחליף.
// הערוצים באים מ-CHANNELS (lib/share.js) — מקור-אמת אחד.
//
// 🆕 W1 Slice 2 — Share Object (תוספתי, תואם-לאחור לחלוטין):
//   entityId · sourceSurface · subtype · locale · exactState · context · video · poster
// כולם **אופציונליים**. קריאה קיימת שלא מעבירה אותם מתנהגת בדיוק כמו קודם, כולל הטלמטריה.
// הם רק מעשירים את ה-evidence הנשמר תחת meta.share_object (ראה lib/share/shareTelemetry.js).
const ALL = ["native", ...Object.keys(CH), "copy"];

export default function ShareActions({
  type = "page", url, title = "", image = null, channels = ALL, compact = false, extra = null, force = false, style,
  // Share Object (all optional, additive)
  entityId = null, sourceSurface = null, subtype = "share", locale = null, exactState = null, context = null,
  video = null, poster = null, onShare = null, variant = "default",
  iconLabel = "שתף קישור לתמונה", iconCopiedLabel = "הקישור לתמונה הועתק", shareLabel = null, disclosure = null, note = null,
}) {
  const [barShare, setBarShare] = useState(false);
  useEffect(() => {
    if (variant === "royal") return undefined;
    const read = () => setBarShare(hasShareBar());
    read();
    // The frame marks <html data-share-bar> in its own effect, which can run after this one: watch the attribute (frame bytes stay flat).
    const watch = typeof MutationObserver === "function" ? new MutationObserver(read) : null;
    watch?.observe(document.documentElement, { attributes: true, attributeFilter: ["data-share-bar"] });
    return () => watch?.disconnect();
  }, [variant]);
  const P = use2029Palette();
  const visualPalette = use2029Palette();
  const copyTimer = useRef(null);
  const [copyFailed, setCopyFailed] = useState(false);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.href : SITE;
  const fullUrl = url || (type === "post" && typeof document !== "undefined"
    ? canonicalPostShareUrl(currentUrl, document.querySelector('link[rel="canonical"]')?.href) : currentUrl);
  const text = title || pageOwnShareTitle(typeof window !== "undefined" ? window.location : null);
  const canNative = canNativeShare();

  // 🔑 Sharing Foundation repair (Human-Gate 2026-09-05) — תוכן≠יעד: slug=יעד-אמיתי
  // (אותו נירמול בדיוק כמו captureArrival) וזהות-התוכן ב-meta.content_type. הלוגיקה עברה
  // ל-lib/share/shareTelemetry.js כדי שכל משטח-שיתוף יחשב את אותו slug — בלי העתקים.
  const destSlug = useCallback(() => shareSlug(fullUrl, type), [fullUrl, type]);

  // 🧾 Share Intent — תיאור אחד של «מה משותף, מאיפה, ואיך». לא חנות ולא owner.
  const intent = useMemo(() => createShareIntent({
    entityType: type, entityId, canonicalUrl: fullUrl, sourceSurface, subtype, locale,
    title: text, image, video, poster, exactState, context,
  }), [type, entityId, fullUrl, sourceSurface, subtype, locale, text, image, video, poster, exactState, context]);

  // חוזה-שיתוף קנוני: event_type='share' + הערוץ ב-meta.platform (זהה ל-trackShare ולדשבורד
  // האדמין). ⚠️ נשאר track() ולא trackShare() בכוונה — לא מוסיפים קריאת-קרדיט חדשה.
  // ⛔ כל השדות שהאנליטיקס קורא היום נשארים זהים-לחלוטין; ה-evidence העשיר נוסף תוספתית
  //    תחת meta.share_object בלבד (SHARE_ATTRIBUTION_CONTRACT_SYNC).
  const logShare = useCallback((channel, resolved = null) => {
    emitShare({ channel, slug: destSlug(), url: fullUrl, image, contentType: type, intent, resolved });
    try { onShare?.(channel, fullUrl); } catch { /* consumer callback must not break sharing */ }
  }, [type, destSlug, fullUrl, image, intent, onShare]);

  // A share is recorded only when it happened: the system sheet completed (not cancelled, not failed) or the link was copied.
  // The channel links (WhatsApp, Telegram, Facebook…) open the channel itself, whose outcome the page cannot see; they record
  // the opened share, as before.
  // A sheet that could not open falls back to the existing copy action, and says so; a cancelled sheet says nothing and records nothing.
  const [nativeFellBack, setNativeFellBack] = useState(false);
  const native = useCallback(async () => {
    setNativeFellBack(false);
    const outcome = await nativeShareOutcome({ title: text, url: attributedShareUrl(fullUrl, "native") });
    if (outcome === "shared") { logShare("native", resolveModality({ ...intent, modality: "link" }, {})); return; }
    if (outcome === "failed" || outcome === "unsupported") {
      clearTimeout(copyTimer.current);
      const ok = await copyLink(attributedShareUrl(fullUrl, "copy"));
      setCopied(ok); setCopyFailed(!ok); setNativeFellBack(true);
      if (ok) { logShare("copy", resolveModality({ ...intent, modality: "link" }, {})); copyTimer.current = setTimeout(() => { setCopied(false); setNativeFellBack(false); }, 2400); }
    }
  }, [text, fullUrl, logShare, intent]);

  const copy = useCallback(async () => {
    clearTimeout(copyTimer.current);
    const ok = await copyLink(attributedShareUrl(fullUrl, "copy"));
    setCopied(ok); setCopyFailed(!ok);
    if (ok) { logShare("copy", resolveModality({ ...intent, modality: "link" }, {})); copyTimer.current = setTimeout(() => setCopied(false), 1600); }
  }, [fullUrl, logShare, intent]);

  // 🖼️ שיתוף התמונה עצמה כקובץ (הבאנר 1200×630) — כך התצוגה-המקדימה מגיעה מיד, בלי תלות ב-OG.
  //    נתמך בעיקר במובייל (Web Share files). לא-נתמך → נפילה **כנה** להורדת-התמונה, וה-modality
  //    שנרשם הוא זה שבוצע בפועל (resolveModality), לא זה שביקשנו.
  const [imgBusy, setImgBusy] = useState(false);
  const shareImg = useCallback(async () => {
    if (!image || imgBusy) return;
    setImgBusy(true);
    let file = null;
    let blob = null;
    try {
      const res = await fetch(image, { mode: "cors" });
      blob = await res.blob();
      file = new File([blob], "sod1820.png", { type: blob.type || "image/png" });
    } catch { /* נטפל למטה כנפילה */ }
    const resolved = resolveModality({ ...intent, modality: "image_file" }, { canShareFile: Boolean(file && canShareFile(file)) });
    // ⚠️ meta.platform="image" נשמר כפי-שהיה (סמנטיקה היסטורית של האנליטיקס) — ההפרדה
    //    האמיתית בין ערוץ למודאליות נרשמת רק ב-meta.share_object, בלי לשנות פרשנות קיימת.
    //    נרשם רק אחרי שיתוף שהושלם או הורדה שבוצעה — ביטול (AbortError) אינו נרשם.
    try {
      if (file && canShareFile(file)) { await shareImageFile(file, { title: text, text, url: attributedShareUrl(fullUrl, "native") }); logShare("image", resolved); setImgBusy(false); return; }
      const a = document.createElement("a"); a.href = image; a.download = "sod1820.png";
      document.body.appendChild(a); a.click(); a.remove();
      logShare("image", resolved);
    } catch (e) {
      if (e && e.name === "AbortError") { setImgBusy(false); return; }
      try { const a = document.createElement("a"); a.href = image; a.download = "sod1820.png"; document.body.appendChild(a); a.click(); a.remove(); logShare("image", resolved); } catch { /* noop */ }
    }
    setImgBusy(false);
  }, [image, imgBusy, text, fullUrl, logShare, intent]);


  // The bar's window takes the share: the page keeps one entry (icon or "שיתוף"), the window shows the channels, the community option and QR.
  const toBar = (event) => {
    event?.preventDefault?.(); event?.stopPropagation?.();
    const taken = openBarShare({ type, url: fullUrl, title: text, image, entityId, sourceSurface, subtype, locale, exactState, context, video, poster,
      onShare, extra, disclosure, note, label: shareLabel || SHARE_NOUN[type] || "העמוד" });
    if (!taken) { setBarShare(false); if (variant === "icon") { if (canNative) void native(); else void copy(); } }
  };
  if (barShare && variant !== "royal") return (
    <div className={`sod-share-actions is-entry${variant === "icon" ? " is-icon" : ""}`} dir="rtl" style={variant === "icon" ? style : undefined}>
      <style href="sod-share-entry-2029" precedence="medium">{SHARE_ENTRY_CSS}</style>
      <button type="button" className="sod-share-entry" data-action="share" data-share-entry="bar" aria-haspopup="dialog" onClick={toBar}
        title={variant === "icon" ? iconLabel : `שיתוף ${shareLabel || SHARE_NOUN[type] || "העמוד"}`}
        aria-label={variant === "icon" ? iconLabel : `שיתוף ${shareLabel || SHARE_NOUN[type] || "העמוד"}`}>
        <NavigationIcon2029 name="share" size={variant === "icon" ? 16 : 18} />{variant === "icon" || compact ? null : <span>שיתוף</span>}
      </button>
    </div>
  );

  // A contextual unit uses the SAME execution/telemetry with one quiet icon.
  // No image file is fetched implicitly: this action shares the exact unit link.
  // Existing callers keep the original channel row and image-file choice.
  if (variant === "icon") return (
    <div className="sod-share-actions is-icon" dir="rtl" style={{ "--action-success": visualPalette.successText, "--action-danger": visualPalette.dangerText, ...style }}>
      <button type="button" data-action="share" data-share-variant="icon"
        data-state={copied ? "success" : copyFailed ? "error" : "idle"}
        title={copied ? "הקישור הועתק" : iconLabel}
        aria-label={copied ? iconCopiedLabel : copyFailed ? "ההעתקה נכשלה, נסה שוב" : iconLabel}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (canNative) void native(); else void copy(); }}>
        <NavigationIcon2029 name={copied ? "check" : "share"} size={16} />
      </button>
      <span className="sod-action-announcement" role="status" aria-live="polite">{nativeFellBack ? (copied ? "השיתוף לא נפתח. הקישור הועתק." : "השיתוף לא נפתח. אפשר להעתיק את הקישור.") : copied ? iconCopiedLabel : copyFailed ? "ההעתקה נכשלה. נסה שוב." : ""}</span>
    </div>
  );

  // Royal presentation (Design V2 §14.2/§14.4, ZURIEL 19.11.2026): the same actions, telemetry and channels as below, rendered with the shared
  // Royal 2029 button family (.r29-btn, royal2029.css, loaded by the caller): one royal-blue main action, then the channels as equal quiet
  // buttons whose platform marks keep their own colours. Without native sharing the main action copies the link (and no second copy button).
  if (variant === "royal") {
    const announce = nativeFellBack ? (copied ? "השיתוף לא נפתח. הקישור הועתק." : "השיתוף לא נפתח. אפשר להעתיק את הקישור.") : copied ? "הקישור הועתק" : copyFailed ? "ההעתקה נכשלה. נסה שוב." : "";
    const mainIsNative = channels.includes("native") && canNative;
    return (
      <div className="r29-share" data-share-variant="royal" dir="rtl" style={{ "--action-success": visualPalette.successText, "--action-danger": visualPalette.dangerText, ...style }}>
        {mainIsNative
          ? <button type="button" className="r29-btn is-primary is-block" data-action="share" onClick={native}><span className="r29-btn-icon" aria-hidden="true"><NavigationIcon2029 name="share" /></span>שיתוף</button>
          : <button type="button" className="r29-btn is-primary is-block" data-action="copy" data-state={copied ? "success" : copyFailed ? "error" : "idle"} onClick={copy}
              aria-label={copied ? "הועתק" : copyFailed ? "ההעתקה נכשלה, נסה שוב" : "העתקת הקישור"}><span className="r29-btn-icon" aria-hidden="true"><NavigationIcon2029 name={copied ? "check" : "copy"} /></span>{copied ? "הקישור הועתק" : "העתקת הקישור"}</button>}
        <div className="r29-share-grid">
          {channels.filter(c => CH[c]).map(c => {
            const m = CH[c];
            return <a className="r29-btn is-quiet" data-action="share" key={c} href={m.href(attributedShareUrl(fullUrl, c), text)} target="_blank" rel="noopener noreferrer" onClick={() => logShare(c)} aria-label={m.label}>
              <span className="r29-mark" style={{ background: m.brand }} aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d={m.svg} /></svg></span>{m.label}
            </a>;
          })}
          {mainIsNative && channels.includes("copy") ? <button type="button" className="r29-btn is-quiet" data-action="copy" data-state={copied ? "success" : copyFailed ? "error" : "idle"} onClick={copy}
            aria-label={copied ? "הועתק" : copyFailed ? "ההעתקה נכשלה, נסה שוב" : "העתק קישור"}><span className="r29-btn-icon" aria-hidden="true"><NavigationIcon2029 name={copied ? "check" : "copy"} /></span>{copied ? "הועתק" : "העתקה"}</button> : null}
        </div>
        <span className="sod-action-announcement" role="status" aria-live="polite">{announce}</span>
        {extra}
      </div>
    );
  }

  const btn = { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", textDecoration: "none",
    background: P.card, borderWidth: 1, borderStyle: "solid", borderColor: P.border, borderRadius: 999, padding: compact ? "8px 11px" : "8px 15px",
    fontFamily: TYPEFACE.ui, fontSize: 12.5, fontWeight: 800, color: P.ink, minHeight: 44, whiteSpace: "nowrap", flexShrink: 0 };
  const label = (t) => compact ? null : <span>{t}</span>;

  return (
    // שורה אחת: לא נשבר; במסך צר נגלל אופקית עדין (WebkitOverflowScrolling) במקום להתפזר ל-2-3 שורות
    <div className="sod-share-actions" dir="rtl" style={{ "--action-success": visualPalette.successText, "--action-danger": visualPalette.dangerText, display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", alignItems: "center", scrollbarWidth: "none", ...style }}>
      {channels.includes("native") && canNative && (
        <button type="button" data-action="share" onClick={native} title="שתף" aria-label="שתף" style={{ ...btn, background: P.accentBtn, color: P.onAccent, borderColor: "transparent" }}><NavigationIcon2029 name="share" /> {label("שתף")}</button>
      )}
      {/* 🖼️ שתף-תמונה — רק כשיש תמונה ואפשר לשתף בכלל (מובייל). שולח את הכרטיס/באנר עצמו. */}
      {image && canNative && (
        <button type="button" data-action="share" onClick={shareImg} disabled={imgBusy} title="שתף כתמונה" aria-label={imgBusy ? "משתף כתמונה" : "שתף כתמונה"} style={btn}><NavigationIcon2029 name="gallery" /> {label(imgBusy ? "…" : "תמונה")}</button>
      )}
      {channels.filter(c => CH[c]).map(c => {
        const m = CH[c];
        // אייקון-מותג SVG בתוך תג-צבע (זהה ללשונית הצפה) — נשען על CHANNELS (svg+brand) כמקור-אמת יחיד.
        return (
          <a data-action="share" key={c} href={m.href(attributedShareUrl(fullUrl, c), text)} target="_blank" rel="noopener noreferrer" onClick={() => logShare(c)}
            title={m.label} aria-label={m.label} style={btn}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: m.brand, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden focusable="false"><path d={m.svg} /></svg>
            </span> {label(m.label)}
          </a>
        );
      })}
      {channels.includes("copy") && (
        <button type="button" data-action="copy" data-state={copied ? "success" : copyFailed ? "error" : "idle"} onClick={copy} title="העתק קישור" aria-label={copied ? "הועתק" : copyFailed ? "ההעתקה נכשלה, נסה שוב" : "העתק קישור"} style={btn}><NavigationIcon2029 name={copied ? "check" : "copy"} /> {label(copied ? "הועתק" : copyFailed ? "נסה שוב" : "העתק")}</button>
      )}
      <span className="sod-action-announcement" role="status" aria-live="polite">{nativeFellBack ? (copied ? "השיתוף לא נפתח. הקישור הועתק." : "השיתוף לא נפתח. אפשר להעתיק את הקישור.") : copied ? "הקישור הועתק" : copyFailed ? "ההעתקה נכשלה. נסה שוב." : ""}</span>
      {extra}
    </div>
  );
}
