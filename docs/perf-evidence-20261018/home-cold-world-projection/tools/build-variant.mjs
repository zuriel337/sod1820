// Preview-equivalent Vite build (the same defines as scripts/build-integrated-preview.mjs) without the service-worker guard/bootstrap.
// Run from the repository root: node <this file> <outDir>
import { build } from 'vite';
const out = process.argv[2];
process.env.SOD_BUILD_TARGET = '2029';
await build({
  root: process.cwd(),
  logLevel: 'warn',
  define: {
    'import.meta.env.VITE_INTEGRATED_PREVIEW': '"true"',
    'import.meta.env.VITE_KINGDOM_PREVIEW': '"true"',
    __SOD_NUMBER_REVIEW_PREVIEW_HOST__: JSON.stringify('sod1820-pb7imoyxr-sod1820-s-projects.vercel.app'),
  },
  build: { outDir: out, emptyOutDir: true, manifest: true },
});
console.log('built', out);
