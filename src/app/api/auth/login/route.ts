import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { signAuthToken, createAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ message: 'Email e senha sao obrigatorios' }, { status: 400 });
    }

    const result = await getPool().query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.tenant_id, u.avatar_url, t.status as tenant_status, t.name as tenant_name
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE LOWER(u.email) = $1`,
      [email]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Credenciais invalidas' }, { status: 401 });
    }

    const user = result.rows[0];

    // Check Tenant Status
    if (user.tenant_status === 'BLOCKED') {
      return NextResponse.json({ message: 'Esta conta foi bloqueada por um administrador.' }, { status: 403 });
    }
    if (user.tenant_status === 'PENDING') {
      return NextResponse.json({ message: 'Seu cadastro está em análise. Você receberá um aviso assim que for aprovado!' }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ message: 'Credenciais invalidas' }, { status: 401 });
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
