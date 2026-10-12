import {build,createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {zipFiles} from './zip.mjs';
const out=fileURLToPath(new URL('../../dist/kingdom-preview/icon-library',import.meta.url));
await build({configFile:false,root:fileURLToPath(new URL('./',import.meta.url)),base:'/icon-library/',plugins:[react()],build:{outDir:out,emptyOutDir:true}});
const server=await createServer({configFile:false,root:fileURLToPath(new URL('../../',import.meta.url)),plugins:[react()],server:{middlewareMode:true}});
try {
 const {default:Icon,ICON_CATALOG,RESEARCH_ICON_ALIASES}=await server.ssrLoadModule('/src/components/experience2029/NavigationIcon2029.jsx');
 const names=new Set(ICON_CATALOG.map(x=>x.name));
 if(names.size!==ICON_CATALOG.length)throw new Error('Duplicate icon names');
 for(const name of Object.values(RESEARCH_ICON_ALIASES))if(!names.has(name))throw new Error(`Unknown alias: ${name}`);
 await mkdir(`${out}/svg`,{recursive:true});
 for(const item of ICON_CATALOG){
  let svg=renderToStaticMarkup(createElement(Icon,{name:item.name,size:24}));
  if(svg.includes('data-icon-fallback'))throw new Error(`Missing shape: ${item.name}`);
  const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  svg=svg.replace('<svg ',`<svg xmlns="http://www.w3.org/2000/svg" role="img" `).replace('aria-hidden="true"','').replace(/(<svg[^>]*>)/,`$1<title>${escape(item.label)}</title>`);
  await writeFile(`${out}/svg/${item.name}.svg`,svg+'\n');
 }
 await writeFile(`${out}/catalog.json`,JSON.stringify({viewBox:'0 0 24 24',strokeWidth:1.8,icons:ICON_CATALOG},null,2)+'\n');
 await writeFile(`${out}/svg/Rubik-OFL.txt`,await readFile(new URL('../../public/legal/rubik-outline-OFL.txt',import.meta.url)));
 const archive=[];
 for(const item of ICON_CATALOG)archive.push({name:`svg/${item.name}.svg`,data:await readFile(`${out}/svg/${item.name}.svg`)});
 archive.push({name:'catalog.json',data:await readFile(`${out}/catalog.json`)});
 archive.push({name:'Rubik-OFL.txt',data:await readFile(`${out}/svg/Rubik-OFL.txt`)});
 await writeFile(`${out}/sod1820-icons.zip`,zipFiles(archive));
 console.log(`Exported ${ICON_CATALOG.length} canonical SVG icons.`);
} finally {await server.close();}
