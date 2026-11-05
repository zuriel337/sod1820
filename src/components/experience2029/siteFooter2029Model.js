// Pure footer model: which registry entries appear where. Links themselves live only in siteLinkRegistry.js.
import { SITE_LINK_BY_ID } from "../../../supabase/functions/_shared/siteLinkRegistry.js";

export const FOOTER_COLUMNS = Object.freeze([
  { title: "לגלות", ids: ["posts", "dimension-five", "or-geula", "electricity", "archive"] },
  { title: "לחקור", ids: ["heichal", "world", "number", "gematria", "els"] },
  { title: "שלי", ids: ["profile", "notifications", "start", "community"] },
]);
export const FOOTER_LEGAL_IDS = Object.freeze(["contact", "privacy", "map"]);
export const FOOTER_SOCIAL_IDS = Object.freeze(["instagram", "facebook", "tiktok"]);
export const SOCIAL_GLYPH = Object.freeze({ instagram: "◎", facebook: "f", tiktok: "♪" });

// Grounded, max 3: only open registry links related to the current page, never the page itself.
const SUGGESTION_RULES = Object.freeze([
  [/^\/(?:post|category|tag)(?:\/|$)/, ["world", "number", "community"]],
  [/^\/(?:2029\/)?number(?:\/|$)/, ["gematria", "world", "posts"]],
  [/^\/gematria(?:\/|$)|^\/2029\/(?:gematria|calculator)/, ["number", "world", "posts"]],
  [/^\/world(?:\/|$)/, ["posts", "number", "community"]],
  [/^\/community(?:\/|$)/, ["or-geula", "posts", "world"]],
  [/^\/(?:books?|codes)(?:\/|$)/, ["posts", "world", "number"]],
  [/^\/(?:contact|privacy|map)$/, ["posts", "world", "community"]],
]);
const DEFAULT_SUGGESTIONS = Object.freeze(["posts", "world", "number"]);

export function footerSuggestions(pathname) {
  const path = String(pathname || "/");
  const rule = SUGGESTION_RULES.find(([pattern]) => pattern.test(path));
  const ids = rule ? rule[1] : DEFAULT_SUGGESTIONS;
  const here = (item) => item.href === path || path.startsWith(`${item.href}/`);
  return ids.map((id) => SITE_LINK_BY_ID[id])
    .filter((item) => item && item.availability === "open" && !here(item))
    .slice(0, 3);
}

// Pages that own the whole viewport or are private tools do not get a page-end footer.
export function footerHidden(pathname) {
  return /^\/(?:book(?:\/|$)|code(?:\/|$)|2029\/control(?:\/|$)|admin(?:\/|$))/.test(String(pathname || ""));
}
