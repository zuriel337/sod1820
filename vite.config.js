import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const is2029 = process.env.SOD_BUILD_TARGET === '2029'

// THEME BOUNDARY (two one-directional build-time adapters; each resolves by resolved file path, not by name pattern).
// Both are temporary and removable: see src/lib/themeHostAdapter2029.js.
//
// 2029 build — shared-but-not-yet-split components still import the Legacy theme/palette modules. Those two files resolve
// to the 2029-owned implementations, so the 2029 bundle carries no Legacy theme store ("sod-theme" read), route table or palette.
//
// Legacy build — the Legacy runtime hosts a few 2029 pages. Their imports of the 2029 theme store/palette resolve to adapters
// over the Legacy theme, so hosted pages follow the host theme (Legacy -> hosted only). The Legacy bundle carries no 2029 store.
const themeBoundary = (name, pairs) => {
  const redirects = new Map(pairs.map(([from, to]) => [resolve(rootDir, from), resolve(rootDir, to)]))
  return {
    name,
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || !source.startsWith('.')) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved && redirects.has(resolved.id) ? redirects.get(resolved.id) : null
    },
  }
}
const legacyBridge2029 = () => themeBoundary('sod-2029-legacy-bridge', [
  ['src/lib/themeMode.js', 'src/lib/themePreset2029.js'],
  ['src/lib/palette.js', 'src/lib/paletteBridge2029.js'],
])
const legacyHostThemeAdapter = () => themeBoundary('sod-legacy-host-theme-adapter', [
  ['src/lib/themePreset2029.js', 'src/lib/themeHostAdapter2029.js'],
  ['src/lib/palette2029.js', 'src/lib/paletteHostAdapter2029.js'],
])

// G3-A hard isolation: legacy and 2029 are built as two independent module graphs.
// This prevents Rollup from re-sharing a common chunk that carries legacy-only presentation
// into the 2029 document merely because both runtimes consume Foundation modules.
export default defineConfig({
  // Reuse the reviewed F20 boundary: the existing Supabase/Auth client remains
  // single; only its optional Realtime transport waits for a channel action.
  resolve: is2029 ? {
    alias: [{ find: /^@supabase\/realtime-js$/, replacement: resolve(rootDir, 'src/lib/realtimeLazy2029.js') }],
  } : undefined,
  plugins: is2029 ? [legacyBridge2029(), react()] : [legacyHostThemeAdapter(), react()],
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
