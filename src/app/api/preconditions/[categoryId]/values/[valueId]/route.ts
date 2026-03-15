import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'



export async function DELETE(request: NextRequest, { params }: { params: Promise<{ categoryId: string, valueId: string }> }) {
  try {
    const auth = await requireAuth(request)
    const resolvedParams = await params
    const categoryId = Number(resolvedParams.categoryId)
    const valueId = Number(resolvedParams.valueId)
    if (!Number.isFinite(categoryId) || categoryId <= 0 || !Number.isFinite(valueId) || valueId <= 0) {
      return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 });
    }

    const deleted = await query(
      'DELETE FROM precondition_values WHERE id = $1 AND category_id = $2 AND tenant_id = $3 RETURNING id',
      [valueId, categoryId, auth.tenantId]
    );

    if (deleted.rowCount === 0) {
      return NextResponse.json({ error: 'Valor nao encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao remover valor' }, { status: 500 });
  }
}
