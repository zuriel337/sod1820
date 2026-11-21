// Build-time projection only. One decorative picture outside #root survives React routes/account remounts.
// No client module, fetch script, new theme store or per-page background owner.
import { readFileSync } from 'node:fs';
import { ROYAL_CONNECTED_ATMOSPHERE_2029 as art } from '../../src/lib/brandAssets2029.js';
import { resolve2029Palette } from '../../src/lib/paletteTokens2029.js';
import { POST_ARTICLE_THEME_SCRIPT } from '../../src/lib/research/postArticleFrame2029.js';
export function royalBackdropDocument2029(html) {
  if (!html.includes('id="root"') || html.includes('id="sod29-royal-backdrop"')) return html;
  const palette = ['dark', 'light', 'parchment'].map(preset => {
    const p = resolve2029Palette(preset);
    const selector = preset === 'dark' ? '.r29-site-backdrop' : `html[data-theme-2029="${preset}"] .r29-site-backdrop`;
    return `${selector}{--s29-page:${p.pageBg};--s29-frame:${p.frame || p.card}}`;
  }).join('');
  const css = readFileSync(new URL('../../src/components/experience2029/royalBackdrop2029.css', import.meta.url), 'utf8');
  const picture = `<div id="sod29-royal-backdrop" class="r29-site-backdrop" aria-hidden="true"><picture class="r29-connected-art"><source media="(min-width:650px)" type="image/avif" srcset="${art.desktop.avif}"><source media="(min-width:650px)" type="image/webp" srcset="${art.desktop.webp}"><source type="image/avif" srcset="${art.mobile.avif}"><img src="${art.mobile.webp}" width="500" height="547" alt="" decoding="async" fetchpriority="low"></picture></div>`;
  return html.replace('</head>', `${POST_ARTICLE_THEME_SCRIPT}<style data-royal-backdrop>${palette}${css}</style></head>`)
    .replace(/<body([^>]*)>/, `<body$1>${picture}`);
}
