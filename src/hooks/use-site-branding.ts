'use client';

import { useEffect, useState, useCallback } from 'react';

type SiteBrandingResponse = {
  companyName?: string;
  platformLabel?: string;
  logoUrl?: string | null;
  logoDataUrl?: string | null;
};

export type SiteBranding = {
  companyName: string;
  platformLabel: string;
  logoSrc: string;
};

const FALLBACK_BRANDING: SiteBranding = {
  companyName: 'Black Tower X',
  platformLabel: 'Inventário Ágil',
  logoSrc: '/black-tower-x-transp.png',
};

const CACHE_KEY = 'site-branding';
const COOKIE_KEY = 'site-branding';

export function useSiteBranding() {
  const [branding, setBranding] = useState<SiteBranding>(FALLBACK_BRANDING);
  const [loading, setLoading] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);

  const fetchBranding = useCallback(async (active: boolean) => {
    try {
      const response = await fetch('/api/site', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Falha ao carregar identidade');
      }
      const payload = (await response.json()) as SiteBrandingResponse;

      if (!active) return;

      const logoDataUrl =
        typeof payload.logoDataUrl === 'string' ? payload.logoDataUrl.trim() : null;
      const logoUrl = typeof payload.logoUrl === 'string' ? payload.logoUrl.trim() : null;
      const logoSrc = logoDataUrl || logoUrl || FALLBACK_BRANDING.logoSrc;

      const newBranding = {
        companyName: payload.companyName?.trim() || FALLBACK_BRANDING.companyName,
        platformLabel: payload.platformLabel?.trim() || FALLBACK_BRANDING.platformLabel,
        logoSrc,
      };

      setBranding(newBranding);

      // Persist to local storage for instant client-side retrieval
      localStorage.setItem(CACHE_KEY, JSON.stringify(newBranding));

      // Persist to cookies for potential SSR support (matching theme pattern)
      try {
        const cookieValue = btoa(JSON.stringify(newBranding));
        document.cookie = `${COOKIE_KEY}=${cookieValue};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      } catch { }

    } catch (error) {
      console.error('Branding fetch error:', error);
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    // 1. Initial hydration on client: read from cache immediately after mount
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setBranding(JSON.parse(cached));
      } catch { }
    }
    setHasHydrated(true);

    // 2. Refresh from API
    fetchBranding(active);

    // 3. Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CACHE_KEY && e.newValue) {
        try {
          setBranding(JSON.parse(e.newValue));
        } catch { }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      active = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchBranding]);

  return {
    branding,
    loading: loading && !hasHydrated,
    hasHydrated,
    refreshBranding: () => fetchBranding(true)
  };
}
