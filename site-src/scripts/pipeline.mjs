// The whole image pipeline in one command, in dependency order: `pnpm images`.
//   pnpm images                 everything public/img serves
//   pnpm images -- --extras     also the files no page requests (images.mjs --extras)
//   pnpm images -- --seq        only the bloom sequence and its violet frames
// 1. scripts/images.mjs          base images, logos, lemon, bloom sequence, manifest. It wipes only what it
//                                makes: public/img/values/ and public/img/companions/ are kept.
// 2. scripts/values/build.mjs    values art and its violet prints (public/img/values/)
// 3. scripts/companions/build.py companion sprites and their violet prints (public/img/companions/)
// 4. scripts/halftone-dark.mjs   the -violet variants of step 1 (they sit next to the light files, so step 1
//                                would delete them: this step always runs last)
// See docs/ASSETS.md.
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
