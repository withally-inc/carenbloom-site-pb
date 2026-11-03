import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'

const root = import.meta.dirname
const SRC = resolve(root, 'src')
const INCLUDE = /<!--\s*@include\s+([\w./-]+)\s*-->/g

// `<!-- @include sections/hero.html -->` is replaced by src/sections/hero.html,
// at dev and build time. Included files may include others (max depth 8).
function expand(html: string, from: string, depth = 0): string {
  if (depth > 8) throw new Error(`@include nested too deep in ${from}`)
  return html.replace(INCLUDE, (_m, file: string) => {
    const path = resolve(SRC, file)
    if (!path.startsWith(SRC + sep)) throw new Error(`@include outside src/: ${file}`)
    let body: string
    try {
      body = readFileSync(path, 'utf8')
    } catch {
      throw new Error(`@include not found: src/${file} (from ${from})`)
    }
    return expand(body, file, depth + 1)
  })
}

function htmlInclude(): Plugin {
  return {
    name: 'cb-html-include',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => expand(html, relative(root, ctx.filename)),
    },
    // an included partial is not a module, so nothing would refresh on its own
    configureServer(server: ViteDevServer) {
      const onChange = (file: string) => {
        if (file.startsWith(SRC + sep) && file.endsWith('.html')) server.ws.send({ type: 'full-reload', path: '*' })
      }
      server.watcher.add(resolve(SRC, '**/*.html'))
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
    },
  }
}

// Vercel's cleanUrls + trailingSlash: false, locally: /careers and /careers/apply
// serve their index.html (with appType 'mpa' there is no SPA fallback to the home
// page), a page path with a trailing slash 308s to the bare path with its query
// (/careers/apply/?role=x to /careers/apply?role=x), and any other page-like path
// serves 404.html, as on Vercel.
const PAGES = new Set(['/', '/careers', '/careers/apply', '/404'])
function cleanUrls(): Plugin {
  type Next = () => void
  type Req = { url?: string; headers: Record<string, string | string[] | undefined> }
  type Res = { statusCode: number; setHeader: (k: string, v: string) => void; end: () => void }
  const rewrite = (req: Req, res: Res, next: Next) => {
    const url = req.url ?? '/'
    const q = url.indexOf('?')
    const raw = q < 0 ? url : url.slice(0, q)
    const path = raw.replace(/\/+$/, '') || '/'
    const query = q < 0 ? '' : url.slice(q)
    if (raw !== path && PAGES.has(path)) {
      res.statusCode = 308
      res.setHeader('Location', path + query)
      res.end()
      return
    }
    const accept = String(req.headers.accept ?? '')
    if (path === '/404') req.url = '/404.html' + query
    else if (PAGES.has(path) && path !== '/') req.url = `${path}/index.html${query}`
    else if (!PAGES.has(path) && !/\.[a-z0-9]+$/i.test(path) && !path.startsWith('/@') && !path.startsWith('/api') && !path.startsWith('/src') && !path.startsWith('/node_modules') && accept.includes('text/html')) req.url = '/404.html'
    next()
  }
  return {
    name: 'cb-clean-urls',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

const api = {
  '/api': { target: 'https://carenbloom.com', changeOrigin: true, secure: true },
}

export default defineConfig({
  appType: 'mpa',
  plugins: [htmlInclude(), cleanUrls(), tailwindcss()],
  server: { proxy: api },
  preview: { proxy: api, port: 4174 },
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: {
        home: resolve(root, 'index.html'),
        careers: resolve(root, 'careers/index.html'),
        apply: resolve(root, 'careers/apply/index.html'),
        notfound: resolve(root, '404.html'),
      },
    },
  },
})
