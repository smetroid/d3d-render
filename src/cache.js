import { createHash } from 'crypto'
import { createReadStream, createWriteStream } from 'fs'
import { readdir, rm, stat, mkdir } from 'fs/promises'
import { join } from 'path'
import { pipeline } from 'stream/promises'

const CACHE_DIR = process.env.CACHE_DIR || '/data/cache'
const CACHE_MAX_BYTES = (Number(process.env.CACHE_MAX_MB) || 512) * 1024 * 1024
const RENDERER_VERSION = '1'

let hits = 0
let misses = 0

export function cacheKey(params) {
  return createHash('sha256')
    .update([...params, `v${RENDERER_VERSION}`].join(':'))
    .digest('hex')
}

async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true })
}

export async function cacheGet(key, ext) {
  const path = join(CACHE_DIR, `${key}.${ext}`)
  try {
    await stat(path)
    hits++
    return path
  } catch {
    misses++
    return null
  }
}

export async function cachePut(key, ext, data) {
  await ensureCacheDir()
  const path = join(CACHE_DIR, `${key}.${ext}`)
  await pipeline(
    (async function* () {
      yield Buffer.isBuffer(data) ? data : Buffer.from(data)
    })(),
    createWriteStream(path)
  )
  evict().catch(() => {})
  return path
}

export function cacheReadStream(filePath) {
  return createReadStream(filePath)
}

export function cacheMetrics() {
  return { hits, misses }
}

async function evict() {
  let entries
  try {
    const names = await readdir(CACHE_DIR)
    entries = await Promise.all(
      names.map(async (name) => {
        const p = join(CACHE_DIR, name)
        const s = await stat(p)
        return { path: p, size: s.size, mtime: s.mtimeMs }
      })
    )
  } catch {
    return
  }

  const total = entries.reduce((s, e) => s + e.size, 0)
  if (total <= CACHE_MAX_BYTES) return

  entries.sort((a, b) => a.mtime - b.mtime)
  let freed = 0
  const target = total - CACHE_MAX_BYTES * 0.8
  for (const e of entries) {
    if (freed >= target) break
    await rm(e.path, { force: true })
    freed += e.size
  }
}
