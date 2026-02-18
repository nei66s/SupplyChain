import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthPayload } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = getAuthPayload(req);
    if (!payload) {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT id, name, email, role, avatar_url FROM users WHERE id = $1',
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
        avatarUrl: user.avatar_url ?? undefined,
      },
    });
  } catch (err) {
    console.error('me endpoint error', err);
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
  }
}
