import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const is2029 = process.env.SOD_BUILD_TARGET === '2029'

// G3-A hard isolation: legacy and 2029 are built as two independent module graphs.
// This prevents Rollup from re-sharing a common chunk that carries legacy-only presentation
// into the 2029 document merely because both runtimes consume Foundation modules.
export default defineConfig({
  // Reuse the reviewed F20 boundary: the existing Supabase/Auth client remains
  // single; only its optional Realtime transport waits for a channel action.
  resolve: is2029 ? {
    alias: [{ find: /^@supabase\/realtime-js$/, replacement: resolve(rootDir, 'src/lib/realtimeLazy2029.js') }],
  } : undefined,
  plugins: [react()],
  define: { __SOD_2029_BUILD__: JSON.stringify(is2029) },
  build: {
    emptyOutDir: !is2029,
    manifest: is2029,
    rollupOptions: {
      input: is2029
        ? resolve(rootDir, '2029.html')
        : resolve(rootDir, 'index.html'),
    },
  },
})
