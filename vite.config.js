import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { entryPrimaryReads2029, postReadUrl, postBySlugRead, latestPostCardsRead, HOME_LATEST_POST_LIMIT_2029 } from './src/lib/postReadQueries2029.js'
import { startPrimaryReads2029 } from './src/lib/earlyPrimaryRead2029.js'
import { SUPABASE_URL, SUPABASE_ANON } from './src/lib/supabasePublicConfig.js'
import { isNumberReviewPreviewBuild2029 } from './src/lib/numberReviewPreview2029.js'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const is2029 = process.env.SOD_BUILD_TARGET === '2029'
const numberReviewPreviewOpen = isNumberReviewPreviewBuild2029(process.env)
const buildSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.SOD_BUILD_SHA || 'unknown'
const deployEnv = process.env.VERCEL_ENV || process.env.SOD_DEPLOY_ENV || 'unknown'

// G3-A hard isolation: legacy and 2029 are built as two independent module graphs.
// This prevents Rollup from re-sharing a common chunk that carries legacy-only presentation
// into the 2029 document merely because both runtimes consume Foundation modules.
export default defineConfig({
  define: {
    __SOD_2029_BUILD__: JSON.stringify(is2029),
    __SOD_NUMBER_REVIEW_PREVIEW_OPEN__: JSON.stringify(numberReviewPreviewOpen),
    __SOD_BUILD_SHA__: JSON.stringify(buildSha),
    __SOD_DEPLOY_ENV__: JSON.stringify(deployEnv),
  },
  plugins: [react(), {
    // Preserve the shared source/Legacy graph while the 2029 first-load graph
    // binds pure identity calls and memory-only telemetry to its flag boundary.
    name: '2029-telemetry-entry-boundary',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!is2029 || !importer) return null
      const normalized = importer.replace(/\\/g, '/')
      if (/(?:^|\/)tracking\.js$/.test(source) && /(?:lib\/(?:AuthContext|commandCenter|push)|components\/(?:WatchButton|experience2029\/(?:SystemFrame2029|HomeBuildSignup2029)))\.jsx?$/.test(normalized)) {
        return resolve(rootDir, 'src/lib/visitorId.js')
      }
      if (/(?:^|\/)tracking\.js$/.test(source) && /(?:lib\/research\/ResearchProvider|lib\/storyTrack|lib\/propagation|lib\/share\/shareTelemetry|components\/(?:BrandTicker|Lightbox|OrGeulaStoryColumnCore))\.jsx?$/.test(normalized)) {
        return resolve(rootDir, 'src/lib/trackingEntryFacade2029.js')
      }
      if (/(?:^|\/)marketing\.js$/.test(source) && /components\/(?:EmailVerify|WatchButton)\.jsx$/.test(normalized)) {
        return resolve(rootDir, 'src/lib/trackingEntryFacade2029.js')
      }
      return null
    },
  }, {
    name: '2029-entry-primary-reads',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!is2029) return html;
        // Slug routes use the same pure query definition, serialized here without loading React or supabase-js.
        const code = `(()=>{try{const route=location.pathname;const HOME_LATEST_POST_LIMIT_2029=${HOME_LATEST_POST_LIMIT_2029};const postBySlugRead=${postBySlugRead.toString()};const postReadUrl=${postReadUrl.toString()};const entryPrimaryReads2029=${entryPrimaryReads2029.toString()};const latestPostCardsRead=${latestPostCardsRead.toString()};const urls=entryPrimaryReads2029(route).map(d=>postReadUrl(${JSON.stringify(SUPABASE_URL)},d));(${startPrimaryReads2029.toString()})({route,urls,anonKey:${JSON.stringify(SUPABASE_ANON)}})}catch{}})();`;
        return html.replace('    <link rel="preload"', `    <script id="sod2029-primary-reads">${code}</script>\n    <link rel="preload"`);
      },
    },
  }],
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
