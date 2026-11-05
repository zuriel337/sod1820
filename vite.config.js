import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
// SOD_BUILD_TARGET is still passed by existing scripts and is ignored: 2029 is the only target.
const is2029 = true

// THEME BRIDGE (temporary, 2029 build): components that still import the old theme/palette module paths resolve to the
// 2029-owned implementations. Removed when those components import the 2029 modules directly.
const themeBridge2029 = () => {
  const redirects = new Map([
    [resolve(rootDir, 'src/lib/themeMode.js'), resolve(rootDir, 'src/lib/themePreset2029.js')],
    [resolve(rootDir, 'src/lib/palette.js'), resolve(rootDir, 'src/lib/paletteBridge2029.js')],
  ])
  return {
    name: 'sod-2029-theme-bridge',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || !source.startsWith('.')) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved && redirects.has(resolved.id) ? redirects.get(resolved.id) : null
    },
  }
}

// 2029 is the only product. The single entry is 2029.html; there is no Legacy document or build target.
export default defineConfig({
  // Reuse the reviewed F20 boundary: the existing Supabase/Auth client remains
  // single; only its optional Realtime transport waits for a channel action.
  resolve: {
    alias: [{ find: /^@supabase\/realtime-js$/, replacement: resolve(rootDir, 'src/lib/realtimeLazy2029.js') }],
  },
  plugins: [themeBridge2029(), react()],
  define: { __SOD_2029_BUILD__: JSON.stringify(is2029) },
  build: {
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: resolve(rootDir, '2029.html'),
    },
  },
})
