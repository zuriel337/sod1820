import { supabase } from "../supabase.js";
import { plainMessageText } from "./messageFormatting.js";
import { communityMessageShareUrl } from "./communityMessageShare.js";

// "Entered the tree" hints: an administrator marks a public chat message; everyone
// sees the short list pinned as single lines at the top of the chat. The server owns
// who may mark (admin only) and which messages are still public.
//
// Each hint may carry the canonical number(s) it is about (e.g. 77). That is only a
// marker today — a plain lookup a future recognition feature (a live meter/projector
// that notices a number already has a hint) can call by number. No such feature is
// built yet; this module only makes the data available for one.
export const TREE_HINT_LINE_MAX = 110;
export const TREE_HINT_NUMBER_MAX = 10;

// One line of plain text: formatting markers, links and line breaks removed, then cut
// at a word boundary where possible.
export function treeHintLine(body, max = TREE_HINT_LINE_MAX) {
  const text = plainMessageText(String(body ?? "")).replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const chars = [...text];
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

// Free text ("77, 26" / "77 26" / "77,, 26.0") → a clean, de-duplicated, bounded list
// of integers, in the order typed. Invalid or out-of-range tokens are dropped silently.
export function parseTreeHintNumbers(value) {
  const seen = new Set();
  const out = [];
  for (const token of String(value ?? "").split(/[,\s]+/)) {
    if (!token) continue;
    const n = Number(token);
    if (!Number.isInteger(n) || n < 0 || n > 999999999 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= TREE_HINT_NUMBER_MAX) break;
  }
  return out;
}

function normalizeNumbers(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const n of value) {
    if (!Number.isInteger(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export function normalizeTreeHints(data, currentHref = "https://sod1820.co.il/community/chat") {
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  const hints = [];
  for (const item of data) {
    const id = typeof item?.id === "string" ? item.id : "";
    const line = treeHintLine(item?.body);
    if (!id || !line || seen.has(id)) continue;
    seen.add(id);
    const path = Array.isArray(item.path) ? item.path : [id];
    hints.push({
      id,
      line,
      authorName: typeof item.author_name === "string" && item.author_name.trim() ? item.author_name.trim() : "",
      enteredAt: item.entered_at || null,
      numbers: normalizeNumbers(item.numbers),
      href: communityMessageShareUrl(currentHref, path),
    });
  }
  return hints;
}

export async function fetchTreeHints({ limit = 20, href } = {}, client = supabase) {
  const { data, error } = await client.rpc("community_tree_hints_list", { p_limit: limit });
  if (error) throw error;
  return normalizeTreeHints(data, href);
}

// A future recognition feature's hook: "does this number already have a hint in the tree?"
export async function fetchTreeHintsForNumber(number, client = supabase) {
  if (!Number.isInteger(number)) return [];
  const { data, error } = await client.rpc("community_tree_hints_by_number", { p_number: number });
  if (error) throw error;
  return normalizeTreeHints(data);
}

// Administrator-only; the server rejects everyone else. `numbers` is read only for "enter".
export async function setTreeHint(id, action, { numbers } = {}, client = supabase) {
  if (action !== "enter" && action !== "remove") throw new Error("bad action");
  const clean = normalizeNumbers(numbers);
  const { error } = await client.rpc("community_tree_hint_set", { p_id: id, p_action: action, p_numbers: clean.length ? clean : null });
  if (error) throw error;
}
