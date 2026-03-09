import { NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

type Params = { params: { categoryId: string; valueId: string } }

export async function DELETE(_request: Request, context: any) {
  try {
    const { params } = context;
    const categoryId = Number(params.categoryId);
    const valueId = Number(params.valueId);
    if (!Number.isFinite(categoryId) || categoryId <= 0 || !Number.isFinite(valueId) || valueId <= 0) {
      return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 });
    }

    const deleted = await getPool().query(
      'DELETE FROM precondition_values WHERE id = $1 AND category_id = $2 RETURNING id',
      [valueId, categoryId]
    );

    if (deleted.rowCount === 0) {
      return NextResponse.json({ error: 'Valor nao encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao remover valor' }, { status: 500 });
  }
}
