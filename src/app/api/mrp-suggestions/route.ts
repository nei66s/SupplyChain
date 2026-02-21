import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

type SuggestionRow = {
  id: number;
  material_id: string;
  suggested_reorder_point: string;
  suggested_min_stock: string;
  suggested_qty: string;
  rationale: string;
  status: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
};

const rolesAllowed = new Set(['Admin', 'Manager']);

function toNumber(value: unknown) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return parsed;
}

function mapRow(row: SuggestionRow) {
  return {
    id: String(row.id),
    materialId: row.material_id,
    suggestedReorderPoint: toNumber(row.suggested_reorder_point),
    suggestedMinStock: toNumber(row.suggested_min_stock),
    suggestedQty: toNumber(row.suggested_qty),
    rationale: row.rationale ?? '',
    status: row.status,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    appliedAt: row.applied_at ?? undefined,
  };
}

async function ensureAuthorized(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!rolesAllowed.has(auth.role)) {
    throw new Error('Acesso restrito');
  }
  return auth;
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthorized(request);
    const result = await query<SuggestionRow>(`
      SELECT id, material_id, suggested_reorder_point, suggested_min_stock, suggested_qty,
        rationale, status, updated_by, created_at, updated_at, applied_at
      FROM mrp_suggestions
      ORDER BY updated_at DESC
      LIMIT 200
    `);

    return NextResponse.json(result.rows.map(mapRow));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ message }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAuthorized(request);
    const body = await request.json().catch(() => ({}));
    const materialId = String(body.materialId ?? '').trim();
    if (!materialId) {
      return NextResponse.json({ message: 'Material obrigatorio' }, { status: 400 });
    }
    const suggestedReorderPoint = toNumber(body.suggestedReorderPoint);
    const suggestedMinStock = toNumber(body.suggestedMinStock);
    const suggestedQty = toNumber(body.suggestedQty);
    const rationale = String(body.rationale ?? '').trim();

    const result = await query<SuggestionRow>(
      `
        INSERT INTO mrp_suggestions (
          material_id,
          suggested_reorder_point,
          suggested_min_stock,
          suggested_qty,
          rationale,
          status,
          updated_by,
          applied_at,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,'CONFIRMED',$6,now(),now(),now())
        ON CONFLICT (material_id)
        DO UPDATE SET
          suggested_reorder_point = EXCLUDED.suggested_reorder_point,
          suggested_min_stock = EXCLUDED.suggested_min_stock,
          suggested_qty = EXCLUDED.suggested_qty,
          rationale = EXCLUDED.rationale,
          status = 'CONFIRMED',
          updated_by = EXCLUDED.updated_by,
          applied_at = now(),
          updated_at = now()
        RETURNING id, material_id, suggested_reorder_point, suggested_min_stock, suggested_qty,
          rationale, status, updated_by, created_at, updated_at, applied_at;
      `,
      [materialId, suggestedReorderPoint, suggestedMinStock, suggestedQty, rationale, auth.userId]
    );

    return NextResponse.json(mapRow(result.rows[0]));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ message }, { status: 500 });
  }
}
