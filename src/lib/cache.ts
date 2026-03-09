import Redis from 'ioredis'

let cachedClient: Redis | null = null

function ensureConfig(): { host: string; port: number; password?: string } {
  const host = process.env.REDIS_HOST
  if (!host) {
    throw new Error('REDIS_HOST não definido')
  }
  const port = Number(process.env.REDIS_PORT ?? '6379')
  if (Number.isNaN(port) || port <= 0) {
    throw new Error('REDIS_PORT inválido')
  }
  const password = process.env.REDIS_PASSWORD
  return { host, port, password: password || undefined }
}

function createClient(): Redis {
  const config = ensureConfig()
  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
  })
  client.on('error', (error) => {
    console.error('[cache][redis] connection error', error)
  })
  console.log('Redis conectado em:', config.host)
  return client
}

export function getClient(): Redis {
  if (cachedClient) return cachedClient
  cachedClient = createClient()
  return cachedClient
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  const client = getClient()
  const start = Date.now()
  try {
    const payload = await client.get(key)
    const elapsed = Date.now() - start
    if (payload) {
      console.log('[cache][redis] CACHE HIT', key, `(${elapsed}ms)`)
      return JSON.parse(payload) as T
    }
    console.log('[cache][redis] CACHE MISS', key, `(${elapsed}ms)`)
    return null
  } catch (error) {
    console.error('[cache][redis] read error', key, error)
    throw error
  }
}

function resolveTtl(): number {
  const ttl = Number(process.env.CACHE_TTL_SECONDS ?? '60')
  if (Number.isNaN(ttl) || ttl <= 0) {
    return 60
  }
  return ttl
}

export async function setJsonCache(key: string, value: unknown): Promise<void> {
  const client = getClient()
  const start = Date.now()
  try {
    const ttl = resolveTtl()
    await client.set(key, JSON.stringify(value), 'EX', ttl)
    const elapsed = Date.now() - start
    console.log(`[cache][redis] CACHE SET ${key} ttl=${ttl}s (${elapsed}ms)`)
  } catch (error) {
    console.error('[cache][redis] write error', key, error)
    throw error
  }
}

export async function invalidateCache(key: string): Promise<void> {
  const client = getClient()
  try {
    await client.del(key)
    console.log(`[cache][redis] CACHE INVALIDATED ${key}`)
  } catch (error) {
    console.error('[cache][redis] invalidation error', key, error)
    throw error
  }
}
