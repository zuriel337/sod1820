// Local-only review harness. Serve the existing 2029 document and frame while
// preventing live service traffic from shared providers during fixture review.
import { copyFile } from 'node:fs/promises';
import { preview } from 'vite';
await copyFile('dist/kingdom-preview/2029.html', 'dist/kingdom-preview/index.html');
const server = await preview({
  build: { outDir: 'dist/kingdom-preview' },
  preview: {
    host: '0.0.0.0', port: 4173, strictPort: true,
    headers: { 'Content-Security-Policy': "connect-src 'self'; form-action 'self'", 'X-Robots-Tag': 'noindex, nofollow' },
  },
});
server.printUrls();
console.log('Kingdom fixture preview: http://localhost:4173/2029/kingdom');
console.log('Live service connections are blocked in this local review harness.');
