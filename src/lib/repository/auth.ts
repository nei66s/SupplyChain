import { query } from '../db'
import { logRepoPerf } from './perf'
import { User } from '../domain/types'

type UserRow = {
  id: string
  name: string
  email: string
  role: User['role']
  avatar_url: string | null
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url ?? undefined,
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await query<UserRow>('SELECT id, name, email, role, avatar_url FROM users WHERE id = $1', [id])
  return res.rows[0] ? mapUser(res.rows[0]) : null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const res = await query<UserRow>('SELECT id, name, email, role, avatar_url FROM users WHERE LOWER(email) = LOWER($1)', [email])
  return res.rows[0] ? mapUser(res.rows[0]) : null
}

export async function listUsers(): Promise<User[]> {
  const start = process.hrtime.bigint()
  const res = await query<UserRow>('SELECT id, name, email, role, avatar_url FROM users ORDER BY role, name')
  const users = res.rows.map(mapUser)
  const totalMs = Number(process.hrtime.bigint() - start) / 1_000_000
  logRepoPerf('auth:listUsers', {
    queryMs: res.queryTimeMs,
    serializationMs: Math.max(totalMs - res.queryTimeMs, 0),
    totalMs,
    rows: users.length,
  })
  return users
}
