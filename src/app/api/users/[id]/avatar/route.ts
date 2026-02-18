import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const awaitedParams = (await params) as { id: string };
    const targetId = awaitedParams.id;
    if (auth.role !== 'Admin' && auth.userId !== targetId) {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('avatar') as unknown;
    if (!file || typeof (file as any).arrayBuffer !== 'function') {
      return NextResponse.json({ message: 'Arquivo invalido' }, { status: 400 });
    }

    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await fs.mkdir(uploadsDir, { recursive: true });

    const originalName = (file as any).name || `${targetId}`;
    const ext = originalName.includes('.') ? originalName.split('.').pop() : 'png';
    const filename = `${targetId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, targetId]);

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error('avatar upload error', err);
    return NextResponse.json({ message: 'Erro ao enviar avatar' }, { status: 500 });
  }
}
