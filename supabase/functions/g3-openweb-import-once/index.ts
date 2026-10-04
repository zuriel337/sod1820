import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED under G4 operability/security containment.
// The one-time OpenWeb archive import completed and was verified idempotent on 2026-09-25.
// Keep an explicit tombstone so stale callers fail closed; no service-role client, import token,
// source fetch, CSV parser, or import RPC remains reachable from this function.
Deno.serve(() => new Response(
  JSON.stringify({ error: "retired", replacement: null }),
  { status: 410, headers: { "Content-Type": "application/json" } },
));
