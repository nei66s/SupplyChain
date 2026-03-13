import Redis from 'ioredis'

let cachedClient: Redis | null = null

// Memória local para evitar viagens de rede até o Redis em dados muito frequentes
const LOCAL_CACHE = new Map<string, { value: any; expiry: number }>()
const LOCAL_TTL_MS = 5000 // 5 segundos de cache local é seguro para a maioria dos casos

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
  const start = Date.now()

  // 1. Tenta Cache em Memória primeiro (0ms latency)
  const localEntry = LOCAL_CACHE.get(key)
  if (localEntry && localEntry.expiry > Date.now()) {
    console.log('[cache][memory] CACHE HIT', key)
    return localEntry.value as T
  }

  // 2. Tenta Redis
  const client = getClient()
  try {
    const payload = await client.get(key)
    const elapsed = Date.now() - start
    if (payload) {
      console.log('[cache][redis] CACHE HIT', key, `(${elapsed}ms)`)
      const parsed = JSON.parse(payload) as T
      // Alimenta o cache local
      LOCAL_CACHE.set(key, { value: parsed, expiry: Date.now() + LOCAL_TTL_MS })
      return parsed
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
    const payload = JSON.stringify(value)

    // Atualiza Memória e Redis
    LOCAL_CACHE.set(key, { value: value, expiry: Date.now() + LOCAL_TTL_MS })
    await client.set(key, payload, 'EX', ttl)

    const elapsed = Date.now() - start
    console.log(`[cache][redis] CACHE SET ${key} ttl=${ttl}s (${elapsed}ms)`)
  } catch (error) {
    console.error('[cache][redis] write error', key, error)
    throw error
  }
}

export async function invalidateCache(key: string): Promise<void> {
  LOCAL_CACHE.delete(key)
  const client = getClient()
  try {
    await client.del(key)
    console.log(`[cache][redis] CACHE INVALIDATED ${key}`)
  } catch (error) {
    console.error('[cache][redis] invalidation error', key, error)
    throw error
  }
}
