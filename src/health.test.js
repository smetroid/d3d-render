import { describe, it, expect } from 'vitest'
import healthHandler from '../api/health.js'

function mockRes() {
  const res = { _status: 200, _body: null, _headers: {} }
  res.status = (code) => {
    res._status = code
    return res
  }
  res.json = (body) => {
    res._body = body
    return res
  }
  res.send = (body) => {
    res._body = body
    return res
  }
  res.end = () => res
  res.setHeader = (k, v) => {
    res._headers[k] = v
    return res
  }
  return res
}

describe('health endpoint', () => {
  it('returns ok', () => {
    const res = mockRes()
    healthHandler({}, res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ status: 'ok' })
  })
})
