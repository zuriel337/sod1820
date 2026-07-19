// ===== DESIGN TOKENS — מקור אמת יחיד לעיצוב SOD1820 =====
// פלטת זהב-כהה מלכותי. נשמרת מהאתר הקיים.

export const C = {
  bg:           "#0C0818",
  bgGlow:       "#1A1230",
  gold:         "#d4af37",
  goldLight:    "#e8c840",
  goldBright:   "#f6e27a",
  goldDim:      "#9a7818",
  goldDark:     "#3a2200",
  goldDeep:     "#1a0e00",
  crimson:      "#7a1320",
  crimsonLight: "#a01f2e",
  royal:        "#3d1f5c",
  royalLight:   "#6b3fa0",
  surface:      "#0d0a0e",
  surface2:     "#140f0c",
  border:       "rgba(212,175,55,0.18)",
  borderGold:   "rgba(212,175,55,0.38)",
  muted:        "#cfc9d6",
  faint:        "#1a0f0a",
  danger:       "#8B2020",
};

// 🖼 «אבן-לילה חמה» — הרקע הקבוע של הגלריות (זרם + אוצרות), גם במצב יום (בחירת צוריאל):
// חום-אספרסו עמוק (לא שחור) + הילת-זהב עדינה למעלה. שקט, קטיפתי, לא מתחרה בתמונות.
export const GALLERY_BG = "radial-gradient(70% 45% at 50% 0%, rgba(212,175,55,0.07), transparent 60%), linear-gradient(180deg, #16110c, #0d0a07 78%)";
export const GALLERY_BG_BASE = "#0d0a07";

export const F = {
  royal:   "'Heebo', sans-serif",
  regal:   "'Heebo', sans-serif",
  cinzel:  "'Heebo', sans-serif",
  heading: "'Heebo', sans-serif",
  body:    "'Heebo', sans-serif",
  mono:    "'Courier New', monospace",
};

// ===== טוקני טיפוגרפיה — "רצפת קריאוּת" מערכתית (העץ הראשון) =====
// מינימום גודל+משקל לכל תפקיד טקסט, שלא יהיה דק/קטן מדי. להחיל בכל האתר בהדרגה.
export const T = {
  eyebrow: { fontSize: 13, fontWeight: 700, letterSpacing: 2 },   // תוויות-על (היה 10-12 דק)
  micro:   { fontSize: 13.5, fontWeight: 600 },                    // טקסט משני קטן
  body:    { fontSize: 15.5, fontWeight: 500, lineHeight: 1.7 },   // גוף רגיל
  lead:    { fontSize: 18, fontWeight: 500, lineHeight: 1.65 },    // משפט מוביל
};

export const LOGO_URL = "/logo.png";

// ===== GEMATRIA =====
export const GEM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
export const calcGem = w => [...w].reduce((s, c) => s + (GEM[c] || 0), 0);

export const KEY_NUMBERS = {
  1:    "האחד — שורש הכל",
  3:    "שלמות / חשכה / קוד הבריאה 333",
  7:    "חותם הבריאה",
  14:   "דוד מלכות",
  26:   "יהוה",
  40:   "מ — זרע שינוי",
  45:   "גאולה",
  358:  "משיח = נחש",
  400:  "ת — חותם התפשטות",
  786:  "תשפ\"ו — השנה שלנו!",
  1237: "התגלות — לילה כיום יאיר",
  1820: "סוד השם יהוה × עמים",
};

// מספר "חם"/משמעותי = אחד ממספרי הליבה (KEY_NUMBERS). אחרת — "קר", ולא מציגים אותו על פוסטים.
export const isWarmNumber = n => KEY_NUMBERS[n] != null;

