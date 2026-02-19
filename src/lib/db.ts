import { Pool, PoolConfig, QueryConfig, QueryResult } from 'pg'

declare global {
  var __supplychain_pg_pool__: Pool | undefined
}

const perfEnabled = process.env.NODE_ENV !== 'production' || process.env.DEBUG_PERF === 'true'

const poolConfig: PoolConfig = (() => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL }
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

if (!globalThis.__supplychain_pg_pool__) {
  globalThis.__supplychain_pg_pool__ = new Pool(poolConfig)
  if (perfEnabled) {
    console.debug('[db] initialized postgres pool')
  }
}

export const pool = globalThis.__supplychain_pg_pool__!

export type QueryResultWithStats<T extends import('pg').QueryResultRow = any> = QueryResult<T> & { queryTimeMs: number }

export async function query<T extends import('pg').QueryResultRow = any>(text: string | QueryConfig, params?: unknown[]) {
  const totalStart = process.hrtime.bigint()
  const result = await pool.query<T>(text, params)
  const queryDurationMs = Number(process.hrtime.bigint() - totalStart) / 1_000_000
  const textSummary =
    typeof text === 'string'
      ? text.split('\n')[0].trim()
      : text.text?.split('\n')[0].trim() ?? ''

  if (perfEnabled) {
    console.debug(
      `[perf][db] queryMs=${queryDurationMs.toFixed(2)}ms rows=${result.rowCount ?? 0} textSummary=${textSummary || '<raw>'}`
    )
  }

  return Object.assign(result, { queryTimeMs: queryDurationMs }) as QueryResultWithStats<T>
}

export default pool
