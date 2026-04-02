'use client';

import * as React from 'react';
import { normalizeTenantOperationMode } from './helpers';
import { TenantOperationMode } from './types';

const STORAGE_KEY = 'inventario-agil.operation-mode';

type UseOperationModeOptions = {
  fallbackMode?: TenantOperationMode;
};

export function useOperationMode(options?: UseOperationModeOptions) {
  const fallbackMode = options?.fallbackMode ?? 'BOTH';
  const [operationMode, setOperationModeState] = React.useState<TenantOperationMode>(fallbackMode);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (storedValue) {
      setOperationModeState(normalizeTenantOperationMode(storedValue));
      setHydrated(true);
      return;
    }

    setOperationModeState(normalizeTenantOperationMode(fallbackMode));
    setHydrated(true);
  }, [fallbackMode]);

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setOperationModeState(normalizeTenantOperationMode(event.newValue));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setOperationMode = React.useCallback((nextMode: TenantOperationMode) => {
    const normalizedMode = normalizeTenantOperationMode(nextMode);
    window.localStorage.setItem(STORAGE_KEY, normalizedMode);
    setOperationModeState(normalizedMode);
  }, []);

  return {
    operationMode,
    setOperationMode,
    hydrated,
  };
}