// ===== GLOBAL CSS =====
export const GLOBAL_CSS = `
  /* 🔤 רצפת קריאוּת גלובלית — כל טקסט בלי גודל/משקל מפורש יורש בסיס נוח (עמודים חדשים מסתדרים לבד) */
  html { font-size: 16.5px; -webkit-text-size-adjust: 100%; }
  body { font-weight: 500; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  p { line-height: 1.7; }
  small { font-size: 0.85em; }
  @keyframes acc-blink { 0%,100% { opacity: .35; } 50% { opacity: 1; } }

  .sod-inflate {
    display: inline-block;
    transition: transform 0.16s ease, text-shadow 0.18s ease;
    cursor: pointer;
  }
  .sod-inflate:hover {
    transform: scale(1.09);
    text-shadow: 0 0 10px currentColor;
  }
  .sod-inflate:active {
    transform: scale(0.95);
    opacity: 0.8;
  }
  @keyframes light-rays {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to   { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes hero-shimmer {
    0%, 100% { opacity: 0.88; }
    50%       { opacity: 1; filter: drop-shadow(0 0 18px rgba(246,226,122,0.35)); }
  }
  @keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes activity-fade {
    0%, 100% { opacity: 0; transform: translateY(6px); }
    10%, 90% { opacity: 1; transform: translateY(0); }
  }
`;

