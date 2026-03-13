'use client';

import { useCallback, useEffect, useState } from 'react';

import { AuthUser } from '@/lib/auth';

export function useAuthUser(initialUser: AuthUser | null = null) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Se for o primeiro render e já temos initialUser, podemos pular o fetch no mount
    // mas ainda deixamos o refresh disponível para chamadas manuais.
    setLoading(true);
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' });
      if (!response.ok) {
        setUser(null);
        setError('Falha ao carregar usuario');
      } else {
        const payload = await response.json();
        setUser(payload.user ?? null);
        setError(null);
      }
    } catch (err) {
      console.error('auth refresh failed', err);
      setUser(null);
      setError('Falha ao carregar usuario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialUser) {
      refresh();
    }
  }, [refresh, initialUser]);

  return { user, loading, error, refresh };
}
