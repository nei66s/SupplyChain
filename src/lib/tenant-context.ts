import { AsyncLocalStorage } from 'async_hooks';

// Este armazenamento persiste durante todo o ciclo de vida de uma única requisição
export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

export function getTenantContext() {
    return tenantStorage.getStore();
}

export function runWithTenant(tenantId: string, fn: () => Promise<any>) {
    return tenantStorage.run({ tenantId }, fn);
}
