import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const is2029 = process.env.SOD_BUILD_TARGET === '2029'

// 2029 build only: shared-but-not-yet-split components still import the Legacy theme/palette modules.
// Resolve exactly those two files (by resolved path, not by name pattern) to the 2029-owned implementations so the
// 2029 bundle carries no Legacy theme store ("sod-theme"), route table or palette. Legacy build is untouched.
const legacyBridge2029 = () => {
  const redirects = new Map([
    [resolve(rootDir, 'src/lib/themeMode.js'), resolve(rootDir, 'src/lib/themePreset2029.js')],
    [resolve(rootDir, 'src/lib/palette.js'), resolve(rootDir, 'src/lib/paletteBridge2029.js')],
  ])
  return {
    name: 'sod-2029-legacy-bridge',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || !source.startsWith('.')) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved && redirects.has(resolved.id) ? redirects.get(resolved.id) : null
    },
  }
}

// G3-A hard isolation: legacy and 2029 are built as two independent module graphs.
// This prevents Rollup from re-sharing a common chunk that carries legacy-only presentation
// into the 2029 document merely because both runtimes consume Foundation modules.
export default defineConfig({
  // Reuse the reviewed F20 boundary: the existing Supabase/Auth client remains
  // single; only its optional Realtime transport waits for a channel action.
  resolve: is2029 ? {
    alias: [{ find: /^@supabase\/realtime-js$/, replacement: resolve(rootDir, 'src/lib/realtimeLazy2029.js') }],
  } : undefined,
  plugins: is2029 ? [legacyBridge2029(), react()] : [react()],
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
