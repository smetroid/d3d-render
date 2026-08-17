import { describe, it, expect } from 'vitest'
import { build } from './server.js'

describe('health endpoint', () => {
  it('returns ok', async () => {
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })
})
