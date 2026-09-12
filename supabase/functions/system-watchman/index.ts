// G0 tombstone — system-watchman direct sender is superseded by the canonical DB watchman runner.
// The replacement stays under system_suggestions_law and MUST end in public.notify_admin().
// Release order: apply G0_EDGE_RELEASE_SQL_CANDIDATE.sql first, verify system_watchman_run/admin_fire_watchman,
// then deploy this tombstone. Do not reintroduce direct Resend/WhatsApp sending here.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};

Deno.serve(() => new Response(JSON.stringify({
  ok: false,
  retired: true,
  replacement: "public.system_watchman_run -> public.notify_admin",
}), { status: 410, headers: CORS }));
