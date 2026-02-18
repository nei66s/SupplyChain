import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { Role } from '@/lib/domain/types';

const ROLES: Role[] = ['Admin', 'Manager', 'Seller', 'Input Operator', 'Production Operator', 'Picker'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const awaitedParams = (await params) as { id: string };
    const targetId = awaitedParams.id;
    if (auth.role !== 'Admin' && auth.userId !== targetId) {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (typeof body.name === 'string') {
      const next = body.name.trim();
      if (next) {
        updates.push(`name = $${values.length + 1}`);
        values.push(next);
      }
    }

    if (typeof body.email === 'string') {
      const next = body.email.trim().toLowerCase();
      if (next) {
        const conflict = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2', [
          next,
          targetId,
        ]);
        if (conflict.rowCount > 0) {
          return NextResponse.json({ message: 'E-mail em uso por outro usuario' }, { status: 400 });
        }
        updates.push(`email = $${values.length + 1}`);
        values.push(next);
      }
    }

    if (typeof body.password === 'string' && body.password.trim()) {
      const passwordHash = await bcrypt.hash(body.password, 10);
      updates.push(`password_hash = $${values.length + 1}`);
      values.push(passwordHash);
    }

    if (typeof body.avatarUrl === 'string') {
      updates.push(`avatar_url = $${values.length + 1}`);
      values.push(body.avatarUrl.trim() || null);
    }

    if (typeof body.role === 'string' && auth.role === 'Admin') {
      const nextRole = body.role.trim();
      if (!ROLES.includes(nextRole as Role)) {
        return NextResponse.json({ message: 'Perfil invalido' }, { status: 400 });
      }
      updates.push(`role = $${values.length + 1}`);
      values.push(nextRole);
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'Nada para atualizar' }, { status: 400 });
    }

    values.push(targetId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

    const updated = await pool.query('SELECT id, name, email, role, avatar_url FROM users WHERE id = $1', [targetId]);
    if (updated.rowCount === 0) {
      return NextResponse.json({ message: 'Usuario nao encontrado' }, { status: 404 });
    }

    const user = updated.rows[0];
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
    console.error('users PATCH error', err);
    return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 });
  }
}
