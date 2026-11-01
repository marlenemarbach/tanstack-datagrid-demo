import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { generateOrders } from './data.ts'
import { QueryEngine, type QueryRequest } from './query.ts'
import { Problem } from './problem.ts'

const PORT = Number(process.env.PORT ?? 3001)
const ROWS = Number(process.env.MOCK_ROWS ?? 100_000)
/** Artificial latency so loading states are visible in the demo. */
const LATENCY_MS = Number(process.env.MOCK_LATENCY_MS ?? 150)

const started = performance.now()
const engine = new QueryEngine(generateOrders(ROWS))
console.log(`Generated ${engine.size.toLocaleString()} orders in ${Math.round(performance.now() - started)} ms`)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function readJson(req: IncomingMessage, allowed: Array<string>): Promise<unknown> {
  const type = (req.headers['content-type'] ?? '').split(';')[0]!.trim()
  if (!allowed.includes(type)) {
    throw new Problem(415, 'Unsupported media type', `Expected one of: ${allowed.join(', ')}.`)
  }
  const chunks: Array<Buffer> = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}')
  } catch {
    throw new Problem(400, 'Malformed JSON', 'The request body is not valid JSON.')
  }
}

function send(res: ServerResponse, status: number, body: unknown, contentType = 'application/json') {
  res.writeHead(status, { 'Content-Type': contentType })
  res.end(JSON.stringify(body))
}

const ORDER_PATH = /^\/orders\/([A-Za-z0-9-]+)$/

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (url.pathname === '/orders/query') {
    if (req.method !== 'POST') throw new Problem(405, 'Method not allowed')
    const body = (await readJson(req, ['application/json'])) as QueryRequest
    await sleep(LATENCY_MS)
    return send(res, 200, engine.query(body))
  }

  const match = ORDER_PATH.exec(url.pathname)
  if (match) {
    if (req.method !== 'PATCH') throw new Problem(405, 'Method not allowed')
    const patch = await readJson(req, ['application/merge-patch+json', 'application/json'])
    await sleep(LATENCY_MS)
    return send(res, 200, engine.patch(match[1]!, patch as Record<string, unknown>))
  }

  if (url.pathname === '/health' && req.method === 'GET') return send(res, 200, { status: 'UP' })

  throw new Problem(404, 'Not found', `No resource at \`${url.pathname}\`.`)
}

createServer(async (req, res) => {
  // Zalando: propagate the flow id for tracing.
  res.setHeader('X-Flow-ID', (req.headers['x-flow-id'] as string | undefined) ?? randomUUID())
  try {
    await route(req, res)
  } catch (err) {
    const problem = err instanceof Problem ? err : new Problem(500, 'Internal server error')
    if (!(err instanceof Problem)) console.error(err)
    send(res, problem.status, problem, 'application/problem+json')
  }
}).listen(PORT, () => console.log(`Orders API listening on http://localhost:${PORT}`))
