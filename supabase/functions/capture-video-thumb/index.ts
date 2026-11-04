import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Retired under Emergency P0 containment.
//
// The browser capture path has no current caller. Video posters are owned by the
// authenticated backend media-thumbs workflow. Keep a public tombstone so stale
// clients receive an explicit 410 without exposing service-role Storage/DB writes.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  return new Response(JSON.stringify({
    ok: false,
    retired: true,
    error: "gone",
    replacement: "backend-media-thumbs",
  }), {
    status: 410,
    headers: { ...CORS, "Cache-Control": "no-store" },
  });
});
