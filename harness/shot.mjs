// Dependency-free CDP driver: screenshots the real DetailPanel (full-page) for both cases × widths.
const BASE = "http://127.0.0.1:8199/index.html";
const CDP = "http://127.0.0.1:9222";
const shots = [
  { name: "rich-desktop", url: `${BASE}`, w: 1280 },
  { name: "rich-mobile", url: `${BASE}`, w: 390 },
  { name: "missing-desktop", url: `${BASE}?case=missing`, w: 1280 },
  { name: "missing-mobile", url: `${BASE}?case=missing`, w: 390 },
];
const j = async (p) => (await fetch(CDP + p)).json();
async function rpc(ws, id, method, params) {
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res) => {
    const h = (e) => { const m = JSON.parse(e.data); if (m.id === id) { ws.removeEventListener("message", h); res(m.result); } };
    ws.addEventListener("message", h);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tabs = await (await fetch(CDP + "/json/new?about:blank", { method: "PUT" })).json();
const wsUrl = tabs.webSocketDebuggerUrl;
for (let i = 0; i < shots.length; i++) {
  const s = shots[i];
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 1;
  await rpc(ws, id++, "Page.enable");
  await rpc(ws, id++, "Emulation.setDeviceMetricsOverride", { width: s.w, height: 900, deviceScaleFactor: 1, mobile: s.w < 500 });
  await rpc(ws, id++, "Page.navigate", { url: s.url });
  await sleep(3500); // vite bundle + fixture render
  // flatten the fixed modal → flow layout so the WHOLE panel (incl. mid-panel Field Package) is captured
  const flat = await rpc(ws, id++, "Runtime.evaluate", {
    expression: `(() => {
      const ov = [...document.querySelectorAll('div')].find(d => d.style.position==='fixed' && d.style.zIndex==='5000');
      if (ov) { ov.style.position='static'; ov.style.overflow='visible'; ov.style.height='auto'; ov.style.padding='16px 12px'; ov.style.alignItems='flex-start'; }
      document.body.style.height='auto';
      const hasFP = document.body.innerText.includes('Field Package');
      const methodPills = (document.body.innerText.match(/=\\s?\\d/g)||[]).length;
      const err = document.body.innerText.includes('לא ניתן להרכיב');
      return { h: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight), hasFP, methodPills, err };
    })()`, returnByValue: true });
  const meta = flat.result.value || {};
  const full = Math.min((meta.h || 1600) + 40, 12000);
  const cap = await rpc(ws, id++, "Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: s.w, height: full, scale: 1 } });
  const fs = await import("node:fs");
  fs.writeFileSync(`harness/out-${s.name}.png`, Buffer.from(cap.data, "base64"));
  console.log(`✓ ${s.name} (${s.w}×${full}) FieldPackage=${meta.hasFP} valuePills=${meta.methodPills} engineErr=${meta.err}`);
  ws.close();
}
console.log("done");
