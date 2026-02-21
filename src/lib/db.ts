import { Pool, PoolConfig, QueryConfig, QueryResult, QueryResultRow } from 'pg'

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool
}

const perfEnabled = process.env.NODE_ENV !== 'production' || process.env.DEBUG_PERF === 'true'

function ensureSslMode(url: string): string {
  if (url.includes('sslmode=')) {
    return url
  }
  return url.includes('?') ? `${url}&sslmode=disable` : `${url}?sslmode=disable`
}

const envPoolConfig: PoolConfig = (() => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: ensureSslMode(process.env.DATABASE_URL),
    }
  }

  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env
  if (!PGHOST || !PGUSER || !PGDATABASE) {
    throw new Error('DATABASE_URL or PGHOST/PGUSER/PGDATABASE must be set')
  }

    return {
      host: PGHOST,
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      port: PGPORT ? Number(PGPORT) : 5432,
    }
})()

const poolConfig: PoolConfig = {
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
  ...envPoolConfig,
}

function logPoolEvent(event: string, details?: string) {
  if (perfEnabled) {
    const suffix = details ? ` ${details}` : ''
    console.debug(`[db][pool:${event}]${suffix}`)
  }
}

function logPoolError(event: string, error: NodeJS.ErrnoException) {
  console.error(`[db][pool:${event}] code=${error.code ?? 'unknown'} message=${error.message}`, error.stack)
}

function normalizeError(error: unknown) {
  const err = error as NodeJS.ErrnoException & Record<string, unknown>
  const message =
    err.message ??
    (typeof error === 'object' && error !== null && 'message' in error
      ? String((error as Record<string, unknown>).message)
      : undefined) ??
    String(error ?? 'unknown error')
  const stack =
    err.stack ??
    (typeof error === 'object' && error !== null && 'stack' in error
      ? String((error as Record<string, unknown>).stack)
      : undefined)
  const code =
    err.code ??
    (typeof error === 'object' && error !== null && 'code' in error ? String((error as Record<string, unknown>).code) : 'unknown')
  return { code, message, stack, raw: error }
}

function createPoolInstance(): Pool {
  console.log('DATABASE_URL RAW:', process.env.DATABASE_URL)
  console.log('PGDATABASE:', process.env.PGDATABASE)
  console.log('PGHOST:', process.env.PGHOST)
  console.log('PGPORT:', process.env.PGPORT)
  console.log('DB URL FINAL:', process.env.DATABASE_URL)
  const pool = new Pool(poolConfig)

  pool.on('error', (error) => logPoolError('error', error))
  pool.on('connect', () => logPoolEvent('connect'))
  pool.on('acquire', () => logPoolEvent('acquire'))
  pool.on('remove', () => logPoolEvent('remove'))

  return pool
}

let cachedPool: Pool | undefined

function getOrCreatePool(): Pool {
  if (cachedPool) {
    return cachedPool
  }

  if (globalForPg.pgPool) {
    cachedPool = globalForPg.pgPool
    return cachedPool
  }

  cachedPool = createPoolInstance()
  if (process.env.NODE_ENV !== 'production') {
    globalForPg.pgPool = cachedPool
  }
  if (perfEnabled) {
    console.debug('[db] initialized postgres pool')
  }
  return cachedPool
}

async function shutdownPool(pool: Pool) {
  try {
    await pool.end()
  } catch (error) {
    console.error('[db][pool] error during pool shutdown', error)
  }
}

async function replacePool(): Promise<Pool> {
  const current = cachedPool ?? globalForPg.pgPool
  if (current) {
    await shutdownPool(current)
  }

  cachedPool = createPoolInstance()
  if (process.env.NODE_ENV !== 'production') {
    globalForPg.pgPool = cachedPool
  }
  return cachedPool
}

const poolProxy = new Proxy({} as Pool, {
  get(_, prop) {
    const target = getOrCreatePool()
    return (target as any)[prop]
  },
}) as Pool

export const pool = poolProxy

export type QueryResultWithStats<T extends QueryResultRow = any> = QueryResult<T> & {
  queryTimeMs: number
}

type QueryConfigWithSimple = QueryConfig<any> & {
  simple?: boolean
}

function buildQueryConfig(text: string | QueryConfigWithSimple, params?: unknown[]): QueryConfigWithSimple {
  if (typeof text === 'string') {
    return {
      text,
      values: params,
      simple: true,
    }
  }

  return {
    ...text,
    values: params ?? text.values,
    simple: text.simple ?? true,
    name: undefined,
  }
}

export async function query<T extends QueryResultRow = any>(text: string | QueryConfig, params?: unknown[]) {
  const totalStart = process.hrtime.bigint()
  const config = buildQueryConfig(text, params)
  let retried = false

  while (true) {
    try {
      const result = await getOrCreatePool().query<T>(config)
      const queryDurationMs = Number(process.hrtime.bigint() - totalStart) / 1_000_000
      const textSummary = config.text?.split('\n')[0].trim() ?? ''

      if (perfEnabled) {
        console.debug(
          `[perf][db] queryMs=${queryDurationMs.toFixed(2)}ms rows=${result.rowCount ?? 0} textSummary=${textSummary || '<raw>'}`
        )
      }

      return Object.assign(result, { queryTimeMs: queryDurationMs }) as QueryResultWithStats<T>
    } catch (error) {
      const errInfo = normalizeError(error)
      console.error("[db][query] error", `[code=${errInfo.code}] ${errInfo.message}`, errInfo.stack)

      if (errInfo.code === 'ECONNRESET' && !retried) {
        retried = true
        await replacePool()
        continue
      }

      throw error
    }
  }
}

export async function testConnection() {
  try {
    await query('SELECT 1')
    console.info('[db] testConnection succeeded')
  } catch (error) {
    console.error('[db] testConnection failed', error)
    throw error
  }
}

export default poolProxy
