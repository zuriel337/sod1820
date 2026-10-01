import { createHash } from "node:crypto";

const mp4 = new Uint8Array([
  0x00,0x00,0x00,0x18,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d,
  0x00,0x00,0x02,0x00,0x69,0x73,0x6f,0x6d,0x6d,0x70,0x34,0x31,
]);
const MP4_SHA = createHash("sha256").update(mp4).digest("hex");
let handler:any;
(globalThis as any).Deno = {
  env: { get: (k:string) => ({ SUPABASE_SERVICE_ROLE_KEY:"sr-test", SUPABASE_URL:"https://stub.local" } as any)[k] },
  serve: (h:any) => { handler = h; },
};

let ticket:any;
let readBackMode = "ok";
let stored:Uint8Array|null = null;
let storageContentType = "";
let mediaMode = "ok";

const pageJson = JSON.stringify({
  __DEFAULT_SCOPE__: {
    "webapp.video-detail": {
      itemInfo: {
        itemStruct: {
          music: { playUrl:"https://v58.tiktokcdn.com/audio/wrong.mp3" },
          video: {
            playAddr:"https://v16-webapp-prime.us.tiktok.com/video/tos/right.mp4",
            downloadAddr:"https://v16-webapp-prime.us.tiktok.com/video/tos/download.mp4",
          },
        },
      },
    },
  },
});
const pageHtml = `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${pageJson}</script></html>`;

(globalThis as any).fetch = async (url:any, init:any = {}) => {
  const u = String(url);
  if (u.includes("agent_upload_ticket_consume")) return new Response(JSON.stringify(ticket), { status:200 });
  if (u.includes("/object/info/")) return new Response("{}", { status:404 });
  if (u.includes("/object/authenticated/")) {   // governed read-back (service-role Storage read)
    if (readBackMode === "missing" || !stored) return new Response("{}", { status: 404 });
    const out = readBackMode === "corrupt" ? new Uint8Array(stored.length).fill(7) : readBackMode === "short" ? stored.slice(0, stored.length - 1) : stored;
    return new Response(init.method === "HEAD" ? null : out, { status: 200, headers: { "content-type": readBackMode === "wrong-mime" ? "text/plain" : "video/mp4", "content-length": String(out.length) } });
  }
  if (u.includes("/storage/v1/object/")) {
    storageContentType = String(init.headers?.["Content-Type"] || init.headers?.get?.("Content-Type") || "");
    stored = new Uint8Array(await new Response(init.body).arrayBuffer());
    return new Response(JSON.stringify({ Key:"ok" }), { status:200 });
  }
  if (u.startsWith("https://vt.tiktok.com/") || u.startsWith("https://www.tiktok.com/")) {
    if (u.includes("/api/item/detail/")) return new Response("{}", { status:404, headers:{"content-type":"application/json"} });
    return new Response(pageHtml, {
      status:200,
      headers:{
        "content-type":"text/html",
        "set-cookie":"tt_session=test-cookie; Path=/; Secure",
      },
    });
  }
  if (u.includes("v16-webapp-prime.us.tiktok.com/video/tos/")) {
    if (mediaMode === "forbidden") return new Response("<html>blocked</html>", { status:403, headers:{"content-type":"text/html"} });
    if (mediaMode === "audio") return new Response(new TextEncoder().encode("audio"), { status:200, headers:{"content-type":"audio/mpeg"} });
    return new Response(mp4, {
      status:206,
      headers:{"content-type":"video/mp4","content-length":String(mp4.byteLength)},
    });
  }
  throw new Error("unexpected fetch " + u);
};

await import("./index.ts");

const T = (over:any = {}) => ({
  ok:true,
  bucket:"media",
  path:"sod1820/agent/sharshar-test.mp4",
  mime:"video/mp4",
  max_bytes:1024 * 1024,
  sha256:MP4_SHA,
  allow_overwrite:false,
  public_url:"https://stub.local/public/sharshar-test.mp4",
  ...over,
});

async function postTikTok(url:string, t:any = T()) {
  ticket=t; stored=null; storageContentType="";
  const res=await handler(new Request("https://stub.local/agent-upload?mode=tiktok", {
    method:"POST",
    headers:{"x-agent-upload-ticket":"tok","content-type":"application/json"},
    body:JSON.stringify({url}),
  }));
  return { status:res.status, body:await res.json() };
}

let pass=0, fail=0;
const check=(label:string, cond:boolean, detail="")=>{
  if(cond){pass++; console.log(" PASS "+label)}
  else {fail++; console.log(" FAIL "+label+" "+detail)}
};

mediaMode="ok";
{
  const r=await postTikTok("https://vt.tiktok.com/ZSqPf4qb4/");
  check("TikTok link-only upload succeeds", r.status===200 && r.body.ok===true, JSON.stringify(r.body));
  check("stores exact MP4 bytes", stored ? createHash("sha256").update(stored).digest("hex")===MP4_SHA : false);
  check("ticket MIME controls Storage", storageContentType==="video/mp4", storageContentType);
  check("reports TikTok provenance", r.body.source_kind==="tiktok" && r.body.platform==="tiktok", JSON.stringify(r.body));
  check("music candidate never selected", !String(r.body.resolution_source || "").toLowerCase().includes("music"), String(r.body.resolution_source));
}

check("rejects non-TikTok URL", (await postTikTok("https://example.com/video.mp4")).status===403);
check("requires video/mp4 ticket", (await postTikTok("https://vt.tiktok.com/ZSqPf4qb4/", T({mime:"image/png"}))).status===415);
mediaMode="forbidden";
check("fails closed when TikTok media is blocked", (await postTikTok("https://vt.tiktok.com/ZSqPf4qb4/")).status===502);
mediaMode="ok";
check("ticket sha remains enforced", (await postTikTok("https://vt.tiktok.com/ZSqPf4qb4/", T({sha256:"0".repeat(64)}))).status===422 && stored===null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
