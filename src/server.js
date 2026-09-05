import { createServer } from 'http'
import { URL } from 'url'

import healthHandler from '../api/health.js'
import svgHandler from '../api/svg.js'
import pngHandler from '../api/png.js'
import metricsHandler from '../api/metrics.js'

const PORT = Number(process.env.PORT) || 3000

const routes = new Map([
  ['/health', healthHandler],
  ['/svg', svgHandler],
  ['/png', pngHandler],
  ['/metrics', metricsHandler]
])

function send(res, statusCode, body, headers = {}) {
  res.statusCode = statusCode
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  if (body == null) {
    return res.end()
  }
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return res.end(body)
  }
  return res.end(JSON.stringify(body))
}

function buildResponse(res) {
  return {
    status(code) {
      this._status = code
      return this
    },
    setHeader(k, v) {
      this._headers = this._headers || {}
      this._headers[k] = v
      return this
    },
    json(body) {
      const headers = { 'Content-Type': 'application/json', ...(this._headers || {}) }
      return send(res, this._status || 200, JSON.stringify(body), headers)
    },
    send(body) {
      return send(res, this._status || 200, body, this._headers || {})
    },
    end() {
      return send(res, this._status || 200, null, this._headers || {})
    }
  }
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  const handler = routes.get(pathname)
  if (!handler) {
    return send(res, 404, { error: 'Not Found' })
  }

  const adaptedReq = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: Object.fromEntries(url.searchParams)
  }

  const adaptedRes = buildResponse(res)
  await handler(adaptedReq, adaptedRes)
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    res.statusCode = 500
    res.end(JSON.stringify({ error: err.message }))
  })
})

server.listen(PORT, () => {
  console.log(`d3d-render listening on :${PORT}`)
})
