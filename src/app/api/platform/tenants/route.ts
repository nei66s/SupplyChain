import { NextRequest, NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { getPool } from '@/lib/db';


export async function GET(req: NextRequest) {
    const auth = getAuthPayload(req);
    // 401 = not logged in at all → frontend will redirect to /login
    if (!auth) {
        return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }
    // 403 = logged in but not an admin
    if (auth.role !== 'Admin') {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
    }

    try {
        const pool = getPool();

        // Verify caller is platform admin
        const callerRes = await pool.query(
            'SELECT is_platform_admin FROM users WHERE id = $1',
            [auth.userId]
        );
        if (!callerRes.rows[0]?.is_platform_admin) {
            return NextResponse.json({ message: 'Acesso restrito ao Super Admin' }, { status: 403 });
        }

        const result = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.status,
        t.plan,
        t.subscription_status,
        t.is_platform_owner,
        t.blocked_reason,
        t.blocked_at,
        t.created_at,
        COUNT(DISTINCT u.id) AS user_count,
        MAX(u.created_at) AS last_user_created_at
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.is_platform_owner DESC, t.created_at ASC
    `);

        // Fetch growth stats for the last 30 days
        const tenantGrowth = await pool.query(`
      SELECT 
        DATE(created_at) as date, 
        COUNT(*) as count
      FROM tenants
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

        const userGrowth = await pool.query(`
      SELECT 
        DATE(created_at) as date, 
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

        return NextResponse.json({
            tenants: result.rows,
            stats: {
                tenantGrowth: tenantGrowth.rows,
                userGrowth: userGrowth.rows
            }
        });

    } catch (err) {
        console.error('[platform/tenants GET]', err);
        return NextResponse.json({ message: 'Erro ao buscar tenants' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = getAuthPayload(req);
    // 401 = not logged in at all
    if (!auth) {
        return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }
    if (auth.role !== 'Admin') {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
    }

    try {
        const pool = getPool();

        // Verify platform admin
        const callerRes = await pool.query(
            'SELECT is_platform_admin FROM users WHERE id = $1',
            [auth.userId]
        );
        if (!callerRes.rows[0]?.is_platform_admin) {
            return NextResponse.json({ message: 'Acesso restrito ao Super Admin' }, { status: 403 });
        }

        const body = await req.json();
        const { tenantId, status, plan, blockedReason } = body;

        if (!tenantId || !status) {
            return NextResponse.json({ message: 'tenantId e status são obrigatórios' }, { status: 400 });
        }

        // Prevent blocking the platform owner
        const targetRes = await pool.query('SELECT is_platform_owner FROM tenants WHERE id = $1', [tenantId]);
        if (targetRes.rows[0]?.is_platform_owner && status === 'BLOCKED') {
            return NextResponse.json({ message: 'Não é possível bloquear o tenant da plataforma' }, { status: 400 });
        }

        const blockedAt = status === 'BLOCKED' ? new Date().toISOString() : null;
        const clearBlockedReason = status !== 'BLOCKED' ? null : (blockedReason ?? null);

        await pool.query(
            `UPDATE tenants SET
        status = $1,
        plan = COALESCE($2, plan),
        blocked_reason = $3,
        blocked_at = $4
       WHERE id = $5`,
            [status, plan ?? null, clearBlockedReason, blockedAt, tenantId]
        );

        return NextResponse.json({ message: 'Tenant atualizado com sucesso' });
    } catch (err) {
        console.error('[platform/tenants PATCH]', err);
        return NextResponse.json({ message: 'Erro ao atualizar tenant' }, { status: 500 });
    }
}
