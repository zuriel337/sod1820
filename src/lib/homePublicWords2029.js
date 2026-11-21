// HOME PUBLIC WORDS (ZURIEL 21.11.2026, #1470 "SEO · דף הבית — נוסח מדויק"). The readable words the home document carries before any
// script runs (public-reading-deploy/first-words.js). Verbatim from the issue: no word is changed, and the punctuation is the issue's own
// (geresh ׳ and gershayim ״). The search title and description of the same section are PUBLIC_HOME_SEO in seo.js.
//
// Server only: plain data with no imports, read by the document function. No browser module imports it, so it adds nothing to the code
// every page loads (Speed Law).
//
// The links point to destinations that exist today. "אוצר המלוכה" is the approved public name of the flagship series (#1473); its stable
// key stays `reality-map`, and the link is the same series address the home page itself uses.
export const HOME_FIRST_WORDS = Object.freeze({
  heading: "כי לה׳ המלוכה",
  tagline: "רמזי הגאולה בשפת המספרים",
  lead: "אירועים, פסוקים ומספרים מתחברים כאן למחקרים ולתיעודים. גלו את הרמזים, בדקו את המקורות וחקרו בעצמכם באמצעות הגימטריה והצופן התנ״כי.",
  series: Object.freeze({ label: "אוצר המלוכה", note: "מחקרי הדגל והקשרים בין האירועים.", href: "/2029/posts?series=reality-map" }),
  startLabel: "התחילו לחקור:",
  start: Object.freeze([
    Object.freeze({ label: "תיעוד אירועים", href: "/category/" + encodeURIComponent("תיעוד-אירועים") }),
    Object.freeze({ label: "מחשבון גימטריה", href: "/gematria" }),
    Object.freeze({ label: "הצופן התנ״כי", href: "/code" }),
    Object.freeze({ label: "פוסטים ומחקרים", href: "/post" }),
  ]),
});
