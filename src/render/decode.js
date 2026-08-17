import { inflate } from 'pako'

const MAX_ENCODED_BYTES = 4096
const MAX_DECODED_BYTES = 64 * 1024

function fromBase64url(str) {
  return new Uint8Array(Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
}

export function decode(str) {
  if (str.length > MAX_ENCODED_BYTES) {
    const err = new Error(`Encoded src too large (${str.length} bytes, max ${MAX_ENCODED_BYTES})`)
    err.statusCode = 413
    throw err
  }
  let json
  try {
    json = new TextDecoder().decode(inflate(fromBase64url(str)))
  } catch {
    const err = new Error('Invalid src encoding')
    err.statusCode = 400
    throw err
  }
  if (json.length > MAX_DECODED_BYTES) {
    const err = new Error(`Decoded src too large (${json.length} bytes, max ${MAX_DECODED_BYTES})`)
    err.statusCode = 413
    throw err
  }
  try {
    return JSON.parse(json)
  } catch {
    const err = new Error('src is not valid JSON after decoding')
    err.statusCode = 400
    throw err
  }
}
