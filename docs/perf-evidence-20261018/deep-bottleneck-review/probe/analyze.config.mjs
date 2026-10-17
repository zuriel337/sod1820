import base from './vite.config.js'
import { writeFileSync } from 'node:fs'
const analyze = {
  name: 'analyze-modules',
  generateBundle(_, bundle) {
    const out = {}
    for (const [file, c] of Object.entries(bundle)) {
      if (c.type !== 'chunk') continue
      const mods = Object.entries(c.modules || {}).map(([id, m]) => ({ id: id.replace(/.*\/node_modules\//, 'NM:').replace(/.*\/src\//, 'src/'), len: m.renderedLength ?? m.code?.length ?? 0 }))
      out[file] = { isEntry: c.isEntry, isDynamicEntry: c.isDynamicEntry, imports: c.imports, dynamicImports: c.dynamicImports, size: c.code.length, mods: mods.sort((a, b) => b.len - a.len) }
    }
    writeFileSync('analysis-modules.json', JSON.stringify(out))
  },
}
export default { ...base, plugins: [...(base.plugins || []), analyze] }
