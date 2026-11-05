// Static server for a Vite dist directory with SPA fallback to 2029.html (localhost only). Usage: node tools/perf/serve-dist.cjs <dist> <port>
const http=require('http'),fs=require('fs'),path=require('path');
const dir=path.resolve(process.argv[2]), port=+process.argv[3];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain'};
http.createServer((req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://x').pathname); const f=path.join(dir,p);
  if(!f.startsWith(dir)){res.writeHead(403);return res.end();}
  fs.stat(f,(e,s)=>{
    if(!e&&s.isFile()){res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(f).pipe(res);}
    else{res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});fs.createReadStream(path.join(dir,'2029.html')).pipe(res);}
  });
}).listen(port,'127.0.0.1',()=>console.log('listening',port,dir));
