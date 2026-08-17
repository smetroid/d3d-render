import { createHash } from 'crypto'
import { decode } from '../render/decode.js'
import { graphlibToCyElements, validateGraphlib } from '../render/graphlibToCy.js'
import { renderSvg } from '../render/renderSvg.js'

const RENDERER_VERSION = '1'
const D3D_API_BASE = process.env.D3D_API_BASE || 'https://d3d-api.fly.dev'
const D3DWEB_BASE = process.env.D3DWEB_BASE || 'https://d3dweb.fly.dev'
const UPSTREAM_TIMEOUT_MS = 5000

const CACHE_CONTROL = 'public, max-age=31536000, immutable'

function etag(key) {
  return '"' + createHash('sha256').update(key).digest('hex').slice(0, 24) + '"'
}

function wrapSvgLink(svgStr, href) {
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

export async function svgHandler(request, reply) {
  const { src, id, layout = 'dagre', theme = 'dark' } = request.query

  if (!src && !id) {
    return reply.code(400).send({ error: 'Either ?src= or ?id= is required' })
  }

  let graphlibJson
  let deepLinkUrl
  let responseEtag

  if (src) {
    // ?src= path: decode inline diagram
    try {
      graphlibJson = decode(src)
    } catch (e) {
      return reply.code(e.statusCode || 400).send({ error: e.message })
    }
    try {
      validateGraphlib(graphlibJson)
    } catch (e) {
      return reply.code(400).send({ error: e.message })
    }
    deepLinkUrl = `${D3DWEB_BASE}/?src=${encodeURIComponent(src)}`
    responseEtag = etag(`src:${src}:${layout}:${theme}:v${RENDERER_VERSION}`)
  } else {
    // ?id= path: fetch from d3d-api public endpoint
    const upstreamIfNoneMatch = request.headers['if-none-match']
    let upstreamRes
    try {
      upstreamRes = await fetchPublicDag(id, upstreamIfNoneMatch)
    } catch {
      const placeholder = buildPlaceholderSvg(theme, 'Diagram unavailable')
      return reply.code(200).header('Content-Type', 'image/svg+xml').send(placeholder)
    }

    if (upstreamRes.status === 404) {
      return reply.code(404).send({ error: 'Diagram not found or not public' })
    }
    if (upstreamRes.status === 304) {
      return reply.code(304).send()
    }
    if (!upstreamRes.ok) {
      const placeholder = buildPlaceholderSvg(theme, 'Diagram unavailable')
      return reply.code(200).header('Content-Type', 'image/svg+xml').send(placeholder)
    }

    let body
    try {
      body = await upstreamRes.json()
    } catch {
      return reply.code(502).send({ error: 'Invalid response from upstream' })
    }

    try {
      graphlibJson = JSON.parse(body.diagram)
    } catch {
      return reply.code(502).send({ error: 'Diagram data is not valid JSON' })
    }
    try {
      validateGraphlib(graphlibJson)
    } catch (e) {
      return reply.code(502).send({ error: e.message })
    }

    deepLinkUrl = `${D3DWEB_BASE}/?id=${encodeURIComponent(id)}`
    const upstreamEtag = upstreamRes.headers.get('etag') || `rev:${body.embedRevision}`
    responseEtag = etag(`id:${upstreamEtag}:${layout}:${theme}:v${RENDERER_VERSION}`)

    if (upstreamIfNoneMatch && upstreamIfNoneMatch === responseEtag) {
      return reply.code(304).send()
    }
  }

  let svgStr
  try {
    const elements = graphlibToCyElements(graphlibJson)
    svgStr = await renderSvg(elements, { layout, theme })
  } catch (e) {
    return reply.code(e.statusCode || 500).send({ error: e.message })
  }

  svgStr = wrapSvgLink(svgStr, deepLinkUrl)

  return reply
    .code(200)
    .header('Content-Type', 'image/svg+xml; charset=utf-8')
    .header('Cache-Control', CACHE_CONTROL)
    .header('ETag', responseEtag)
    .header('Access-Control-Allow-Origin', '*')
    .send(svgStr)
}

function buildPlaceholderSvg(theme, message) {
  const bg = theme === 'light' ? '#f5f6fa' : '#12131a'
  const fg = theme === 'light' ? '#546070' : '#8890b0'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80"><rect width="100%" height="100%" fill="${bg}"/><text x="160" y="44" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="${fg}" font-family="system-ui, sans-serif">${message}</text></svg>`
}
