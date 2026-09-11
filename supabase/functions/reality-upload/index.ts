import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED under G0 2029.
// Superseded by the canonical AGENT_MEDIA_UPLOAD_BRIDGE_V1 / agent-upload single-use ticket path.
// Kept as an explicit 410 tombstone so stale callers fail closed and discover the retirement.
Deno.serve(() => new Response(
  JSON.stringify({ error: "retired", replacement: "agent-upload" }),
  { status: 410, headers: { "Content-Type": "application/json" } },
));
