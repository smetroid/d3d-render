import { readFile } from 'fs/promises'
import { Resvg } from '@resvg/resvg-js'
import { graphlibToCyElements } from '../src/render/graphlibToCy.js'
import { renderSvg } from '../src/render/renderSvg.js'
import { cacheKey, cacheGet, cachePut } from '../src/cache.js'
import { resolveParams, wrapSvgLink, buildPlaceholderSvg } from '../src/routes/resolve.js'
import { withGuards } from '../src/middleware.js'

const MAX_WIDTH = 4096
const CACHE_CONTROL = 'public, max-age=31536000, immutable'

function svgNaturalWidth(svgStr) {
  const m = svgStr.match(/width="(\d+)"/)
  return m ? Number(m[1]) : 1200
}

function svgToPng(svgStr, width) {
  const resvg = new Resvg(svgStr, { fitTo: { mode: 'width', value: width } })
  return resvg.render().asPng()
}

async function handler(req, res) {
  const { src, id, layout = 'dagre', theme = 'dark', width: widthParam } = req.query
  const ifNoneMatch = req.headers['if-none-match']

  const resolved = await resolveParams({ src, id, layout, theme, ifNoneMatch })

  if (resolved.statusCode === 304) {
    return res.status(304).end()
  }
  if (resolved.statusCode) {
    return res.status(resolved.statusCode).json(resolved.body)
  }
  if (resolved.placeholder) {
    const png = svgToPng(buildPlaceholderSvg(resolved.theme, 'Diagram unavailable'), 320)
    res.setHeader('Content-Type', 'image/png')
    return res.status(200).send(png)
  }

  const { graphlibJson, deepLinkUrl, responseEtag } = resolved
  const key = cacheKey([responseEtag, 'png', widthParam || ''])

  const cached = await cacheGet(key, 'png')
  if (cached) {
    const data = await readFile(cached)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', CACHE_CONTROL)
    res.setHeader('ETag', responseEtag)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('X-Cache', 'HIT')
    return res.status(200).send(data)
  }

  let svgStr
  try {
    const elements = graphlibToCyElements(graphlibJson)
    svgStr = await renderSvg(elements, { layout, theme })
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message })
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
    return res.status(500).json({ error: 'PNG conversion failed: ' + e.message })
  }

  cachePut(key, 'png', pngBuffer).catch(() => {})

  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', CACHE_CONTROL)
  res.setHeader('ETag', responseEtag)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('X-Cache', 'MISS')
  return res.status(200).send(pngBuffer)
}

export default withGuards(handler)
