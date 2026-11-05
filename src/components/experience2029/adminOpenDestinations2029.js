import { publicReadingPath } from "../../lib/publicReadingRelease2029.js";
import { SITE_LINKS } from "../../../supabase/functions/_shared/siteLinkRegistry.js";

// ZURIEL 5.11.2026 working rule: everything is open to the admin; what is still closed is closed to the public only.
// The "עוד" panel lists, for an admin, every registry destination the public router still closes, so no capability that
// belongs in the bar contract is lost while the bar is being designed. The public never sees this list.
export function adminOpenClosedDestinations(isAdmin) {
  if (isAdmin !== true) return [];
  return SITE_LINKS.filter((item) => !item.external && item.defaultState === "closed"
    && publicReadingPath(item.href.split("#")[0], { isAdmin: true }) === "admin-view")
    .filter((item, index, all) => all.findIndex((other) => other.href === item.href) === index)
    .map((item) => ({ id: item.id, label: item.label, href: item.href }));
}

