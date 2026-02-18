import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { signAuthToken, createAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ message: 'Email e senha sao obrigatorios' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, avatar_url FROM users WHERE LOWER(email) = $1',
      [email]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Credenciais invalidas' }, { status: 401 });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ message: 'Credenciais invalidas' }, { status: 401 });
    }

    const token = signAuthToken({ userId: user.id, role: user.role });
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url ?? undefined,
      },
    });

    const cookie = createAuthCookie(token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ message: 'Erro ao autenticar' }, { status: 500 });
  }
}
