import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
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
        const conflict = await getPool().query('SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2', [
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

    if (typeof body.isBlocked === 'boolean' && auth.role === 'Admin') {
      updates.push(`is_blocked = $${values.length + 1}`);
      values.push(body.isBlocked);
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'Nada para atualizar' }, { status: 400 });
    }

    values.push(targetId);
    await getPool().query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

    const updated = await getPool().query('SELECT id, name, email, role, avatar_url, is_blocked FROM users WHERE id = $1', [targetId]);
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
        isBlocked: user.is_blocked,
      },
    });
  } catch (err) {
    console.error('users PATCH error', err);
    return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const awaitedParams = (await params) as { id: string };
    const targetId = awaitedParams.id;

    if (auth.role !== 'Admin') {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 403 });
    }

    if (targetId === auth.userId) {
      return NextResponse.json({ message: 'Nao pode excluir o seu proprio usuario' }, { status: 400 });
    }

    await getPool().query('DELETE FROM users WHERE id = $1', [targetId]);

    return NextResponse.json({ message: 'Usuario excluido com sucesso' });
  } catch (err) {
    console.error('users DELETE error', err);
    return NextResponse.json({ message: 'Erro ao excluir usuario' }, { status: 500 });
  }
}
