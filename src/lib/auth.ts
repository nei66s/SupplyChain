import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { normalizeTenantOperationMode } from '@/features/tenant-operation-mode/helpers';
import { TenantOperationMode } from '@/features/tenant-operation-mode/types';

const AUTH_COOKIE_NAME = 'sc-session';
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 8;
const UNAUTHORIZED_ERROR_MESSAGE = 'Unauthorized';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantOperationMode: TenantOperationMode;
  avatarUrl?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
};

export class UnauthorizedError extends Error {
  constructor() {
    super(UNAUTHORIZED_ERROR_MESSAGE);
    this.name = 'UnauthorizedError';
  }
}

export function isUnauthorizedError(err: unknown): boolean {
  if (err instanceof UnauthorizedError) return true;
  return err instanceof Error && err.message === UNAUTHORIZED_ERROR_MESSAGE;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  return 'dev-secret';
}

export function signAuthToken(payload: { userId: string, role: string, tenantId: string }): string {
  return jwt.sign(payload, getAuthSecret(), { expiresIn: AUTH_TOKEN_TTL_SECONDS });
}

export function verifyAuthToken(token: string): { userId: string, role: string, tenantId: string } | null {
  try {
    return jwt.verify(token, getAuthSecret()) as { userId: string, role: string, tenantId: string };
  } catch {
    return null;
  }
}

export function getAuthPayload(req: NextRequest): { userId: string, role: string, tenantId: string } | null {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

export function createAuthCookie(token: string) {
  return {
    name: AUTH_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      path: '/',
      maxAge: AUTH_TOKEN_TTL_SECONDS,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    },
  };
}

export function clearAuthCookie() {
  return {
    name: AUTH_COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    },
  };
}

export async function requireAuth(req: NextRequest): Promise<{ userId: string, role: string, tenantId: string }> {
  const payload = getAuthPayload(req);
  if (!payload || !payload.tenantId) {
    throw new UnauthorizedError();
  }
  return payload;
}

export async function requireAdmin(req: NextRequest): Promise<{ userId: string, role: string, tenantId: string }> {
  const payload = await requireAuth(req);
  if (payload.role !== 'Admin') {
    throw new UnauthorizedError();
  }
  return payload;
}

import { headers } from 'next/headers'
import { query } from './db'
import { unstable_cache } from 'next/cache'
import { getOrCacheTenantResolution } from './tenant-context'

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const h = await headers()
    const cookieHeader = h.get('cookie') ?? ''
    const token = cookieHeader
      .split(';')
      .find(c => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split('=')[1]

    if (!token) return null
    const payload = verifyAuthToken(token)
    if (!payload) return null

    return unstable_cache(
      async () => {
        const result = await query(
          `SELECT u.id, u.name, u.email, u.role, u.tenant_id, u.avatar_url, t.subscription_status, t.subscription_expires_at, t.operation_mode
           FROM users u
           JOIN tenants t ON t.id = u.tenant_id
           WHERE u.id = $1`,
          [payload.userId]
        )

        if (result.rowCount === 0) return null

        const user = result.rows[0]
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenant_id,
          tenantOperationMode: normalizeTenantOperationMode(user.operation_mode),
          avatarUrl: user.avatar_url ?? undefined,
          subscriptionStatus: user.subscription_status,
          subscriptionExpiresAt: user.subscription_expires_at,
        }
      },
      [`user-${payload.userId}`],
      { tags: [`user-${payload.userId}`], revalidate: 300 } // 5 minutos de cache para perfil
    )()
  } catch {
    return null
  }
}

/**
 * Tenta obter o tenantId diretamente dos headers da requisição (cookies).
 * O resultado é cacheado no AsyncLocalStorage da requisição atual,
 * garantindo que `await headers()` + JWT decode só ocorra UMA VEZ por request.
 */
export async function getTenantFromSession(): Promise<string | null> {
  return getOrCacheTenantResolution(async () => {
    try {
      const h = await headers()
      const cookieHeader = h.get('cookie') ?? ''

      // Parse simples de cookies
      const token = cookieHeader
        .split(';')
        .find(c => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`))
        ?.split('=')[1]

      if (!token) return null
      return verifyAuthToken(token)?.tenantId ?? null
    } catch {
      // Falha se chamado fora de um contexto de request do Next.js (ex: scripts)
      return null
    }
  });
}
