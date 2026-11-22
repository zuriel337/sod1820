import { isPublicResearchReading2029 } from "./publicReadingRelease2029.js";

// Gallery source sections have used both IDs in links saved by visitors.
export function galleryImageFragment2029(hash) {
  return /^#(?:gallery-source|pool)-([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i.exec(hash || "")?.[1].toLowerCase() || null;
}

// Only the document handler and the lazy readers need these historical gallery controls.
export function legacyArchiveContinuation2029(pathname, search = "", hash = "") {
  if (!/^\/(?:archive|gallery-updates)\/?$/.test(pathname)) return null;
  const query = new URLSearchParams(search);
  let target = null;
  const tab = query.get("tab");
  if (query.has("gal") || query.has("gallery") || query.has("image") || tab === "galleries" || galleryImageFragment2029(hash)) {
    target = "/gallery";
    // Translate only the retired gallery selector. Keep the source, offset, other query bytes and fragment.
    search = search.replace(/^\?/, "").split("&").flatMap(field => {
      const part = new URLSearchParams(field);
      if (part.get("tab") === "galleries") return [];
      return [part.has("gal") && !query.has("gallery") ? field.replace(/^[^=]*/, "gallery") : field];
    }).join("&");
  } else if (!query.has("set") && !query.has("sets")) {
    const numbers = tab === "pool" ? query.get("nums") || query.get("num")
      : (!tab || tab === "reality") && /^\d+$/.test(query.get("q") || "") ? query.get("q") : null;
    if (numbers && /^(?:[1-9]\d*)(?:[,\s]+[1-9]\d*){0,11}$/.test(numbers) && numbers.split(/[,\s]+/).every(n => Number.isSafeInteger(Number(n)))) {
      target = "/gallery";
      query.set("tab", tab || "reality");
      query.set("nums", numbers);
      query.delete(tab === "pool" ? "num" : "q");
      search = query.toString();
    } else if (tab === "reality") {
      query.delete("tab");
      if (isPublicResearchReading2029("/reality", query.toString())) {
        target = "/reality";
        search = query.toString();
      }
    }
  }
  if (!target) return null;
  const fields = search.replace(/^\?/, "");
  return target + (fields ? "?" + fields : "") + (hash && !hash.startsWith("#") ? "#" : "") + hash;
}
