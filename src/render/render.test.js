import { describe, it, expect } from 'vitest'
import { deflate } from 'pako'
import { decode } from './decode.js'
import { graphlibToCyElements, validateGraphlib } from './graphlibToCy.js'
import { renderSvg } from './renderSvg.js'

// Minimal graphlib fixture: A → B → C
const SAMPLE_GRAPHLIB = {
  options: { directed: true, multigraph: false, compound: false },
  nodes: [
    { v: 'a', value: { label: 'Alpha' } },
    { v: 'b', value: { label: 'Beta', color: '#4a6fa5' } },
    { v: 'c', value: { label: 'Gamma' } }
  ],
  edges: [
    { v: 'a', w: 'b', value: { label: 'uses' } },
    { v: 'b', w: 'c', value: {} }
  ]
}

function encodeForTest(graphlibJson) {
  const compressed = deflate(JSON.stringify(graphlibJson))
  return Buffer.from(compressed).toString('base64url')
}

describe('decode', () => {
  it('round-trips a graphlib diagram', () => {
    const encoded = encodeForTest(SAMPLE_GRAPHLIB)
    const result = decode(encoded)
    expect(result.nodes).toHaveLength(3)
    expect(result.nodes[0].v).toBe('a')
  })

  it('throws 413 for oversized encoded input', () => {
    const big = 'x'.repeat(4097)
    expect(() => decode(big)).toThrow()
    try {
      decode(big)
    } catch (e) {
      expect(e.statusCode).toBe(413)
    }
  })

  it('throws 400 for invalid base64', () => {
    expect(() => decode('not-valid-pako!!!')).toThrow()
    try {
      decode('not-valid-pako!!!')
    } catch (e) {
      expect(e.statusCode).toBe(400)
    }
  })
})

describe('graphlibToCyElements', () => {
  it('converts nodes correctly', () => {
    const els = graphlibToCyElements(SAMPLE_GRAPHLIB)
    const nodes = els.filter((e) => e.group === 'nodes')
    expect(nodes).toHaveLength(3)
    expect(nodes[0].data.id).toBe('a')
    expect(nodes[0].data.label).toBe('Alpha')
    expect(nodes[1].data.color).toBe('#4a6fa5')
  })

  it('converts edges correctly', () => {
    const els = graphlibToCyElements(SAMPLE_GRAPHLIB)
    const edges = els.filter((e) => e.group === 'edges')
    expect(edges).toHaveLength(2)
    expect(edges[0].data.source).toBe('a')
    expect(edges[0].data.target).toBe('b')
    expect(edges[0].data.label).toBe('uses')
  })
})

describe('validateGraphlib', () => {
  it('accepts valid graphlib', () => {
    expect(() => validateGraphlib(SAMPLE_GRAPHLIB)).not.toThrow()
  })

  it('rejects non-objects', () => {
    expect(() => validateGraphlib('string')).toThrow()
    expect(() => validateGraphlib(null)).toThrow()
    expect(() => validateGraphlib([1, 2])).toThrow()
  })

  it('rejects missing nodes array', () => {
    expect(() => validateGraphlib({ options: {} })).toThrow()
  })
})

describe('renderSvg', () => {
  it('returns a valid SVG string', async () => {
    const elements = graphlibToCyElements(SAMPLE_GRAPHLIB)
    const svg = await renderSvg(elements, { layout: 'dagre', theme: 'dark' })
    expect(svg).toMatch(/^<svg /)
    expect(svg).toMatch(/<\/svg>$/)
    expect(svg).toContain('Alpha')
    expect(svg).toContain('Beta')
    expect(svg).toContain('uses')
  }, 15000)

  it('applies light theme background', async () => {
    const elements = graphlibToCyElements(SAMPLE_GRAPHLIB)
    const svg = await renderSvg(elements, { layout: 'grid', theme: 'light' })
    expect(svg).toContain('#f5f6fa')
  }, 15000)

  it('handles empty diagram gracefully', async () => {
    const svg = await renderSvg([], { layout: 'dagre', theme: 'dark' })
    expect(svg).toMatch(/^<svg /)
  }, 15000)
})
