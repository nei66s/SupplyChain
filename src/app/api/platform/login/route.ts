import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { signAuthToken, createAuthCookie } from '@/lib/auth';

type PlatformLoginRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  tenant_id: string;
  avatar_url: string | null;
  is_platform_admin: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ message: 'Email e senha sao obrigatorios' }, { status: 400 });
    }

    const result = await getPool().query<PlatformLoginRow>(
      `SELECT id, name, email, password_hash, role, tenant_id, avatar_url, is_platform_admin
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
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

    if (!user.is_platform_admin) {
      return NextResponse.json({ message: 'Acesso restrito ao administrador da plataforma' }, { status: 403 });
    }

    const token = signAuthToken({ userId: user.id, role: user.role, tenantId: user.tenant_id });
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        avatarUrl: user.avatar_url ?? undefined,
        isPlatformAdmin: true,
      },
    });

    const cookie = createAuthCookie(token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (err) {
    console.error('platform login error', err);
    return NextResponse.json({ message: 'Erro ao autenticar no painel da plataforma' }, { status: 500 });
  }
}
