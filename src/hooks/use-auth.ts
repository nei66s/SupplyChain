'use client';

import { useCallback, useEffect, useState } from 'react';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  subscriptionStatus?: string;
};

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
    refresh();
  }, [refresh]);

  return { user, loading, error, refresh };
}
