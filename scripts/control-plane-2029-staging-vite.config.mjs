// Acceptance-only transport; never changes the deployed Supabase/Auth owners.
import { readFileSync } from 'node:fs';
import config from '../vite.config.js';
const status = JSON.parse(readFileSync(process.env.CONTROL_2029_STAGING_CONFIG, 'utf8'));
if (status.API_URL !== 'https://krnaxxndgtrdnaddlzws.supabase.co') throw new Error('Existing disposable child required');
export default {
  ...config,
  plugins: [{
    name: 'control-2029-disposable-transport', enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (/^\/2029(?:\/|\?|$)/.test(req.url || '')) req.url = '/2029.html';
        next();
      });
    },
    transform(code, id) {
      if (!id.endsWith('/src/lib/supabase.js')) return null;
      return code.replace(/export const SUPABASE_URL = '[^']+';/, `export const SUPABASE_URL = ${JSON.stringify(status.API_URL)};`)
        .replace(/export const SUPABASE_ANON = '[^']+';/, `export const SUPABASE_ANON = ${JSON.stringify(status.ANON_KEY)};`);
    },
  }, ...config.plugins],
  server: { host: '127.0.0.1', port: 5179, strictPort: true },
};
