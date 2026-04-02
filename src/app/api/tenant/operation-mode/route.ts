import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { normalizeTenantOperationMode } from '@/features/tenant-operation-mode/helpers';
import { setTenantOperationMode } from '@/features/tenant-operation-mode/server';

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const operationMode = normalizeTenantOperationMode(body.operationMode);

    await setTenantOperationMode(auth.tenantId, operationMode);

    return NextResponse.json({ ok: true, operationMode });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ message: 'Nao autorizado' }, { status: 401 });
    }
    console.error('tenant operation mode PATCH error', error);
    return NextResponse.json({ message: 'Nao foi possivel atualizar o modo operacional' }, { status: 500 });
  }
}
