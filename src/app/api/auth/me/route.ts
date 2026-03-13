import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthPayload } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = getAuthPayload(req);
    if (!payload) {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 });
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.tenant_id, u.avatar_url, t.subscription_status
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [payload.userId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Usuario nao encontrado' }, { status: 401 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        avatarUrl: user.avatar_url ?? undefined,
        subscriptionStatus: user.subscription_status,
      },
    });

  } catch (err) {
    console.error('me endpoint error', err);
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
  }
}
