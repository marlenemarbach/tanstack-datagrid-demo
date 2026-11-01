import index from './index.html'

const PORT = Number(process.env.PORT ?? 5173)
const API = `http://localhost:${process.env.API_PORT ?? 3001}`
const development = process.env.NODE_ENV !== 'production'

const server = Bun.serve({
  port: PORT,
  development: development && { hmr: true, console: true },
  routes: {
    // The API itself has no prefix (Zalando: no /api in paths); the proxy strips it.
    '/api/*': (req) => {
      const url = new URL(req.url)
      const target = API + url.pathname.replace(/^\/api/, '') + url.search
      return fetch(target, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        redirect: 'manual',
      })
    },
    '/*': index,
  },
})

console.log(`Client running at ${server.url}`)
