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
  plugins: [react()],
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
