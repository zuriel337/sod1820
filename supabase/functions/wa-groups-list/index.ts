// wa-groups-list — admin-only, read-only list of the WhatsApp groups/channels the bot belongs to.
// Same auth pattern as wa-avatars: a real user JWT is verified server-side and the actor must be admin.
// Provider transport is the shared Edge-side waGreen (Vault-backed config, secrets never logged or returned).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { waAdmin } from "../_shared/waGreen.ts";
import { handle } from "./core.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function requireAdmin(req: Request) {
  const match = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match || !SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) return null;
  const { data: actor, error: actorError } = await admin.from("users").select("id,role").eq("id", data.user.id).maybeSingle();
  if (actorError || actor?.role !== "admin") return null;
  return admin;
}

Deno.serve((req) => handle(req, { requireAdmin, waAdmin }));
