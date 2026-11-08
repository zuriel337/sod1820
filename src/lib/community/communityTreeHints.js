import { supabase } from "../supabase.js";
import { plainMessageText } from "./messageFormatting.js";
import { communityMessageShareUrl } from "./communityMessageShare.js";

// "Entered the tree" hints: an administrator marks a public chat message; everyone
// sees the short list pinned as single lines at the top of the chat. The server owns
// who may mark (admin only) and which messages are still public.
export const TREE_HINT_LINE_MAX = 110;

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

// Administrator-only; the server rejects everyone else.
export async function setTreeHint(id, action, client = supabase) {
  if (action !== "enter" && action !== "remove") throw new Error("bad action");
  const { error } = await client.rpc("community_tree_hint_set", { p_id: id, p_action: action });
  if (error) throw error;
}
