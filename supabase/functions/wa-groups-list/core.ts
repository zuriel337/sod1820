// wa-groups-list core — READ-ONLY listing of the WhatsApp groups/channels the bot's instance belongs to.
// Admin-only (enforced by the caller-supplied requireAdmin). Calls only the provider's GET list methods
// (getContacts, getChats); never sends, joins, leaves or edits anything and never writes to the database.
// Returns chat ids + display names only: no members, no messages, no provider URL/token (waGreen redacts errors).
// deno-lint-ignore-file no-explicit-any

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

export type ChatKind = "group" | "channel";
export type ChatItem = { id: string; name: string; kind: ChatKind };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });

function asArray(v: unknown): any[] {
  if (Array.isArray(v)) return v;
  const r = (v as any)?.result;
  return Array.isArray(r) ? r : [];
}

export function kindOf(id: string): ChatKind | null {
  if (/@g\.us$/.test(id)) return "group";
  if (/@newsletter$/.test(id)) return "channel";
  return null;
}

// Merge provider rows (contacts and chats) into one de-duplicated list of groups/channels.
// A non-empty name always wins over an empty one, whichever list it came from.
export function normalizeChats(...lists: unknown[]): ChatItem[] {
  const byId = new Map<string, ChatItem>();
  for (const list of lists) {
    for (const row of asArray(list)) {
      const id = String(row?.id ?? row?.chatId ?? "").trim();
      const kind = kindOf(id);
      if (!kind) continue;
      const name = String(row?.name ?? row?.subject ?? "").trim();
      const prev = byId.get(id);
      if (!prev) byId.set(id, { id, name, kind });
      else if (!prev.name && name) prev.name = name;
    }
  }
  return [...byId.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, "he"));
}

const fold = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s"'`׳״"'.\-_]+/g, "");

// Substring match on the display name, ignoring case, spaces, quotes and punctuation.
export function matchesQuery(item: ChatItem, query: string): boolean {
  const q = fold(query);
  return !q || fold(item.name).includes(q);
}

export type Registry = {
  ingest: Array<{ chat_id: string; channel: string; enabled: boolean }>;
  botConfig: Array<{ group_id: string; enabled: boolean }>;
};

export function annotate(items: ChatItem[], reg: Registry) {
  const ingest = new Map(reg.ingest.map((r) => [r.chat_id, r]));
  const cfg = new Map(reg.botConfig.map((r) => [r.group_id, r]));
  const allCfg = reg.botConfig.find((r) => r.group_id === "__ALL__");
  return items.map((it) => {
    const src = ingest.get(it.id);
    const c = cfg.get(it.id);
    return {
      ...it,
      in_ingest_sources: !!src,
      ingest_channel: src?.channel ?? null,
      ingest_enabled: src ? !!src.enabled : null,
      bot_config: c ? { enabled: !!c.enabled } : null,
      bot_config_all_enabled: allCfg ? !!allCfg.enabled : null,
    };
  });
}

export type Deps = {
  requireAdmin: (req: Request) => Promise<any | null>;
  waAdmin: (sb: any, method: string, payload: unknown, http: string) => Promise<any>;
};

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "GET or POST only" }, 405);
  const sb = await deps.requireAdmin(req);
  if (!sb) return json({ error: "forbidden" }, 403);

  let query = "";
  if (req.method === "POST") {
    try { query = String(((await req.json()) as any)?.query ?? "").trim().slice(0, 100); } catch { /* empty body is valid */ }
  } else {
    query = (new URL(req.url).searchParams.get("query") ?? "").trim().slice(0, 100);
  }

  // Provider list methods are GET-only reads. Both are tried: either one alone can be partial.
  const [contacts, chats] = await Promise.all([
    deps.waAdmin(sb, "getContacts", null, "GET"),
    deps.waAdmin(sb, "getChats", null, "GET"),
  ]);
  const okOf = (r: any) => r?.ok !== false && r?.http_status === 200 && Array.isArray(asArray(r));
  const providerStatus = {
    getContacts: okOf(contacts) ? "ok" : (contacts?.error ? "error" : `http_${contacts?.http_status ?? "unknown"}`),
    getChats: okOf(chats) ? "ok" : (chats?.error ? "error" : `http_${chats?.http_status ?? "unknown"}`),
  };
  if (!okOf(contacts) && !okOf(chats)) {
    // Fail closed: an empty list from a failed call must never read as "the bot is in no groups".
    return json({ ok: false, error: "provider_unavailable", provider: providerStatus,
      detail: String(contacts?.error ?? chats?.error ?? "").slice(0, 200) || null }, 502);
  }

  const items = normalizeChats(okOf(contacts) ? contacts : null, okOf(chats) ? chats : null);

  const [{ data: ingest }, { data: botConfig }] = await Promise.all([
    sb.from("channel_ingest_sources").select("chat_id,channel,enabled"),
    sb.from("wa_bot_config").select("group_id,enabled"),
  ]);
  const rows = annotate(items, { ingest: ingest ?? [], botConfig: botConfig ?? [] });
  const matches = query ? rows.filter((r) => matchesQuery(r, query)) : null;

  const registered = new Set(items.map((i) => i.id));
  return json({
    ok: true,
    provider: providerStatus,
    complete: providerStatus.getContacts === "ok" && providerStatus.getChats === "ok",
    totals: { groups: rows.filter((r) => r.kind === "group").length, channels: rows.filter((r) => r.kind === "channel").length },
    query: query || null,
    matches,
    found: matches ? matches.length > 0 : null,
    items: rows,
    // Sources the DB expects the bot to poll that the provider does not list (possible removal from the group).
    ingest_sources_missing_from_provider: (ingest ?? []).filter((r: any) => r.enabled && !registered.has(r.chat_id)).map((r: any) => ({ chat_id: r.chat_id, channel: r.channel })),
  });
}
