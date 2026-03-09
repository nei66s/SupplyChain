import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const AUTH_COOKIE_NAME = 'sc-session';
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 8;
const UNAUTHORIZED_ERROR_MESSAGE = 'Unauthorized';

type AuthPayload = {
  userId: string;
  role: string;
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

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, getAuthSecret(), { expiresIn: AUTH_TOKEN_TTL_SECONDS });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getAuthSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export function getAuthPayload(req: NextRequest): AuthPayload | null {
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

export async function requireAuth(req: NextRequest): Promise<AuthPayload> {
  const payload = getAuthPayload(req);
  if (!payload) {
    throw new UnauthorizedError();
  }
  return payload;
}

export async function requireAdmin(req: NextRequest): Promise<AuthPayload> {
  const payload = await requireAuth(req);
  if (payload.role !== 'Admin') {
    throw new UnauthorizedError();
  }
  return payload;
}
