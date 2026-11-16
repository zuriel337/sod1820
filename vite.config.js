import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
// SOD_BUILD_TARGET is still passed by existing scripts and is ignored: 2029 is the only target.
const is2029 = true

// 2029 is the only product. The single entry is 2029.html; there is no Legacy document or build target.
export default defineConfig({
  // Reuse the reviewed F20 boundary: the existing Supabase/Auth client remains
  // single; only its optional Realtime transport waits for a channel action.
  // (is2029 is constant true now; the conditional form is kept because the Realtime entry-split contract test asserts it.)
  resolve: is2029 ? {
    alias: [
      { find: /^@supabase\/realtime-js$/, replacement: resolve(rootDir, 'src/lib/realtimeLazy2029.js') },
      // Same boundary for Storage (shell budget, 16.11.2026): only from().upload/getPublicUrl are used; the real client loads on the first upload.
      { find: /^@supabase\/storage-js$/, replacement: resolve(rootDir, 'src/lib/storageLazy2029.js') },
    ],
  } : undefined,
  plugins: [react()],
  define: { __SOD_2029_BUILD__: JSON.stringify(is2029) },
  build: {
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: resolve(rootDir, '2029.html'),
    },
  },
})
