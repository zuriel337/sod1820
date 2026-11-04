// Local Edge Runtime router. The worker is the bundled, unmodified research-run
// source. No HTTP fixture, replacement handler, or remote imports.
const decode = (part: string) => Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const secret = new TextEncoder().encode(Deno.env.get("JWT_SECRET") || "");
const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
Deno.serve(async (req: Request) => {
  if (new URL(req.url).pathname !== "/research-run") return new Response("not found", { status: 404 });
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer /i, "");
    const parts = token.split(".");
    if (parts.length !== 3 || JSON.parse(new TextDecoder().decode(decode(parts[0]))).alg !== "HS256") throw Error();
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if (claims.exp <= Date.now() / 1000) throw Error();
    if (!await crypto.subtle.verify("HMAC", key, decode(parts[2]), new TextEncoder().encode(parts.slice(0, 2).join(".")))) throw Error();
  } catch { return Response.json({ error: "invalid_jwt" }, { status: 401 }); }
  const worker = await EdgeRuntime.userWorkers.create({
    servicePath: "/functions/research-run", memoryLimitMb: 192,
    workerTimeoutMs: 30000, noModuleCache: false,
    envVars: Object.entries(Deno.env.toObject()),
  });
  return worker.fetch(req);
});
