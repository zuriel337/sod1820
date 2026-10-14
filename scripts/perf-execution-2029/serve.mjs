// Static server mimicking Vercel: brotli, immutable assets, SPA fallback to 2029.html.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const MIME={'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.woff2':'font/woff2','.ttf':'font/ttf','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'};
export function serve(dist, port=0){
  const cache=new Map();
  const srv=http.createServer((req,res)=>{
    let p=decodeURIComponent(new URL(req.url,'http://x').pathname);
    let f=path.join(dist,p);
    if(!f.startsWith(dist)||!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=path.join(dist,'2029.html');
    const ext=path.extname(f); const isAsset=p.startsWith('/assets/')||p.startsWith('/fonts/');
    const h={'content-type':MIME[ext]||'application/octet-stream','cache-control':isAsset?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate'};
    const ae=req.headers['accept-encoding']||''; const comp=['.js','.css','.html','.json','.svg','.ttf'].includes(ext);
    let body=cache.get(f)?.raw ?? (cache.set(f,{raw:fs.readFileSync(f)}),cache.get(f).raw);
    if(comp&&ae.includes('br')){ let e=cache.get(f); e.br??=zlib.brotliCompressSync(body,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}); body=e.br; h['content-encoding']='br'; }
    h['content-length']=body.length; res.writeHead(200,h); res.end(body);
  });
  return new Promise(r=>srv.listen(port,'127.0.0.1',()=>r({srv,port:srv.address().port})));
}
