// Transparent reverse proxy only. Every API response comes from a real service.
import http from "node:http";
const upstreams = { auth: ["auth", 9999], rest: ["rest", 3000], functions: ["edge", 9000] };
http.createServer((req, res) => {
  const route = /^\/(auth|rest|functions)\/v1(?=\/|$)/.exec(req.url || "");
  if (!route) { res.writeHead(404); res.end(); return; }
  const [hostname, port] = upstreams[route[1]];
  const request = http.request({ hostname, port, method: req.method,
    path: req.url.slice(route[0].length) || "/", headers: { ...req.headers, host: `${hostname}:${port}` } }, response => {
    console.log(`A3_GATEWAY method=${req.method} path=${req.url.split("?")[0]} status=${response.statusCode}`);
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  request.on("error", () => { res.writeHead(502); res.end("isolated upstream unavailable"); });
  req.pipe(request);
}).listen(8000, "0.0.0.0");
