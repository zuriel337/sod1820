import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// RETIRED: one-off admin utility for SOD1820 Cleanup Pass 4 execution (2026-08-29). Task complete. Permanently inert.
Deno.serve(async (_req: Request) => {
  return new Response(JSON.stringify({ ok: false, error: "retired: one-off cleanup pass complete" }), { status: 410 });
});
