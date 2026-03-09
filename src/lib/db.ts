import { Pool, PoolConfig, QueryConfig, QueryResult, QueryResultRow } from 'pg'

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool
}

let poolInstance: Pool | undefined

function ensureSslMode(url: string): string {
  if (url.includes('sslmode=')) {
    return url
  }
  return url.includes('?') ? `${url}&sslmode=disable` : `${url}?sslmode=disable`
}

function getPerfEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_PERF === 'true'
}

function toPositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue ?? '')
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, parsed) : fallback
}

export function getPoolConfig(): PoolConfig {
  const baseConfig: PoolConfig = {
    // VERCEL SERVERLESS + PGBOUNCER CONFIGURATION

    // As conexões na Vercel são efêmeras (Lambdas/Edge functions morrem e nascem contínuamente).
    // O pool mínimo de instâncias idle OBRIGATORIAMENTE deve ser 0 para evitar que o pg fique 
    // segurando conexões "zumbis" de funções que já dormiram, lotando o PgBouncer por exaustão.
    min: toPositiveInt(process.env.PG_POOL_MIN, 0),

    // Contenção agressiva de concorrência por Lambda.
    // O Next.js (Serverless) deve abrir no máximo 2 portas pro banco na mesma requisição simultânea.
    // O afunilamento real de requisições globais ocorre no PgBouncer na VPS, e não no backend Vercel.
    max: toPositiveInt(process.env.PG_POOL_MAX, 2),

    // Timeouts muito agressivos. 
    // Em Serverless, as conexões devem ser mortas (release in pool) rapidamente quando ociosas
    // para limpar a esteira do PgBouncer. E timeouts de conexão curtos evitam hang da API.
    idleTimeoutMillis: toPositiveInt(process.env.PG_IDLE_TIMEOUT_MS, 10_000), // 10s
    connectionTimeoutMillis: toPositiveInt(process.env.PG_CONNECTION_TIMEOUT_MS, 5_000), // 5s
  }

  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      connectionString: ensureSslMode(process.env.DATABASE_URL),
    }
  }

  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env
  if (!PGHOST || !PGUSER || !PGDATABASE) {
    throw new Error('DATABASE_URL or PGHOST/PGUSER/PGDATABASE must be set')
  }

  return {
    ...baseConfig,
    host: PGHOST,
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
    port: PGPORT ? Number(PGPORT) : 5432,
  }
}

function logPoolEvent(event: string, details?: string): void {
  if (getPerfEnabled()) {
    const suffix = details ? ` ${details}` : ''
    console.debug(`[db][pool:${event}]${suffix}`)
  }
}

function logPoolError(event: string, error: NodeJS.ErrnoException): void {
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
    (typeof error === 'object' && error !== null && 'code' in error
      ? String((error as Record<string, unknown>).code)
      : 'unknown')
  return { code, message, stack, raw: error }
}

function createPoolInstance(): Pool {
  const pool = new Pool(getPoolConfig())
  pool.on('error', (error) => logPoolError('error', error))
  pool.on('connect', () => logPoolEvent('connect'))
  pool.on('acquire', () => logPoolEvent('acquire'))
  pool.on('remove', () => logPoolEvent('remove'))

  // VERCEL / SERVERLESS: Warmups Foram Removidos
  // O pool.query('SELECT 1') no boot da instância foi descartado propositalmente.
  // Como as lambdas da Vercel escalam velozmente durante picos (cold starts massivos),
  // executar "prefetch" em cada inicialização multiplicaria conexões de lixo no PgBouncer 
  // gerando latência artificial. Em cloud serverless, "Lazy connection" pura é a única via segura.

  return pool
}

export function getPool(): Pool {
  if (poolInstance) {
    return poolInstance
  }

  if (globalForPg.pgPool) {
    poolInstance = globalForPg.pgPool
    return poolInstance
  }

  poolInstance = createPoolInstance()
  if (process.env.NODE_ENV !== 'production') {
    globalForPg.pgPool = poolInstance
  }
  if (getPerfEnabled()) {
    console.debug('[db] initialized postgres pool')
  }
  return poolInstance
}

async function shutdownPool(pool: Pool): Promise<void> {
  try {
    await pool.end()
  } catch (error) {
    console.error('[db][pool] error during pool shutdown', error)
  }
}

async function replacePool(): Promise<Pool> {
  const current = poolInstance ?? globalForPg.pgPool
  if (current) {
    await shutdownPool(current)
  }

  poolInstance = createPoolInstance()
  if (process.env.NODE_ENV !== 'production') {
    globalForPg.pgPool = poolInstance
  }
  return poolInstance
}

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
      const result = await getPool().query<T>(config)
      const queryDurationMs = Number(process.hrtime.bigint() - totalStart) / 1_000_000
      const textSummary = config.text?.split('\n')[0].trim() ?? ''

      if (getPerfEnabled()) {
        console.debug(
          `[perf][db] queryMs=${queryDurationMs.toFixed(2)}ms rows=${result.rowCount ?? 0} textSummary=${textSummary || '<raw>'}`
        )
      }

      return Object.assign(result, { queryTimeMs: queryDurationMs }) as QueryResultWithStats<T>
    } catch (error) {
      const errInfo = normalizeError(error)
      console.error('[db][query] error', `[code=${errInfo.code}] ${errInfo.message}`, errInfo.stack)

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

export default getPool
