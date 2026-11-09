// See docs/ASSETS.md for image rebuild commands, dependency order and cleanup ownership.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const seq = args.includes('--seq')
const run = (label, cmd, argv) => {
  const t = Date.now()
  console.log(`\n▸ ${label}`)
  execFileSync(cmd, argv, { cwd: root, stdio: 'inherit' })
  console.log(`  ${label}: ${((Date.now() - t) / 1000).toFixed(1)}s`)
}

run('base images (images.mjs)', 'node', ['scripts/images.mjs', ...args])
if (!seq) {
  run('visitor photos (visit-images.mjs)', 'node', ['scripts/visit-images.mjs'])
  if (fs.existsSync(path.join(root, 'scripts/values/sources'))) run('values art (values/build.mjs)', 'node', ['scripts/values/build.mjs'])
  if (fs.existsSync(path.join(root, 'scripts/companions/build.py'))) run('companions (companions/build.py)', 'python3', ['-I', 'scripts/companions/build.py'])
}
run('violet variants (halftone-dark.mjs)', 'node', ['scripts/halftone-dark.mjs', ...(seq ? ['--seq'] : [])])