// ===== POST CONTENT CSS =====
export const POST_CONTENT_CSS = `
  .sod-post-content { direction: rtl; color: #ede4d3; overflow-x: hidden; font-family: 'Heebo', sans-serif; text-align: center; }
  .sod-post-content h1, .sod-post-content h2, .sod-post-content h3,
  .sod-post-content h4, .sod-post-content h5 {
    font-family: 'Heebo', sans-serif;
    font-weight: 700;
    line-height: 1.3;
    margin: 2.4em 0 0.9em;
    letter-spacing: 0;
    text-align: center;
  }
  .sod-post-content h1 {
    color: ${C.goldBright};
    font-size: clamp(18px, 2.6vw, 27px);
    text-shadow: 0 0 40px ${C.goldDeep};
  }
  .sod-post-content h2 {
    color: ${C.goldLight};
    font-size: clamp(14px, 2.1vw, 22px);
  }
  .sod-post-content h3 {
    color: ${C.gold};
    font-size: clamp(14px, 1.8vw, 19px);
  }
  .sod-post-content p {
    color: #ede4d3;
    font-family: 'Heebo', sans-serif;
    font-size: 16.5px;
    line-height: 2.1;
    margin: 0 0 1.4em;
  }
  .sod-post-content a {
    color: ${C.gold} !important;
    text-decoration: underline !important;
    text-underline-offset: 3px;
    display: inline-block;
    transition: color 0.18s, transform 0.16s ease, text-shadow 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .sod-post-content a:hover,
  .sod-post-content a:focus {
    color: ${C.goldBright} !important;
    transform: scale(1.07);
    text-shadow: 0 0 12px ${C.gold};
  }
  .sod-post-content a:active {
    color: #fff !important;
    transform: scale(0.95);
    opacity: 0.85;
  }
  .sod-post-content a:visited { color: ${C.goldLight} !important; }
  /* canonical_colors_law — כפתורי זהב בפוסט: טקסט כהה, לעולם לא זהב-על-זהב */
  .sod-post-content a[style*="gradient"],
  .sod-post-content a[style*="#e9c84a"],
  .sod-post-content a[style*="#d4af37"],
  .sod-post-content a[style*="#caa030"],
  .sod-post-content a[style*="#ffe9a8"],
  .sod-post-content a[style*="#e8c840"] {
    color: #1a0e00 !important;
    text-shadow: none !important;
  }
  .sod-post-content a[style*="gradient"]:hover,
  .sod-post-content a[style*="#e9c84a"]:hover {
    color: #1a0e00 !important; text-shadow: none !important;
  }
  /* 👑 sod-post-cta — כפתור קריאה-לפעולה קנוני בפוסטים (post_cta_law). מחליף את הזיהוי-לפי-hex
     השביר למעלה: קלאס דטרמיניסטי, תיבת-זהב + טקסט כהה, קריא בשני המצבים.
     שימוש: <a class="sod-post-cta" href="/codes">📚 טקסט ←</a>. ⚠️ קנוני בשני עותקי POST_CONTENT_CSS. */
  .sod-post-content a.sod-post-cta {
    display: inline-flex !important; align-items: center; gap: 8px;
    background: linear-gradient(180deg, #e8c84a, #c9a227) !important;
    color: #1a0e00 !important; text-decoration: none !important;
    border: none !important; border-radius: 999px; padding: 13px 28px; margin: 8px auto;
    font-weight: 800; font-size: 16px; box-shadow: 0 4px 16px rgba(0,0,0,.28);
    transform: none !important; text-shadow: none !important;
  }
  .sod-post-content a.sod-post-cta:hover { color: #1a0e00 !important; filter: brightness(1.06); transform: translateY(-1px) !important; text-shadow: none !important; }
  [data-theme="light"] .sod-post-content.clean a.sod-post-cta,
  [data-theme="light"] .sod-post-content a.sod-post-cta { color: #1a0e00 !important; background: linear-gradient(180deg, #e8c84a, #c9a227) !important; }
  .sod-post-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 2em auto;
    border-radius: 2px;
    border: 1px solid ${C.border};
    filter: brightness(0.85) sepia(0.15);
  }
  .sod-post-content ul, .sod-post-content ol {
    padding-right: 1.6em;
    margin: 0 0 1.4em;
  }
  .sod-post-content li {
    color: #ede4d3;
    font-family: 'Heebo', sans-serif;
    font-size: 16.5px;
    line-height: 2;
    margin-bottom: 0.4em;
  }
  .sod-post-content blockquote {
    border-right: 3px solid ${C.gold};
    margin: 2em 0;
    padding: 16px 24px;
    background: ${C.surface};
    border-radius: 0 2px 2px 0;
  }
  .sod-post-content blockquote p {
    color: ${C.goldLight};
    font-style: italic;
    margin: 0;
  }
  .sod-post-content code {
    background: ${C.faint};
    color: ${C.goldLight};
    padding: 2px 6px;
    border-radius: 2px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }
  .sod-post-content pre {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 2px;
    padding: 20px;
    overflow-x: auto;
    margin: 1.6em 0;
  }
  .sod-post-content pre code { background: none; padding: 0; }
  .sod-post-content hr {
    border: none;
    border-top: 1px solid ${C.border};
    margin: 2.5em 0;
  }
  .sod-post-content strong { color: ${C.goldLight}; font-weight: 700; }
  .sod-post-content em { font-style: italic; color: ${C.gold}; }
  .sod-post-content figure { margin: 2em 0; }
  .sod-post-content figcaption {
    text-align: center;
    font-size: 14px;
    color: ${C.muted};
    font-family: 'Heebo', sans-serif;
    margin-top: 8px;
    letter-spacing: 1px;
  }
  .sod-post-content .wp-block-quote { border-right: 3px solid ${C.gold}; }

  /* ── iframes & embeds ── */
  .sod-post-content iframe {
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 16/9;
    height: auto !important;
    margin: 1.5em auto !important;
    border: none;
    direction: ltr;
  }
  .sod-post-content .wp-block-embed,
  .sod-post-content figure.wp-block-embed {
    max-width: 100%;
    margin: 2em auto;
    direction: ltr;
  }
  .sod-post-content .wp-block-embed__wrapper {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
  }
  .sod-post-content .wp-block-embed__wrapper iframe {
    position: absolute;
    top: 0; left: 0;
    width: 100% !important;
    height: 100% !important;
    aspect-ratio: unset;
    margin: 0 !important;
  }
  .sod-post-content .embed-youtube,
  .sod-post-content span.embed-youtube {
    display: block !important;
    max-width: 100% !important;
    margin: 1.5em auto !important;
    text-align: center;
  }
  .sod-post-content .embed-youtube iframe {
    width: 100% !important;
    max-width: 100% !important;
    aspect-ratio: 16/9;
    height: auto !important;
  }
  .sod-post-content .wp-video {
    width: auto !important;
    max-width: min(100%, 360px) !important;
    margin: 1.5em auto !important;
    display: block !important;
  }
  .sod-post-content .post-author {
    display: block;
    text-align: right;
    color: #c9a535;
    font-style: italic;
    font-family: 'Heebo', sans-serif;
    font-size: 14px;
    letter-spacing: 1px;
    margin: 6px 0;
    opacity: 0.92;
  }
  .sod-post-content:not(.clean) div[style*="height"] { height: auto !important; max-height: 24px !important; }
  .sod-post-content:not(.clean) div[style*="min-height"] { min-height: 0 !important; }
  .sod-post-content .elementor-spacer,
  .sod-post-content .elementor-spacer-inner { height: 16px !important; }
  /* ── ריבוע גימטריה קנוני (post_gematria_box_law) ──
     פתרון שורש ל-legacy_content_protocol §1: כל הסגנון (כולל line-height) חי בקלאס,
     כך שה-divים אינם מכילים "height" ב-inline ולא נתפסים בכלל הניקוי שמוחץ ל-24px.
     ה-override למטה (ספציפיות 0,3,1 > 0,2,1 של הכלל המוחץ) הוא הגנה נוספת אם בכל זאת
     ייכנס height inline. שימוש: <div class="sod-gematria-box"> … </div>. */
  .sod-post-content .sod-gematria-box {
    max-width: 560px; margin: 30px auto; padding: 16px 18px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(212,175,55,0.10), rgba(8,5,16,0.40));
    border: 1px solid rgba(212,175,55,0.45); direction: rtl; text-align: right;
  }
  .sod-post-content .sod-gematria-box div[style*="height"] { max-height: none !important; height: auto !important; }
  .sod-post-content .sod-gematria-box .gb-title { font-weight: 800; color: ${C.goldBright}; font-size: 1.02em; margin-bottom: 10px; }
  .sod-post-content .sod-gematria-box .gb-rows { color: #e6e0d2; line-height: 1.95; }
  .sod-post-content .sod-gematria-box .gb-rows > div { margin-top: 6px; }
  .sod-post-content .sod-gematria-box .gb-rows > div:first-child { margin-top: 0; }
  .sod-post-content .sod-gematria-box .gb-note { margin-top: 10px; font-size: 0.85em; color: #a59b80; line-height: 1.6; }
  .sod-post-content .sod-gematria-box b { color: ${C.goldBright}; }
  /* convergence_display_law (חקוק): כל שורה = ביטוי אחד + הערך שלו מימין (גלולת-זהב). */
  .sod-post-content .sod-gematria-box .gb-line { display: flex; align-items: baseline; gap: 10px; margin-top: 8px; }
  .sod-post-content .sod-gematria-box .gb-line:first-child { margin-top: 0; }
  .sod-post-content .sod-gematria-box .gb-val { flex: 0 0 auto; min-width: 56px; text-align: center; font-weight: 800; color: #241a02 !important; background: linear-gradient(135deg, #ffd86b, #d8b34a); border-radius: 8px; padding: 2px 9px; font-size: 0.94em; font-variant-numeric: tabular-nums; }
  .sod-post-content .sod-gematria-box .gb-line .gb-val a { color: #241a02 !important; text-decoration: none !important; border: 0 !important; }
  .sod-post-content .sod-gematria-box .gb-phrase { flex: 1 1 auto; line-height: 1.55; min-width: 0; }

  /* 📜 פסוק — קופסת ציטוט קנונית (post_verse_law): תקין בשני המצבים (כהה+בהיר) בלי inline.
     שימוש: <blockquote class="sod-verse">…«פסוק»… <b>מילים מודגשות</b></blockquote>. */
  .sod-post-content .sod-verse {
    max-width: 620px; margin: 18px auto; padding: 12px 18px; border-radius: 8px;
    border-inline-start: 3px solid ${C.goldBright}; direction: rtl; text-align: right;
    background: rgba(212,175,55,0.06); color: #f0e9d6;
    font-size: 1.05em; line-height: 2.05; font-weight: 500;
  }
  .sod-post-content .sod-verse b { color: ${C.goldBright}; font-weight: 700; }
  [data-theme="light"] .sod-post-content .sod-verse {
    border-inline-start-color: #b07d12; background: rgba(176,125,18,0.07); color: #2a2416;
  }
  [data-theme="light"] .sod-post-content .sod-verse b { color: #8a6410; }

  /* post_text_colors_law v3 (חקוק): עיצוב ברירת-המחדל של פוסט «של המציאות» — לא וורדפרס.
     טקסט רץ: לבן רך, משקל רגיל, נעים לעין. זהב שמור לערכים ולאקסנטים — לא הכל צהוב.
     גימטריה = data-gem → פותחת את מגירת המספר בתוך הדף (לא ניווט החוצה).
     ביטוי: בצבע הטקסט + קו-זהב מנוקד עדין · ערך מספרי: זהב. מצב בהיר: טקסט כהה, גימטריה אדומה. */
  .sod-post-content.clean { color: #ffffff; }
  .sod-post-content.clean p { color: #ffffff; font-size: 16.5px; line-height: 2.1; font-weight: 400; }
  [data-theme="light"] .sod-post-content.clean p { color: #1c1c1c; }
  .sod-post-content.clean .sod-gemlink { color: inherit !important; font-weight: 600; border-bottom: 1px dotted rgba(255,216,107,.6); }
  .sod-post-content.clean .sod-numlink { color: #ffd86b !important; font-weight: 700; }
  .sod-post-content.clean .sod-gematria-box .gb-rows { font-weight: 400; line-height: 2.05; }
  .sod-post-content.clean .sod-gematria-box .gb-rows b { color: #ffd86b; }
  .sod-post-content.clean a[href^="/number/"] { color: #ffd86b !important; font-weight: 600; text-decoration: none !important; border-bottom: 1px dotted rgba(255,216,107,.55); display: inline; }
  [data-theme="light"] .sod-post-content.clean { color: #1c1c1c; }
  [data-theme="light"] .sod-post-content.clean .sod-gemlink { border-bottom-color: rgba(200,16,46,.55); }
  [data-theme="light"] .sod-post-content.clean .sod-numlink { color: #c8102e !important; }
  [data-theme="light"] .sod-post-content.clean .sod-gematria-box .gb-rows b { color: #c8102e; }
  [data-theme="light"] .sod-post-content.clean a[href^="/number/"] { color: #c8102e !important; border-bottom-color: rgba(200,16,46,.5); }
  /* איים כהים (sgx/sgl — רקע כהה קבוע): נשארים בעולם הזהב גם במצב בהיר */
  [data-theme="light"] .sod-post-content.clean .sgx .sod-numlink, [data-theme="light"] .sod-post-content.clean .sgl .sod-numlink { color: #ffd86b !important; }
  [data-theme="light"] .sod-post-content.clean .sgx .sod-gemlink, [data-theme="light"] .sod-post-content.clean .sgl .sod-gemlink { border-bottom-color: rgba(255,216,107,.55); }
  /* 🔗 גימטריה לחיצה — סמן-יד בלבד (פותח מגירת-מספר). ⚠️ אסור לכפות כאן צבעי-sgx: פוסט גרפי הוא
     self-contained עם <style> מוטמע מודע-תמה משלו (רקע+צבעים ליום/לילה) — כלל קנוני בספציפיות גבוהה
     ידרוס אותו ויהרוס את העיצוב. הצבעים נשארים של הפוסט/הקנוני הקיים. (post_text_colors_law v6) */
  .sod-post-content.clean [data-gem] { cursor: pointer; }
  /* 📏 שורה-לחיצה שלמה שפותחת את חלונית המספר — <div class="sod-numrow" data-gem="ערך">…שורה…</div>.
     כל השורה לחיצה (data-gem תופס אותה דרך openNumberDrawer), עם אפקט-ריחוף עדין וקו-צד מוביל. */
  .sod-post-content.clean .sod-numrow { cursor: pointer; display: block; border-inline-start: 3px solid rgba(212,175,55,.5); padding: 4px 12px; margin: 6px 0; border-radius: 6px; transition: background .15s ease; }
  .sod-post-content.clean .sod-numrow:hover { background: rgba(212,175,55,.10); }
  [data-theme="light"] .sod-post-content.clean .sod-numrow { border-inline-start-color: rgba(200,16,46,.45); }
  [data-theme="light"] .sod-post-content.clean .sod-numrow:hover { background: rgba(200,16,46,.07); }
  /* 🎨 צבעי-מילה מודעי-תמה (כפתורי הצבע בעורך) — נשמרים כקלאס, לא inline, כדי לעבוד יום+לילה.
     ערך זהה בשני המצבים היכן שהניגודיות מספיקה; אדום/כחול/ירוק מקבלים גוון כהה יותר בבהיר. */
  .sod-post-content.clean .sc-gold  { color: #ffd86b !important; }
  .sod-post-content.clean .sc-red   { color: #ff7a6b !important; }
  .sod-post-content.clean .sc-blue  { color: #6fbcff !important; }
  .sod-post-content.clean .sc-green { color: #7fe0a0 !important; }
  .sod-post-content.clean .sc-violet{ color: #c9a4ff !important; }
  .sod-post-content.clean .sc-white { color: #ffffff !important; }
  .sod-post-content.clean .sc-hl    { background: rgba(212,175,55,.22); border-radius: 4px; padding: 0 3px; }
  [data-theme="light"] .sod-post-content.clean .sc-gold  { color: #9a7818 !important; }
  [data-theme="light"] .sod-post-content.clean .sc-red   { color: #c8102e !important; }
  [data-theme="light"] .sod-post-content.clean .sc-blue  { color: #1863c8 !important; }
  [data-theme="light"] .sod-post-content.clean .sc-green { color: #1a8a48 !important; }
  [data-theme="light"] .sod-post-content.clean .sc-violet{ color: #6a3fd0 !important; }
  [data-theme="light"] .sod-post-content.clean .sc-white { color: #1c1c1c !important; }
  [data-theme="light"] .sod-post-content.clean .sc-hl    { background: rgba(200,16,46,.14); }
  /* 🌗 post_theme_safe_colors_law — השלמת מצב-בהיר מלאה לפוסט נקי. כל אלה היו זהב *בלי*
     גרסת-בהיר ⇒ נבלעו על רקע קרם: כותרות (h1/h2/h3), מודגש (strong), נטוי (em), קישורים
     שאינם /number/ («ראו גם» וכו'), כיתובים, קרדיט-כותב, תאי-טבלה. עכשיו קריאים בשני המצבים.
     ⚠️ קנוני בשני עותקי POST_CONTENT_CSS: legacy.jsx + theme.js — לעדכן את שניהם. */
  [data-theme="light"] .sod-post-content.clean h1,
  [data-theme="light"] .sod-post-content.clean h2,
  [data-theme="light"] .sod-post-content.clean h3 { color: #7a5e12; text-shadow: none; }
  [data-theme="light"] .sod-post-content.clean strong { color: #7a5e12; }
  [data-theme="light"] .sod-post-content.clean em { color: #7a5e12; }
  [data-theme="light"] .sod-post-content.clean a { color: #a5561a !important; }
  [data-theme="light"] .sod-post-content.clean a:visited { color: #7a4a12 !important; }
  [data-theme="light"] .sod-post-content.clean a:hover,
  [data-theme="light"] .sod-post-content.clean a:focus { color: #c8102e !important; }
  [data-theme="light"] .sod-post-content.clean figcaption { color: #6b6250; }
  [data-theme="light"] .sod-post-content.clean .post-author { color: #7a4a12; }
  [data-theme="light"] .sod-post-content.clean td { color: #33301f; }

  /* 🔤 ערכת «גרפיקת-קוד» קנונית (sgx) — אנימציות CSS לפוסטים גרפיים (ר"ת/ס"ת, אתב"ש, אנגרמות).
     חיה כאן כמו sod-gematria-box: הפוסט משתמש בקלאסים בלבד, בלי <style> משלו — פתרון מערכתי.
     שימוש ראשון: פוסט הקוד של הרב עמוס גואטה (id 5008). ⚠️ שני עותקים: legacy.jsx + theme.js. */
  .sod-post-content .sgx { background: linear-gradient(170deg, #16112a, #0e0a1a); border: 1px solid rgba(232,200,74,.35); border-radius: 16px; padding: 26px 14px; margin: 26px 0; text-align: center; direction: rtl; overflow: hidden; }
  .sod-post-content .sgx-cap { color: #b6ab92; font-size: 13.5px; line-height: 1.9; margin-top: 14px; }
  .sod-post-content .sgx-cap b { color: #f0dc9a; }
  .sod-post-content .sgx-step { display: inline-block; background: rgba(232,200,74,.12); border: 1px solid rgba(232,200,74,.45); color: #e8c84a; border-radius: 999px; padding: 3px 14px; font-size: 12px; font-weight: 800; letter-spacing: 1px; margin-bottom: 14px; }
  .sod-post-content .sgx1-name { font-size: clamp(34px, 9vw, 52px); font-weight: 800; color: #ded5c2; letter-spacing: 2px; }
  .sod-post-content .sgx1-name .rt, .sod-post-content .sgx1-name .st { display: inline-block; animation: sgx-glow 2.6s ease-in-out infinite; }
  .sod-post-content .sgx1-name .rt { color: #ffd86b; text-shadow: 0 0 18px rgba(255,216,107,.7); }
  .sod-post-content .sgx1-name .st { color: #7fd4ff; text-shadow: 0 0 18px rgba(127,212,255,.7); animation-delay: -1.3s; }
  .sod-post-content .sgx1-out { margin-top: 16px; }
  .sod-post-content .sgx1-out i { display: inline-block; font-style: normal; font-size: clamp(26px, 7vw, 38px); font-weight: 800; margin: 0 4px; padding: 6px 14px; border-radius: 12px; background: rgba(232,200,74,.1); border: 1px solid rgba(232,200,74,.5); color: #f0dc9a; animation: sgx-pop 7s ease infinite; }
  .sod-post-content .sgx1-out i:nth-child(1) { animation-delay: -0.0s; color: #ffd86b; }
  .sod-post-content .sgx1-out i:nth-child(2) { animation-delay: -5.8s; color: #ffd86b; }
  .sod-post-content .sgx1-out i:nth-child(3) { animation-delay: -4.6s; color: #7fd4ff; border-color: rgba(127,212,255,.5); background: rgba(127,212,255,.08); }
  .sod-post-content .sgx1-out i:nth-child(4) { animation-delay: -3.4s; color: #7fd4ff; border-color: rgba(127,212,255,.5); background: rgba(127,212,255,.08); }
  .sod-post-content .sgx2-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; perspective: 700px; }
  .sod-post-content .sgx2-card { width: clamp(56px, 16vw, 76px); aspect-ratio: 3/4; position: relative; }
  .sod-post-content .sgx2-in { position: absolute; inset: 0; transform-style: preserve-3d; animation: sgx-flip 7s ease-in-out infinite; }
  .sod-post-content .sgx2-card:nth-child(1) .sgx2-in { animation-delay: -0.0s; }
  .sod-post-content .sgx2-card:nth-child(2) .sgx2-in { animation-delay: -0.4s; }
  .sod-post-content .sgx2-card:nth-child(3) .sgx2-in { animation-delay: -0.8s; }
  .sod-post-content .sgx2-card:nth-child(4) .sgx2-in { animation-delay: -1.2s; }
  .sod-post-content .sgx2-f, .sod-post-content .sgx2-b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: clamp(28px, 8vw, 40px); font-weight: 800; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .sod-post-content .sgx2-f { background: rgba(232,200,74,.1); border: 1px solid rgba(232,200,74,.5); color: #f0dc9a; }
  .sod-post-content .sgx2-b { background: rgba(200,16,46,.14); border: 1px solid rgba(255,110,130,.55); color: #ff9caa; transform: rotateY(180deg); }
  .sod-post-content .sgx3-stage { position: relative; min-height: 150px; }
  .sod-post-content .sgx3-rowA, .sod-post-content .sgx3-rowB { position: absolute; inset-inline: 0; top: 0; display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; }
  .sod-post-content .sgx3-rowA { animation: sgx-showA 10s ease infinite; }
  .sod-post-content .sgx3-rowB { animation: sgx-showB 10s ease infinite; }
  .sod-post-content .sgx3-tile { display: inline-flex; align-items: center; justify-content: center; width: clamp(40px, 11vw, 54px); aspect-ratio: 1; border-radius: 11px; font-size: clamp(22px, 6vw, 30px); font-weight: 800; background: rgba(232,200,74,.1); border: 1px solid rgba(232,200,74,.5); color: #f0dc9a; }
  .sod-post-content .sgx3-red { background: rgba(200,16,46,.16); border-color: rgba(255,110,130,.6); color: #ff9caa; }
  .sod-post-content .sgx3-plus { color: #8d8270; font-size: 22px; font-weight: 800; }
  .sod-post-content .sgx3-lbl { width: 100%; color: #b6ab92; font-size: 12.5px; margin-top: 10px; }
  .sod-post-content .sgx3-lbl b { color: #f0dc9a; }
  .sod-post-content .sgx-date { direction: ltr; unicode-bidi: isolate; font-size: clamp(30px, 9vw, 46px); font-weight: 800; color: #ffd86b; text-shadow: 0 0 30px rgba(255,216,107,.55); animation: sgx-beat 2.4s ease-in-out infinite; display: inline-block; }
  @keyframes sgx-glow { 0%,100% { transform: none; } 50% { transform: translateY(-7px) scale(1.12); } }
  @keyframes sgx-pop { 0%, 8% { opacity: 0; transform: translateY(16px) scale(.7); } 14%, 88% { opacity: 1; transform: none; } 96%, 100% { opacity: 0; transform: translateY(-10px) scale(.85); } }
  @keyframes sgx-flip { 0%, 34% { transform: rotateY(0); } 48%, 84% { transform: rotateY(180deg); } 100% { transform: rotateY(360deg); } }
  @keyframes sgx-showA { 0%, 38% { opacity: 1; transform: none; } 46%, 92% { opacity: 0; transform: translateY(-14px); } 100% { opacity: 1; transform: none; } }
  @keyframes sgx-showB { 0%, 40% { opacity: 0; transform: translateY(16px); } 50%, 90% { opacity: 1; transform: none; } 98%, 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .sod-post-content .sgx1-out i, .sod-post-content .sgx2-in, .sod-post-content .sgx3-rowA, .sod-post-content .sgx3-rowB,
    .sod-post-content .sgx1-name .rt, .sod-post-content .sgx1-name .st, .sod-post-content .sgx-date { animation: none !important; }
    .sod-post-content .sgx3-rowA { position: static; margin-bottom: 12px; }
    .sod-post-content .sgx3-rowB { position: static; }
  }
  /* ai_box_theme_aware — מצב בהיר (יום): קופסה בהירה + טקסט כהה במקום ניווי כהה על קלף */
  [data-theme="light"] .sod-post-content .sod-gematria-box {
    background: linear-gradient(135deg, rgba(176,125,18,0.10), rgba(255,255,255,0.72));
    border-color: rgba(176,125,18,0.5);
  }
  [data-theme="light"] .sod-post-content .sod-gematria-box .gb-title,
  [data-theme="light"] .sod-post-content .sod-gematria-box b { color: #8a6410; }
  [data-theme="light"] .sod-post-content .sod-gematria-box .gb-rows { color: #33301f; }
  [data-theme="light"] .sod-post-content .sod-gematria-box .gb-note { color: #756a52; }
  .sod-post-content:not(.clean) [style*="color:#000"],
  .sod-post-content:not(.clean) [style*="color: #000"],
  .sod-post-content:not(.clean) [style*="color:black"],
  .sod-post-content:not(.clean) [style*="color: black"],
  .sod-post-content:not(.clean) [style*="color:#111"],
  .sod-post-content:not(.clean) [style*="color:#222"],
  .sod-post-content:not(.clean) [style*="color:#333"] {
    color: #ede4d3 !important;
  }
  .sod-post-content:not(.clean) [style*="color:#0000ff"],
  .sod-post-content:not(.clean) [style*="color: #0000ff"],
  .sod-post-content:not(.clean) [style*="color:blue"],
  .sod-post-content:not(.clean) [style*="color: blue"] {
    color: ${C.goldBright} !important;
  }
  .sod-post-content video {
    max-width: min(100%, 360px) !important;
    width: auto !important;
    height: auto !important;
    display: block !important;
    margin: 1.5em auto !important;
  }
  .sod-post-content table {
    width: 100%; border-collapse: collapse; margin: 1.6em 0;
  }
  .sod-post-content th {
    background: ${C.goldDark}; color: ${C.goldBright};
    font-family: 'Heebo', sans-serif; font-size: 13.5px;
    padding: 10px 14px; text-align: right;
    border: 1px solid ${C.borderGold};
  }
  .sod-post-content td {
    color: ${C.goldDim}; padding: 9px 14px;
    border: 1px solid ${C.border};
    font-family: 'Heebo', sans-serif; font-size: 14px;
  }
  .sod-post-content tr:nth-child(even) td { background: ${C.surface}; }
`;
