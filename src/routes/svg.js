import { createHash } from 'crypto'
import { decode } from '../render/decode.js'
import { graphlibToCyElements, validateGraphlib } from '../render/graphlibToCy.js'
import { renderSvg } from '../render/renderSvg.js'
import { cacheKey, cacheGet, cachePut, cacheReadStream } from '../cache.js'

const RENDERER_VERSION = '1'
const D3D_API_BASE = process.env.D3D_API_BASE || 'https://d3d-api.fly.dev'
const D3DWEB_BASE = process.env.D3DWEB_BASE || 'https://d3dweb.fly.dev'
const UPSTREAM_TIMEOUT_MS = 5000

const CACHE_CONTROL = 'public, max-age=31536000, immutable'

function etag(key) {
  return '"' + createHash('sha256').update(key).digest('hex').slice(0, 24) + '"'
}

export function wrapSvgLink(svgStr, href) {
  return svgStr
    .replace(/^(<svg[^>]*>)/, `$1<a xlink:href="${href}" target="_blank" rel="noopener">`)
    .replace(/<\/svg>$/, '</a></svg>')
}

async function fetchPublicDag(id, ifNoneMatch) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const headers = {}
    if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch
    const res = await fetch(`${D3D_API_BASE}/dag/${id}/public`, { headers, signal: ctrl.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

export async function resolveGraphlib(request, reply) {
  const { src, id, layout = 'dagre', theme = 'dark' } = request.query

  if (!src && !id) {
    reply.code(400).send({ error: 'Either ?src= or ?id= is required' })
    return null
  }

  let graphlibJson, deepLinkUrl, responseEtag

  if (src) {
    try {
      graphlibJson = decode(src)
    } catch (e) {
      reply.code(e.statusCode || 400).send({ error: e.message })
      return null
    }
    try {
      validateGraphlib(graphlibJson)
    } catch (e) {
      reply.code(400).send({ error: e.message })
      return null
    }
    deepLinkUrl = `${D3DWEB_BASE}/?src=${encodeURIComponent(src)}`
    responseEtag = etag(`src:${src}:${layout}:${theme}:v${RENDERER_VERSION}`)
  } else {
    const upstreamIfNoneMatch = request.headers['if-none-match']
    let upstreamRes
    try {
      upstreamRes = await fetchPublicDag(id, upstreamIfNoneMatch)
    } catch {
      return { placeholder: true, theme }
    }

    if (upstreamRes.status === 404) {
      reply.code(404).send({ error: 'Diagram not found or not public' })
      return null
    }
    if (upstreamRes.status === 304) {
      reply.code(304).send()
      return null
    }
    if (!upstreamRes.ok) {
      return { placeholder: true, theme }
    }

    let body
    try {
      body = await upstreamRes.json()
    } catch {
      reply.code(502).send({ error: 'Invalid response from upstream' })
      return null
    }
    try {
      graphlibJson = JSON.parse(body.diagram)
    } catch {
      reply.code(502).send({ error: 'Diagram data is not valid JSON' })
      return null
    }
    try {
      validateGraphlib(graphlibJson)
    } catch (e) {
      reply.code(502).send({ error: e.message })
      return null
    }

    deepLinkUrl = `${D3DWEB_BASE}/?id=${encodeURIComponent(id)}`
    const upstreamEtag = upstreamRes.headers.get('etag') || `rev:${body.embedRevision}`
    responseEtag = etag(`id:${upstreamEtag}:${layout}:${theme}:v${RENDERER_VERSION}`)

    if (upstreamIfNoneMatch && upstreamIfNoneMatch === responseEtag) {
      reply.code(304).send()
      return null
    }
  }

  return { graphlibJson, deepLinkUrl, responseEtag, layout, theme }
}

export function buildPlaceholderSvg(theme, message) {
  const bg = theme === 'light' ? '#f5f6fa' : '#12131a'
  const fg = theme === 'light' ? '#546070' : '#8890b0'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80"><rect width="100%" height="100%" fill="${bg}"/><text x="160" y="44" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="${fg}" font-family="system-ui, sans-serif">${message}</text></svg>`
}

export async function svgHandler(request, reply) {
  const { layout = 'dagre', theme = 'dark' } = request.query

  const resolved = await resolveGraphlib(request, reply)
  if (!resolved) return
  if (resolved.placeholder) {
    return reply
      .code(200)
      .header('Content-Type', 'image/svg+xml')
      .send(buildPlaceholderSvg(resolved.theme, 'Diagram unavailable'))
  }

  const { graphlibJson, deepLinkUrl, responseEtag } = resolved

  // Check cache
  const key = cacheKey([resolved.responseEtag])
  const cached = await cacheGet(key, 'svg')
  if (cached) {
    return reply
      .code(200)
      .header('Content-Type', 'image/svg+xml; charset=utf-8')
      .header('Cache-Control', CACHE_CONTROL)
      .header('ETag', responseEtag)
      .header('Access-Control-Allow-Origin', '*')
      .header('X-Cache', 'HIT')
      .send(cacheReadStream(cached))
  }

  let svgStr
  try {
    const elements = graphlibToCyElements(graphlibJson)
    svgStr = await renderSvg(elements, { layout, theme })
  } catch (e) {
    return reply.code(e.statusCode || 500).send({ error: e.message })
  }

  svgStr = wrapSvgLink(svgStr, deepLinkUrl)

  cachePut(key, 'svg', svgStr).catch(() => {})

  return reply
    .code(200)
    .header('Content-Type', 'image/svg+xml; charset=utf-8')
    .header('Cache-Control', CACHE_CONTROL)
    .header('ETag', responseEtag)
    .header('Access-Control-Allow-Origin', '*')
    .header('X-Cache', 'MISS')
    .send(svgStr)
}
