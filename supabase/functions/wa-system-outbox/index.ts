// 📤 wa-system-outbox — thin Green API transport adapter over the EXISTING public.bot_outbox (G3 V5).
// Deploy with verify_jwt=false: the cron call carries no secret by design. This is safe because the endpoint
// can only advance rows that DB code already governed (RPC-inserted, bot system|link-code); the claim RPC is
// atomic (FOR UPDATE SKIP LOCKED), batch-capped, backed off and expiring, so repeated/hostile calls cannot
// flood, duplicate-send, or create/alter content. Response never contains chat, text, image, OTP or token.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle } from "./core.ts";

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
Deno.serve((req) => handle(req, sb));
