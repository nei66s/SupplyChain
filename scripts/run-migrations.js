const fs = require('fs')
const path = require('path')
require('dotenv').config()
const { Client } = require('pg')

async function main() {
  if (process.env.SKIP_DB_CHECK === '1') {
    console.log('SKIP_DB_CHECK=1. Skipping migrations.')
    return
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('DATABASE_URL not set. Skipping migrations during build phase.')
      return
    }
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const useSsl = process.env.PGSSLMODE === 'disable' ? false : true
  const client = new Client({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  })
  await client.connect()

  // ensure migrations table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  `)

  const migrationsDir = path.join(__dirname, '..', 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const version = file
    const res = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version])
    if (res.rowCount > 0) {
      console.log('Skipping', file)
      continue
    }

    console.log('Applying', file)
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    const hasConcurrently =
      /CREATE\s+INDEX\s+CONCURRENTLY/i.test(sql) || sql.toLowerCase().includes('concurrently')
    const wrapTransaction = !hasConcurrently
    const statements = wrapTransaction
      ? [sql]
      : sql
          .split(';')
          .map((statement) => statement.trim())
          .filter(Boolean)
    try {
      if (wrapTransaction) {
        await client.query('BEGIN')
      }

      for (const statement of statements) {
        await client.query(statement)
      }

      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [version])

      if (wrapTransaction) {
        await client.query('COMMIT')
      }

      console.log('Applied', file)
    } catch (err) {
      if (wrapTransaction) {
        await client.query('ROLLBACK')
      }
      console.error('Failed to apply', file, err)
      process.exit(1)
    }
  }

  await client.end()
  console.log('Migrations complete')
}

main().catch(err => { console.error(err); process.exit(1) })
