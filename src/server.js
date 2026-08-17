import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { svgHandler } from './routes/svg.js'
import { pngHandler } from './routes/png.js'
import { cacheMetrics } from './cache.js'

const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60
const MAX_URL_BYTES = 8 * 1024

export async function build(opts = {}) {
  const app = Fastify(opts)

  await app.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    }
  })

  // Reject oversized URLs before parsing
  app.addHook('onRequest', async (request, reply) => {
    const url = request.raw.url || ''
    if (Buffer.byteLength(url) > MAX_URL_BYTES) {
      return reply.code(414).send({ error: 'URL too long' })
    }
  })

  app.get('/health', async () => ({ status: 'ok' }))
  app.get('/svg', svgHandler)
  app.get('/png', pngHandler)
  app.get('/metrics', async () => {
    const m = cacheMetrics()
    return [
      `# HELP d3d_render_cache_hits_total Cache hits`,
      `# TYPE d3d_render_cache_hits_total counter`,
      `d3d_render_cache_hits_total ${m.hits}`,
      `# HELP d3d_render_cache_misses_total Cache misses`,
      `# TYPE d3d_render_cache_misses_total counter`,
      `d3d_render_cache_misses_total ${m.misses}`
    ].join('\n')
  })

  return app
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await build({ logger: true })
  const port = Number(process.env.PORT) || 3000
  app.listen({ port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
}
