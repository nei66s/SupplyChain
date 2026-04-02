import { PoolClient } from 'pg';
import { query } from '@/lib/db';
import { normalizeTenantOperationMode } from './helpers';
import { TenantOperationMode } from './types';

export async function getTenantOperationMode(tenantId: string): Promise<TenantOperationMode> {
  const result = await query('SELECT operation_mode FROM tenants WHERE id = $1 LIMIT 1', [tenantId]);
  return normalizeTenantOperationMode(result.rows[0]?.operation_mode);
}

export async function getTenantOperationModeWithClient(
  client: PoolClient,
  tenantId: string
): Promise<TenantOperationMode> {
  const result = await client.query('SELECT operation_mode FROM tenants WHERE id = $1 LIMIT 1', [tenantId]);
  return normalizeTenantOperationMode(result.rows[0]?.operation_mode);
}

export async function setTenantOperationMode(
  tenantId: string,
  mode: TenantOperationMode
): Promise<TenantOperationMode> {
  const normalizedMode = normalizeTenantOperationMode(mode);
  await query('UPDATE tenants SET operation_mode = $2 WHERE id = $1', [tenantId, normalizedMode]);
  return normalizedMode;
}

export async function getOrderOperationModeWithClient(
  client: PoolClient,
  orderId: number
): Promise<TenantOperationMode> {
  const result = await client.query('SELECT operation_mode FROM orders WHERE id = $1 LIMIT 1', [orderId]);
  return normalizeTenantOperationMode(result.rows[0]?.operation_mode);
}
