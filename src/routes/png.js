import { Resvg } from '@resvg/resvg-js'
import { graphlibToCyElements } from '../render/graphlibToCy.js'
import { renderSvg } from '../render/renderSvg.js'
import { cacheKey, cacheGet, cachePut, cacheReadStream } from '../cache.js'
import { resolveGraphlib, buildPlaceholderSvg, wrapSvgLink } from './svg.js'

const MAX_WIDTH = 4096
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

function svgNaturalWidth(svgStr) {
  const m = svgStr.match(/width="(\d+)"/)
  return m ? Number(m[1]) : 1200
}

export async function pngHandler(request, reply) {
  const { layout = 'dagre', theme = 'dark', width: widthParam } = request.query

  const resolved = await resolveGraphlib(request, reply)
  if (!resolved) return
  if (resolved.placeholder) {
    const placeholderSvg = buildPlaceholderSvg(resolved.theme, 'Diagram unavailable')
    const png = svgToPng(placeholderSvg, 320)
    return reply.code(200).header('Content-Type', 'image/png').send(png)
  }

  const { graphlibJson, deepLinkUrl, responseEtag } = resolved

  const key = cacheKey([responseEtag, 'png', widthParam || ''])
  const cached = await cacheGet(key, 'png')
  if (cached) {
    return reply
      .code(200)
      .header('Content-Type', 'image/png')
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

  const naturalWidth = svgNaturalWidth(svgStr)
  const renderWidth = widthParam
    ? Math.min(Math.max(1, Number(widthParam) || naturalWidth), MAX_WIDTH)
    : naturalWidth

  let pngBuffer
  try {
    pngBuffer = svgToPng(svgStr, renderWidth)
  } catch (e) {
    return reply.code(500).send({ error: 'PNG conversion failed: ' + e.message })
  }

  cachePut(key, 'png', pngBuffer).catch(() => {})

  return reply
    .code(200)
    .header('Content-Type', 'image/png')
    .header('Cache-Control', CACHE_CONTROL)
    .header('ETag', responseEtag)
    .header('Access-Control-Allow-Origin', '*')
    .header('X-Cache', 'MISS')
    .send(pngBuffer)
}

function svgToPng(svgStr, width) {
  const resvg = new Resvg(svgStr, { fitTo: { mode: 'width', value: width } })
  return resvg.render().asPng()
}
