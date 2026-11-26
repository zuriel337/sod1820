// node scripts/build-canonical-components-preview-2029.mjs — writes the static preview of the canonical components (royal2029.css) in the three presets.
// The page is layout only: every look comes from royal2029.css and the preset palettes.
import fs from "node:fs";
import { DESIGN_V2_PALETTES } from "../src/lib/paletteTokens2029.js";
const css = fs.readFileSync(new URL("../src/components/experience2029/royal2029.css", import.meta.url), "utf8");
const vars = p => Object.entries({ "--s29-page": p.pageBg, "--s29-panel": p.card, "--s29-panel-soft": p.cardSoft, "--s29-line": p.border, "--s29-line-strong": p.borderStrong,
  "--s29-accent": p.accent, "--s29-accent-text": p.accentText, "--s29-accent-secondary": p.accentSecondary, "--s29-discovery": p.accentDiscovery, "--s29-focus-ring": p.focusRing,
  "--s29-warm-accent": p.warmAccent, "--s29-brand-sapphire": p.brandSapphire, "--s29-brand-gold": p.brandGold, "--s29-ink": p.ink, "--s29-muted": p.inkSoft,
  "--s29-on-accent": p.onAccent, "--s29-accent-btn": p.accentBtn, "--s29-success": p.successText, "--s29-danger": p.dangerText,
  "--s29-font-ui": "'Rubik','Noto Sans Hebrew',Arial,sans-serif", "--s29-motion": "180ms" }).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(";");
const section = (name, p) => `<section class="r29 preset" data-preset="${name}" style="${vars(p)};background:${p.pageBg};color:${p.ink}">
<h2 class="label">ערכה: ${name}</h2>
<div class="grid">
 <div class="r29-hall box"><h3>כפתורים</h3>
  <div class="r29-btn-group"><button class="r29-btn is-primary">פעולה ראשית</button><button class="r29-btn is-quiet">פעולה משנית</button></div>
  <div class="r29-btn-group"><button class="r29-btn is-quiet is-icon" aria-label="שיתוף">⤴</button><button class="r29-btn is-quiet is-icon" aria-label="שמירה">☆</button><button class="r29-btn is-quiet is-icon" aria-label="מעקב">◔</button></div>
  <div class="r29-btn-group"><button class="r29-btn is-primary" disabled aria-busy="true">שולח…</button></div></div>
 <div class="r29-hall box"><h3>בחירה מרובה</h3>
  <div class="r29-check-group" role="group" aria-label="בחירה"><button class="r29-check" role="checkbox" aria-checked="true"><span class="r29-check-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>קטגוריה: רמזים חזקים</span></button>
  <button class="r29-check" role="checkbox" aria-checked="false"><span class="r29-check-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>קטגוריה: תיעוד אירועים</span></button></div></div>
 <div class="r29-hall box"><h3>טפסים</h3>
  <div class="r29-field"><label for="n-${name}">שם (לא חובה)</label><input id="n-${name}" class="r29-input" value=""/></div>
  <div class="r29-field"><label for="t-${name}">התגובה שלך</label><textarea id="t-${name}" class="r29-input" rows="3" aria-invalid="true">טקסט שנכשל בשליחה</textarea><p class="r29-hint">תגובת אורח מתפרסמת אחרי אישור.</p></div></div>
 <div class="r29-hall box"><h3>חיווי פעולה</h3>
  <p class="r29-status" role="status" data-state="loading">טוען…</p>
  <p class="r29-status" role="status" data-state="success">התגובה פורסמה.</p>
  <p class="r29-status" role="alert" data-state="error">לא הצלחנו לשלוח. הטקסט נשמר; אפשר לנסות שוב.</p></div>
 <div class="box sheetbox"><div class="r29-sheet" role="dialog" aria-modal="true" aria-labelledby="s-${name}"><h2 id="s-${name}">מעקב</h2><p>עדכון באתר כשמתפרסם פוסט חדש. בלי מייל ובלי התראות דפדפן.</p>
  <div class="r29-check-group"><button class="r29-check" role="checkbox" aria-checked="true"><span class="r29-check-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>קטגוריה: בחירות</span></button></div>
  <div class="r29-btn-group"><button class="r29-btn is-primary">סגירה</button></div></div></div>
</div></section>`;
const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>הרכיבים הקנוניים · תצוגה מקדימה</title>
<style>${css}</style><style>body{margin:0;font:400 15px/1.5 'Noto Sans Hebrew','Rubik',Arial,sans-serif}.preset{padding:16px;display:grid;gap:12px}.label{margin:0;font:700 14px var(--s29-font-ui);color:var(--s29-brand-gold)}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))}.box{padding:12px;display:grid;gap:10px;align-content:start}.box h3{margin:0;font:700 15px var(--s29-font-ui)}.sheetbox{display:grid;place-items:center}</style></head><body>
${["dark", "light", "parchment"].map(name => section(name, DESIGN_V2_PALETTES[name])).join("\n")}</body></html>`;
fs.writeFileSync(new URL("../docs/reviews/design-language-gap-map-20261125/canonical-components-preview.html", import.meta.url), html);
console.log("preview written", html.length);
