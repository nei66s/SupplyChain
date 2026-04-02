export const TENANT_OPERATION_MODES = ['QUANTITY', 'WEIGHT', 'BOTH'] as const;

export type TenantOperationMode = (typeof TENANT_OPERATION_MODES)[number];
