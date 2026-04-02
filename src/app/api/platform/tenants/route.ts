import { NextRequest, NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { normalizeTenantOperationMode } from '@/features/tenant-operation-mode/helpers';

export async function GET(req: NextRequest) {
    const auth = getAuthPayload(req);
    if (!auth) {
        return NextResponse.json({ message: 'Nao autenticado' }, { status: 401 });
    }
    if (auth.role !== 'Admin') {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
    }

    try {
        const pool = getPool();

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
        t.operation_mode,
        t.subscription_status,
        t.is_platform_owner,
        t.blocked_reason,
        t.blocked_at,
        t.created_at,
        COALESCE(array_remove(array_agg(DISTINCT tld.domain), NULL), ARRAY[]::text[]) AS login_domains,
        COUNT(DISTINCT u.id) AS user_count,
        MAX(u.created_at) AS last_user_created_at
      FROM tenants t
      LEFT JOIN tenant_login_domains tld ON tld.tenant_id = t.id
      LEFT JOIN users u ON u.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.is_platform_owner DESC, t.created_at ASC
    `);

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
                userGrowth: userGrowth.rows,
            },
        });
    } catch (err) {
        console.error('[platform/tenants GET]', err);
        return NextResponse.json({ message: 'Erro ao buscar tenants' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = getAuthPayload(req);
    if (!auth) {
        return NextResponse.json({ message: 'Nao autenticado' }, { status: 401 });
    }
    if (auth.role !== 'Admin') {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
    }

    try {
        const pool = getPool();

        const callerRes = await pool.query(
            'SELECT is_platform_admin FROM users WHERE id = $1',
            [auth.userId]
        );
        if (!callerRes.rows[0]?.is_platform_admin) {
            return NextResponse.json({ message: 'Acesso restrito ao Super Admin' }, { status: 403 });
        }

        const body = await req.json();
        const { tenantId, status, plan, blockedReason, loginDomains, operationMode } = body;

        if (!tenantId || !status) {
            return NextResponse.json({ message: 'tenantId e status sao obrigatorios' }, { status: 400 });
        }

        const targetRes = await pool.query('SELECT is_platform_owner FROM tenants WHERE id = $1', [tenantId]);
        if (targetRes.rows[0]?.is_platform_owner && status === 'BLOCKED') {
            return NextResponse.json({ message: 'Nao e possivel bloquear o tenant da plataforma' }, { status: 400 });
        }

        const blockedAt = status === 'BLOCKED' ? new Date().toISOString() : null;
        const clearBlockedReason = status !== 'BLOCKED' ? null : (blockedReason ?? null);

        await pool.query(
            `UPDATE tenants SET
        status = $1,
        plan = COALESCE($2, plan),
        operation_mode = COALESCE($3, operation_mode),
        blocked_reason = $4,
        blocked_at = $5
       WHERE id = $6`,
            [status, plan ?? null, operationMode ? normalizeTenantOperationMode(operationMode) : null, clearBlockedReason, blockedAt, tenantId]
        );

        if (Array.isArray(loginDomains)) {
            const normalizedDomains = [...new Set(
                loginDomains
                    .map((value) => String(value ?? '').trim().toLowerCase())
                    .filter(Boolean)
            )];

            await pool.query('DELETE FROM tenant_login_domains WHERE tenant_id = $1', [tenantId]);

            for (const domain of normalizedDomains) {
                await pool.query(
                    `INSERT INTO tenant_login_domains (tenant_id, domain)
                     VALUES ($1, $2)
                     ON CONFLICT (domain) DO UPDATE
                     SET tenant_id = EXCLUDED.tenant_id,
                         updated_at = NOW()`,
                    [tenantId, domain]
                );
            }
        }

        return NextResponse.json({ message: 'Tenant atualizado com sucesso' });
    } catch (err) {
        console.error('[platform/tenants PATCH]', err);
        return NextResponse.json({ message: 'Erro ao atualizar tenant' }, { status: 500 });
    }
}
