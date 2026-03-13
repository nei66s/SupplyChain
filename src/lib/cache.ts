import Redis from 'ioredis'

// Cache em Memória Local (RAM)
// Este módulo removeu a dependência do Redis Externo para o cache de dados (JSON)
// para evitar latência de rede (RTT). O Redis agora é usado apenas para Realtime (PubSub).

const LOCAL_CACHE = new Map<string, { value: any; expiry: number }>()
const DEFAULT_TTL_MS = 60000 // 1 minuto padrão para a maioria dos dados

let redisClient: Redis | undefined

export function getClient(): Redis {
  if (redisClient) return redisClient

  const host = process.env.REDIS_HOST
  const port = Number(process.env.REDIS_PORT || 6379)
  const password = process.env.REDIS_PASSWORD

  if (!host) {
    console.warn('[cache][redis] REDIS_HOST não configurado. Realtime pode não funcionar.')
    // Retorna um stub se não houver host para evitar crash
    return {
      publish: async () => 0,
      on: () => {},
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1
    } as any
  }

  redisClient = new Redis({
    host,
    port,
    password,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3
  })

  redisClient.on('error', (err) => console.error('[cache][redis] Erro:', err.message))
  redisClient.on('connect', () => console.log('[cache][redis] Conectado para Realtime em:', host))

  return redisClient
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  const localEntry = LOCAL_CACHE.get(key)
  
  if (localEntry && localEntry.expiry > Date.now()) {
    console.log('[cache][memory] CACHE HIT', key)
    return localEntry.value as T
  }

  if (localEntry) {
    LOCAL_CACHE.delete(key)
  }

  console.log('[cache][memory] CACHE MISS', key)
  return null
}

export async function setJsonCache(key: string, value: unknown, customTtlSeconds?: number): Promise<void> {
  const ttlMs = customTtlSeconds ? customTtlSeconds * 1000 : DEFAULT_TTL_MS
  
  LOCAL_CACHE.set(key, { 
    value: value, 
    expiry: Date.now() + ttlMs 
  })

  console.log(`[cache][memory] CACHE SET ${key} ttl=${ttlMs/1000}s`)
}

export async function invalidateCache(key: string): Promise<void> {
  LOCAL_CACHE.delete(key)
  console.log(`[cache][memory] CACHE INVALIDATED ${key}`)
}
