import Cytoscape from 'cytoscape'
import cytoscapeDagre from 'cytoscape-dagre'
import cytoscapeCola from 'cytoscape-cola'
import { THEMES } from './themes.js'

Cytoscape.use(cytoscapeDagre)
Cytoscape.use(cytoscapeCola)

const NODE_W = 140
const NODE_H = 40
const PAD = 40
const FONT = "system-ui, 'Segoe UI', Roboto, sans-serif"
const LAYOUT_TIMEOUT_MS = 8000

const SUPPORTED_LAYOUTS = new Set([
  'dagre',
  'cola',
  'breadthfirst',
  'grid',
  'circle',
  'concentric',
  'random',
  'cose'
])

function escXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(str, max) {
  const s = String(str ?? '')
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s
}

function nodeIntersect(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 0 && dy === 0) return to
  const hw = NODE_W / 2 + 2
  const hh = NODE_H / 2 + 2
  const absSlope = Math.abs(dy / dx)
  const edgeSlope = hh / hw
  if (absSlope <= edgeSlope) {
    const sx = dx > 0 ? -hw : hw
    return { x: to.x + sx, y: to.y + sx * (dy / dx) }
  } else {
    const sy = dy > 0 ? -hh : hh
    return { x: to.x + sy * (dx / dy), y: to.y + sy }
  }
}

export async function renderSvg(elements, { layout = 'dagre', theme = 'dark' } = {}) {
  const t = THEMES[theme] || THEMES.dark
  const layoutName = SUPPORTED_LAYOUTS.has(layout) ? layout : 'dagre'

  const cy = Cytoscape({
    headless: true,
    styleEnabled: true,
    elements,
    style: [
      { selector: 'node', style: { width: NODE_W, height: NODE_H } },
      { selector: ':parent', style: { padding: 24 } }
    ]
  })

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Object.assign(new Error('Layout timed out'), { statusCode: 504 })),
      LAYOUT_TIMEOUT_MS
    )
    cy.one('layoutstop', () => {
      clearTimeout(timer)
      resolve()
    })
    cy.layout(
      layoutName === 'dagre'
        ? { name: 'dagre', rankDir: 'LR', nodeSep: 50, rankSep: 90 }
        : layoutName === 'cola'
          ? { name: 'cola', animate: false }
          : { name: layoutName }
    ).run()
  })

  const ext = cy.extent()
  const svgW = Math.max(Math.ceil(ext.w + PAD * 2), 200)
  const svgH = Math.max(Math.ceil(ext.h + PAD * 2), 100)
  const ox = -ext.x1 + PAD
  const oy = -ext.y1 + PAD

  const out = []
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`
  )
  out.push(`<rect width="100%" height="100%" fill="${t.bg}"/>`)
  out.push(`<defs>`)
  out.push(
    `<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">`
  )
  out.push(`<path d="M0,0 L10,5 L0,10 z" fill="${t.edge}"/>`)
  out.push(`</marker>`)
  out.push(`</defs>`)

  // Compound (parent) nodes — rendered as background regions
  for (const n of cy.nodes(':parent')) {
    const bb = n.boundingBox()
    const x = (bb.x1 + ox).toFixed(1)
    const y = (bb.y1 + oy).toFixed(1)
    const bw = bb.w.toFixed(1)
    const bh = bb.h.toFixed(1)
    const cx = (bb.x1 + bb.w / 2 + ox).toFixed(1)
    const cy2 = (bb.y1 + 14 + oy).toFixed(1)
    const label = truncate(n.data('label') || n.id(), 30)
    out.push(
      `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="${t.compoundFill}" stroke="${t.compoundBorder}" stroke-width="1"/>`
    )
    out.push(
      `<text x="${cx}" y="${cy2}" text-anchor="middle" font-size="10" fill="${t.edgeLabel}" font-family="${FONT}" opacity="0.8">${escXml(label)}</text>`
    )
  }

  // Edges
  for (const e of cy.edges()) {
    const sp = e.source().position()
    const tp = e.target().position()
    const tip = nodeIntersect(sp, tp)
    const x1 = (sp.x + ox).toFixed(1)
    const y1 = (sp.y + oy).toFixed(1)
    const x2 = (tip.x + ox).toFixed(1)
    const y2 = (tip.y + oy).toFixed(1)
    const cdx = ((tp.x - sp.x) * 0.4).toFixed(1)
    const cx1 = (sp.x + ox + Number(cdx)).toFixed(1)
    const cx2 = (tp.x + ox - Number(cdx)).toFixed(1)
    out.push(
      `<path d="M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}" fill="none" stroke="${t.edge}" stroke-width="1.5" marker-end="url(#arr)"/>`
    )
    const label = e.data('label')
    if (label) {
      const mx = ((sp.x + tp.x) / 2 + ox).toFixed(1)
      const my = ((sp.y + tp.y) / 2 + oy - 7).toFixed(1)
      out.push(
        `<text x="${mx}" y="${my}" text-anchor="middle" font-size="10" fill="${t.edgeLabel}" font-family="${FONT}">${escXml(truncate(label, 24))}</text>`
      )
    }
  }

  // Leaf nodes
  for (const n of cy.nodes(':childless')) {
    const pos = n.position()
    const x = (pos.x + ox - NODE_W / 2).toFixed(1)
    const y = (pos.y + oy - NODE_H / 2).toFixed(1)
    const cx = (pos.x + ox).toFixed(1)
    const cy2 = (pos.y + oy).toFixed(1)
    const rawColor = n.data('color')
    const fill = rawColor && /^#[0-9a-f]{3,8}$/i.test(rawColor) ? rawColor : t.nodeFill
    const label = truncate(n.data('label') || n.id(), 22)
    out.push(
      `<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${fill}" stroke="${t.nodeBorder}" stroke-width="1"/>`
    )
    out.push(
      `<text x="${cx}" y="${cy2}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="${t.nodeText}" font-family="${FONT}" font-weight="500">${escXml(label)}</text>`
    )
  }

  out.push(`</svg>`)
  return out.join('\n')
}
