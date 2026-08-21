const WINDOW_MS = 60_000
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_RPM) || 60
const MAX_URL_BYTES = 8 * 1024
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS) || 10_000

// Per-IP sliding window: Map<ip, timestamp[]>
const ipWindows = new Map()

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for']
  return (xff ? xff.split(',')[0] : req.socket?.remoteAddress || 'unknown').trim()
}

function checkRateLimit(ip) {
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  const hits = (ipWindows.get(ip) || []).filter((t) => t > cutoff)
  hits.push(now)
  ipWindows.set(ip, hits)
  return hits.length <= MAX_REQUESTS
}

// Periodically drop stale IP entries so the map doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS
  for (const [ip, hits] of ipWindows.entries()) {
    const trimmed = hits.filter((t) => t > cutoff)
    if (trimmed.length === 0) ipWindows.delete(ip)
    else ipWindows.set(ip, trimmed)
  }
}, 60_000).unref?.()

export function log(level, msg, extra = {}) {
  // Never include query strings — ?src= carries user diagram data.
  process.stdout.write(
    JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }) + '\n'
  )
}

/**
 * Wraps a Vercel handler with:
 *   - non-GET rejection (405)
 *   - URL length guard (414)
 *   - per-IP sliding window rate limit (429 + Retry-After)
 *   - render timeout (503)
 *   - structured JSON request logging
 */
export function withGuards(handler) {
  return async function (req, res) {
    const start = Date.now()
    const ip = getClientIp(req)
    const path = (req.url || '').split('?')[0]

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      log('warn', 'method_not_allowed', { ip, method: req.method, path })
      res.setHeader('Allow', 'GET, HEAD')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    if (req.method === 'HEAD') {
      const origSend = res.send.bind(res)
      res.send = () => origSend('')
    }

    const urlLen = (req.url || '').length
    if (urlLen > MAX_URL_BYTES) {
      log('warn', 'url_too_large', { ip, urlLen, path })
      return res.status(414).json({ error: `URL too long (${urlLen} bytes, max ${MAX_URL_BYTES})` })
    }

    if (!checkRateLimit(ip)) {
      log('warn', 'rate_limited', { ip, path })
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ error: 'Too Many Requests', retryAfter: 60 })
    }

    let timeoutId
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(Object.assign(new Error('Render timed out'), { statusCode: 503 }))
      }, RENDER_TIMEOUT_MS)
    })

    try {
      await Promise.race([handler(req, res), timeout])
      clearTimeout(timeoutId)
      log('info', 'request', { ip, path, ms: Date.now() - start })
    } catch (e) {
      clearTimeout(timeoutId)
      log('error', 'handler_error', { ip, path, err: e.message, ms: Date.now() - start })
      if (!res.headersSent) {
        res.status(e.statusCode || 500).json({ error: e.message })
      }
    }
  }
}
