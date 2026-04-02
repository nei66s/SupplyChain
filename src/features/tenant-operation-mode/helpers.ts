import { TENANT_OPERATION_MODES, TenantOperationMode } from './types';

export function normalizeTenantOperationMode(value: unknown): TenantOperationMode {
  const normalized = String(value ?? '').trim().toUpperCase();
  return TENANT_OPERATION_MODES.includes(normalized as TenantOperationMode)
    ? (normalized as TenantOperationMode)
    : 'BOTH';
}

export function operationModeLabel(mode: TenantOperationMode): string {
  switch (mode) {
    case 'QUANTITY':
      return 'Quantidade';
    case 'WEIGHT':
      return 'Peso';
    default:
      return 'Ambos';
  }
}

export function quantityEnabled(mode: TenantOperationMode): boolean {
  return mode === 'QUANTITY' || mode === 'BOTH';
}

export function weightEnabled(mode: TenantOperationMode): boolean {
  return mode === 'WEIGHT' || mode === 'BOTH';
}
