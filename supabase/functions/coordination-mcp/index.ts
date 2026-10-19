// Edge Function: read-only MCP gateway for coordination checks. Deploy with JWT verification ON
// at the platform layer is NOT possible for OAuth-style MCP discovery, so verification happens in
// Postgres: coordination_read_current() rejects any token that is not an Auth user flagged
// app_metadata.sod1820_coordination_reader=true. No service key is used or required here.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { bearerOf, handleMcp } from "./handler.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const rpc = (token: string, args: Record<string, unknown>) =>
  createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
    .rpc("coordination_read_current", args);

Deno.serve(async (req) => {
  const meta = `${URL_}/functions/v1/coordination-mcp`;
  const url = new URL(req.url);
  if (url.pathname.endsWith("/.well-known/oauth-protected-resource"))
    return Response.json({ resource: meta, authorization_servers: [`${URL_}/auth/v1`], bearer_methods_supported: ["header"] });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400 }); }
  const [status, payload] = await handleMcp(body, bearerOf(req), { rpc });
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (status === 401) headers["www-authenticate"] = `Bearer resource_metadata="${meta}/.well-known/oauth-protected-resource"`;
  return payload === null ? new Response(null, { status, headers }) : Response.json(payload, { status, headers });
});
