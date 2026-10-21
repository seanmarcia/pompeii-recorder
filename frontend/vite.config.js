import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig } from 'vite'

// After a production build, write dist/sw.js from src/sw-template.js with the
// list of every built file baked in, so the service worker can cache the whole
// app on first visit and it opens with no connection afterwards.
function offlineServiceWorker() {
  let outDir
  return {
    name: 'offline-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      for (const [dependency, source, filename] of [
        ['heic-to', 'LICENSE', 'heic-to-LICENSE.txt'],
        ['@imagemagick/magick-wasm', 'LICENSE', 'magick-wasm-LICENSE.txt'],
        ['@imagemagick/magick-wasm', 'NOTICE', 'magick-wasm-NOTICE.txt'],
      ]) {
        writeFileSync(
          join(outDir, filename),
          readFileSync(new URL(`./node_modules/${dependency}/${source}`, import.meta.url)),
        )
      }
      const files = []
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name)
          if (statSync(full).isDirectory()) walk(full)
          else files.push(relative(outDir, full).split('\\').join('/'))
        }
      }
      walk(outDir)
      const precache = files.filter((f) => f !== 'sw.js')
      const hash = createHash('sha256')
      for (const f of precache) hash.update(f).update(readFileSync(join(outDir, f)))
      const template = readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf8')
      writeFileSync(
        join(outDir, 'sw.js'),
        template
          .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 12))
          .replace('__PRECACHE_FILES__', JSON.stringify(precache)),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlineServiceWorker()],
  optimizeDeps: { include: ['heic-to/csp', '@imagemagick/magick-wasm'] },
  // GitHub Pages serves from /pompeii-recorder/; the fdpompeii.org build sets VITE_BASE=/.
  base: process.env.VITE_BASE || '/pompeii-recorder/',
  // Keep built files out of /assets, which the Rails backend uses for its own.
  build: { assetsDir: 'field-assets' },
})
