'use client';

import * as React from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>('light');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem('theme');
    const initialTheme =
      saved === 'dark' || saved === 'light'
        ? (saved as Theme)
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    setTheme(initialTheme);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('theme', theme);
    try {
      // Also persist theme in a cookie so SSR or other contexts can read it
      // Max-Age ~ 1 year
      document.cookie = `theme=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    } catch { }
  }, [theme, mounted]);

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme, mounted };
}
