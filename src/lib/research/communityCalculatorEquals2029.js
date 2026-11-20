// "למי אתם שווים?" — the result a visitor wants to send on (ZURIEL 20.11.2026): the name, its value in the chosen method and published,
// verified phrases that share that value IN THE SAME METHOD. Pure wording and selection only. The matches come from the site's existing
// same-method reader (fn_number_lookup -> collectVerifiedLookupMatches -> pickEqualsPreview, the one the professional calculator uses);
// nothing is calculated, read or counted here, and no AI is involved.
const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();

// The community calculator shows these methods and no more (ZURIEL 20.11.2026); every other method lives in the professional calculator.
export const COMMUNITY_CALCULATOR_METHODS = Object.freeze(["רגיל", "מילוי", "מסתתר", "גדול"]);
export const COMMUNITY_EQUALS_LIMIT = 3;
export const COMMUNITY_EQUALS_MORE_LIMIT = 24;

// The matches shown first and the further ones the visitor may open and choose from; the typed name itself and repeats are left out.
export function communityEqualsSelection(matches, name, limit = COMMUNITY_EQUALS_LIMIT, moreLimit = COMMUNITY_EQUALS_MORE_LIMIT) {
  const own = clean(name), seen = new Set(), all = [];
  for (const row of Array.isArray(matches) ? matches : []) {
    const phrase = clean(row?.phrase);
    if (!phrase || phrase === own || seen.has(phrase)) continue;
    seen.add(phrase); all.push({ ...row, phrase });
  }
  return { top: all.slice(0, limit), more: all.slice(limit, moreLimit), total: all.length };
}

// The match that goes on the card: the visitor's own choice while it is still one of the matches, otherwise the first.
export function communityEqualsChosen(selection, chosenPhrase) {
  const all = [...(selection?.top || []), ...(selection?.more || [])];
  return all.find(row => row.phrase === clean(chosenPhrase)) || all[0] || null;
}

// What goes out in a share: the name the visitor typed, its value, the method when it is not the regular one, the chosen match and an invitation.
export function communityEqualsShareText({ name, value, phrase, methodKey = "רגיל", methodLabel = "" } = {}) {
  const expression = clean(name), peer = clean(phrase);
  if (!expression || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return "";
  const method = clean(methodKey) === "רגיל" ? "בגימטריה" : `בגימטריה בשיטת ${clean(methodLabel) || clean(methodKey)}`;
  return `${expression} = ${Number(value)} ${method}${peer ? `, כמו ${peer}` : ""}. ומה השם שלכם שווה?`;
}
