import Redis from 'ioredis'

let cachedClient: Redis | null = null

function getClient(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) return null
  if (cachedClient) return cachedClient
  cachedClient = new Redis(url)
  cachedClient.on('error', (error) => {
    console.error('[cache][redis] connection error', error)
  })
  return cachedClient
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  const client = getClient()
  if (!client) return null
  try {
    const payload = await client.get(key)
    if (!payload) return null
    return JSON.parse(payload) as T
  } catch (error) {
    console.error('[cache][redis] read error', error)
    return null
  }
}

export async function setJsonCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getClient()
  if (!client) return
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch (error) {
    console.error('[cache][redis] write error', error)
  }
}
