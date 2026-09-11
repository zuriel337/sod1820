import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED under G0 2029.
// The legacy WordPress media migration queue has no pending rows; this endpoint is not a permanent capability.
Deno.serve(() => new Response(
  JSON.stringify({ error: "retired", reason: "legacy_media_migration_complete" }),
  { status: 410, headers: { "Content-Type": "application/json" } },
));
