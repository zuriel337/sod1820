import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
await build({configFile:false,root:fileURLToPath(new URL('./',import.meta.url)),base:'/spatial-review/',plugins:[react()],build:{outDir:fileURLToPath(new URL('../../dist/kingdom-preview/spatial-review',import.meta.url)),emptyOutDir:true}});
