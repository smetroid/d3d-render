import { createHash } from 'crypto'
import { decode } from '../render/decode.js'
import { validateGraphlib } from '../render/graphlibToCy.js'

const RENDERER_VERSION = '1'
const D3D_API_BASE = process.env.D3D_API_BASE || 'https://d3d-api.vercel.app'
export const D3DWEB_BASE = process.env.D3DWEB_BASE || 'https://d3dweb.vercel.app'
const UPSTREAM_TIMEOUT_MS = 5000

export function makeEtag(key) {
  return '"' + createHash('sha256').update(key).digest('hex').slice(0, 24) + '"'
}

export function buildPlaceholderSvg(theme, message) {
  const bg = theme === 'light' ? '#f5f6fa' : '#12131a'
  const fg = theme === 'light' ? '#546070' : '#8890b0'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80"><rect width="100%" height="100%" fill="${bg}"/><text x="160" y="44" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="${fg}" font-family="system-ui, sans-serif">${message}</text></svg>`
}

export function wrapSvgLink(svgStr, href) {
  return svgStr
    .replace(/^(<svg[^>]*>)/, `$1<a xlink:href="${href}" target="_blank" rel="noopener">`)
    .replace(/<\/svg>$/, '</a></svg>')
}

/**
 * Resolves the incoming request parameters into a graphlib JSON + metadata.
 *
 * Returns one of:
 *   { graphlibJson, deepLinkUrl, responseEtag, layout, theme }
 *   { placeholder: true, theme }  — render a fallback SVG
 *   { statusCode, body? }         — send this directly (error / 304)
 */
export async function resolveParams({ src, id, layout = 'dagre', theme = 'dark', ifNoneMatch }) {
  if (!src && !id) {
    return { statusCode: 400, body: { error: 'Either ?src= or ?id= is required' } }
  }

  if (src) {
    let graphlibJson
    try {
      graphlibJson = decode(src)
    } catch (e) {
      return { statusCode: e.statusCode || 400, body: { error: e.message } }
    }
    try {
      validateGraphlib(graphlibJson)
    } catch (e) {
      return { statusCode: 400, body: { error: e.message } }
    }
    const deepLinkUrl = `${D3DWEB_BASE}/?src=${encodeURIComponent(src)}`
    const responseEtag = makeEtag(`src:${src}:${layout}:${theme}:v${RENDERER_VERSION}`)
    return { graphlibJson, deepLinkUrl, responseEtag, layout, theme }
  }

  // ?id= path
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS)
  let upstreamRes
  try {
    const headers = {}
    if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch
    upstreamRes = await fetch(`${D3D_API_BASE}/dag/${id}/public`, {
      headers,
      signal: ctrl.signal
    })
  } catch {
    return { placeholder: true, theme }
  } finally {
    clearTimeout(timer)
  }

  if (upstreamRes.status === 404) {
    return { statusCode: 404, body: { error: 'Diagram not found or not public' } }
  }
  if (upstreamRes.status === 304) {
    return { statusCode: 304 }
  }
  if (!upstreamRes.ok) {
    return { placeholder: true, theme }
  }

  let body
  try {
    body = await upstreamRes.json()
  } catch {
    return { statusCode: 502, body: { error: 'Invalid response from upstream' } }
  }

  let graphlibJson
  try {
    graphlibJson = JSON.parse(body.diagram)
    validateGraphlib(graphlibJson)
  } catch (e) {
    return { statusCode: 502, body: { error: e.message || 'Invalid diagram data' } }
  }

  const deepLinkUrl = `${D3DWEB_BASE}/?id=${encodeURIComponent(id)}`
  const upstreamEtag = upstreamRes.headers.get('etag') || `rev:${body.embedRevision}`
  const responseEtag = makeEtag(`id:${upstreamEtag}:${layout}:${theme}:v${RENDERER_VERSION}`)

  if (ifNoneMatch && ifNoneMatch === responseEtag) {
    return { statusCode: 304 }
  }

  return { graphlibJson, deepLinkUrl, responseEtag, layout, theme }
}
