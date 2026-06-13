// ===== DESIGN TOKENS — מקור אמת יחיד לעיצוב SOD1820 =====
// פלטת זהב-כהה מלכותי. נשמרת מהאתר הקיים.

export const C = {
  bg:           "#07050E",
  bgGlow:       "#110e1e",
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
  muted:        "#bdb6c4",
  faint:        "#1a0f0a",
  danger:       "#8B2020",
};

export const F = {
  royal:   "'Heebo', sans-serif",
  regal:   "'Cinzel', 'Heebo', sans-serif",
  cinzel:  "'Cinzel', serif",
  heading: "'Heebo', sans-serif",
  body:    "'Heebo', sans-serif",
  mono:    "'Courier New', monospace",
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
  1237: "התגלות — לילה כיום יאיר",
  1820: "סוד השם יהוה × עמים",
};

// ===== GLOBAL CSS =====
export const GLOBAL_CSS = `
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
    font-size: clamp(12px, 1.7vw, 17px);
  }
  .sod-post-content p {
    color: #ede4d3;
    font-family: 'Heebo', sans-serif;
    font-size: 15.5px;
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
    font-size: 15px;
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
    font-size: 11px;
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
    font-size: 13px;
    letter-spacing: 1px;
    margin: 6px 0;
    opacity: 0.92;
  }
  .sod-post-content div[style*="height"] { height: auto !important; max-height: 24px !important; }
  .sod-post-content div[style*="min-height"] { min-height: 0 !important; }
  .sod-post-content .elementor-spacer,
  .sod-post-content .elementor-spacer-inner { height: 16px !important; }
  .sod-post-content [style*="color:#000"],
  .sod-post-content [style*="color: #000"],
  .sod-post-content [style*="color:black"],
  .sod-post-content [style*="color: black"],
  .sod-post-content [style*="color:#111"],
  .sod-post-content [style*="color:#222"],
  .sod-post-content [style*="color:#333"] {
    color: #ede4d3 !important;
  }
  .sod-post-content [style*="color:#0000ff"],
  .sod-post-content [style*="color: #0000ff"],
  .sod-post-content [style*="color:blue"],
  .sod-post-content [style*="color: blue"] {
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
    font-family: 'Heebo', sans-serif; font-size: 12px;
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
