// Local test server only. Never forwards application/API writes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.SOD_STATIC_ROOT);
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'};
http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/')){res.writeHead(403);return res.end();}
 const fallback=path.join(root,'2029.html');
 let file=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)){file=fallback;}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())file=fallback;
 let data=fs.readFileSync(file);
 if(file.endsWith('.html')){let html=data.toString(),entry=html.match(/await import\('([^']+)'\)/)?.[1];
  if(entry)html=html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/,`<script type="module" src="${entry}"></script>`);data=Buffer.from(html);}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
 res.end(req.method==='HEAD'?undefined:data);
}).listen(Number(process.env.SOD_STATIC_PORT),'127.0.0.1',()=>console.log('read-only test server '+process.env.SOD_STATIC_PORT));
