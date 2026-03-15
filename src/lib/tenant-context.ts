import { AsyncLocalStorage } from 'async_hooks';

type TenantStore = {
  tenantId: string;
  // Cache da promise de resolução do tenantId para evitar chamadas
  // repetidas a headers() + JWT.verify() na mesma requisição.
  _resolvedTenantId?: Promise<string | null>;
};

// Este armazenamento persiste durante todo o ciclo de vida de uma única requisição
export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getTenantContext() {
    return tenantStorage.getStore();
}

export function runWithTenant(tenantId: string, fn: () => Promise<any>) {
    return tenantStorage.run({ tenantId }, fn);
}

/**
 * Guarda a promise de resolução do tenantId no contexto da requisição atual.
 * Se já houver uma promise cacheada, retorna ela sem refazer o trabalho.
 * Isso evita múltiplos `await headers()` + JWT decode na mesma requisição.
 */
export function getOrCacheTenantResolution(
  resolver: () => Promise<string | null>
): Promise<string | null> {
  const store = tenantStorage.getStore();
  if (!store) {
    // Fora de contexto de requisição (scripts, build time) — resolve normalmente
    return resolver();
  }
  if (!store._resolvedTenantId) {
    store._resolvedTenantId = resolver();
  }
  return store._resolvedTenantId;
}
