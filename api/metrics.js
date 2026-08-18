import { cacheMetrics } from '../src/cache.js'

export default function handler(_req, res) {
  const m = cacheMetrics()
  const body = [
    '# HELP d3d_render_cache_hits_total Cache hits',
    '# TYPE d3d_render_cache_hits_total counter',
    `d3d_render_cache_hits_total ${m.hits}`,
    '# HELP d3d_render_cache_misses_total Cache misses',
    '# TYPE d3d_render_cache_misses_total counter',
    `d3d_render_cache_misses_total ${m.misses}`
  ].join('\n')
  res.setHeader('Content-Type', 'text/plain; version=0.0.4')
  res.status(200).send(body)
}
