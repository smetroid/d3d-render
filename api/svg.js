import { readFile } from 'fs/promises'
import { graphlibToCyElements } from '../src/render/graphlibToCy.js'
import { renderSvg } from '../src/render/renderSvg.js'
import { cacheKey, cacheGet, cachePut } from '../src/cache.js'
import { resolveParams, buildPlaceholderSvg } from '../src/routes/resolve.js'
import { withGuards } from '../src/middleware.js'

const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800'

async function handler(req, res) {
  const { src, id, layout = 'dagre', theme = 'dark' } = req.query
  const ifNoneMatch = req.headers['if-none-match']

  const resolved = await resolveParams({ src, id, layout, theme, ifNoneMatch })

  if (resolved.statusCode === 304) {
    return res.status(304).end()
  }
  if (resolved.statusCode) {
    return res.status(resolved.statusCode).json(resolved.body)
  }
  if (resolved.placeholder) {
    res.setHeader('Content-Type', 'image/svg+xml')
    return res.status(200).send(buildPlaceholderSvg(resolved.theme, 'Diagram unavailable'))
  }

  const { graphlibJson, responseEtag, embedRevision } = resolved
  const key = cacheKey([responseEtag])

  const cached = await cacheGet(key, 'svg')
  if (cached) {
    const data = await readFile(cached)
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
    res.setHeader('Cache-Control', CACHE_CONTROL)
    res.setHeader('ETag', responseEtag)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('X-Cache', 'HIT')
    if (embedRevision != null) res.setHeader('X-Embed-Revision', String(embedRevision))
    return res.status(200).send(data)
  }

  let svgStr
  try {
    const elements = graphlibToCyElements(graphlibJson)
    svgStr = await renderSvg(elements, { layout, theme })
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message })
  }

  cachePut(key, 'svg', svgStr).catch(() => {})

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
  res.setHeader('Cache-Control', CACHE_CONTROL)
  res.setHeader('ETag', responseEtag)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('X-Cache', 'MISS')
  res.setHeader('X-Rendered-At', new Date().toISOString())
  if (embedRevision != null) res.setHeader('X-Embed-Revision', String(embedRevision))
  return res.status(200).send(svgStr)
}

export default withGuards(handler)
