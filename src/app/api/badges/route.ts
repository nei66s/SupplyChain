import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    const [ordersRes, pickingRes, prodRes] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM orders 
         WHERE trashed_at IS NULL 
           AND lower(coalesce(status, '')) NOT IN ('finalizado', 'saida_concluida') 
           AND tenant_id = $1::uuid`,
        [auth.tenantId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM orders 
         WHERE trashed_at IS NULL 
           AND lower(coalesce(status, '')) IN ('em_picking', 'aberto', 'saida_concluida') 
           AND tenant_id = $1::uuid`,
        [auth.tenantId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM production_tasks pt
         LEFT JOIN orders o ON o.id = pt.order_id
         WHERE o.trashed_at IS NULL
           AND (o.status IS NULL OR lower(o.status) NOT IN ('cancelado', 'finalizado'))
           AND pt.tenant_id = $1::uuid
           AND pt.status <> 'DONE'
           AND NOT (
             lower(coalesce(o.status, '')) IN ('rascunho', 'draft')
             AND lower(coalesce(o.source, '')) <> 'mrp'
           )`,
        [auth.tenantId]
      ),
    ]);

    return NextResponse.json({
      orders: Number(ordersRes.rows[0]?.count ?? 0),
      picking: Number(pickingRes.rows[0]?.count ?? 0),
      production: Number(prodRes.rows[0]?.count ?? 0),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
