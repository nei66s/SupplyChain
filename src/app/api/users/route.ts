import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Role } from '@/lib/domain/types';

const ROLES: Role[] = ['Admin', 'Manager', 'Seller', 'Input Operator', 'Production Operator', 'Picker'];

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const result = await pool.query('SELECT id, name, email, role, avatar_url FROM users ORDER BY role, name');
    return NextResponse.json({
      users: result.rows.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url ?? undefined,
      })),
    });
  } catch (err) {
    console.error('users GET error', err);
    return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const role = String(body.role ?? '').trim() as Role;
    const password = String(body.password ?? '');
    const avatarUrl = body.avatarUrl ? String(body.avatarUrl).trim() : null;

    if (!name || !email || !role || !password) {
      return NextResponse.json({ message: 'Nome, e-mail, senha e perfil sao obrigatorios' }, { status: 400 });
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ message: 'Perfil invalido' }, { status: 400 });
    }

    const emailCheck = await pool.query('SELECT 1 FROM users WHERE LOWER(email) = $1', [email]);
    if (emailCheck.rowCount > 0) {
      return NextResponse.json({ message: 'E-mail ja cadastrado' }, { status: 400 });
    }

    const id = `usr-${randomUUID().slice(0, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, avatar_url) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name, email, passwordHash, role, avatarUrl]
    );

    return NextResponse.json({
      user: {
        id,
        name,
        email,
        role,
        avatarUrl: avatarUrl || undefined,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('users POST error', err);
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
  }
}
