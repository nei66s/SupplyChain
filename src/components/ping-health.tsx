"use client";

import * as React from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

type Status = 'loading' | 'connected' | 'disconnected';

const statusConfig: Record<Status, { label: string; border: string; bg: string; iconColor: string }> = {
  connected: {
    label: 'Ping OK',
    border: 'border-emerald-200/80',
    bg: 'bg-emerald-50/70',
    iconColor: 'text-emerald-500',
  },
  loading: {
    label: 'Ping...',
    border: 'border-yellow-200/80',
    bg: 'bg-yellow-50/80',
    iconColor: 'text-yellow-500',
  },
  disconnected: {
    label: 'Ping falhou',
    border: 'border-rose-200/80',
    bg: 'bg-rose-50/80',
    iconColor: 'text-rose-500',
  },
};

export default function PingHealth() {
  const [status, setStatus] = React.useState<Status>('loading');

  React.useEffect(() => {
    let mounted = true;

    const measurePing = async () => {
      try {
        const res = await fetch('/api/ping', { cache: 'no-store' });
        if (!mounted) return;
        setStatus(res.ok ? 'connected' : 'disconnected');
      } catch {
        if (!mounted) return;
        setStatus('disconnected');
      }
    };

    measurePing();
    const id = window.setInterval(measurePing, 120000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const cfg = statusConfig[status];
  const Icon = status === 'disconnected' ? WifiOff : status === 'loading' ? Loader2 : Wifi;

  return (
    <span
      role="status"
      aria-label={cfg.label}
      title={cfg.label}
      className={`inline-flex w-fit items-center gap-1 rounded-2xl border ${cfg.border} ${cfg.bg} px-2 py-1 text-slate-700 shadow-sm transition`}
    >
      <Icon className={`${cfg.iconColor} ${status === 'loading' ? 'animate-spin' : ''} h-5 w-5`} />
      <span className="sr-only">{cfg.label}</span>
    </span>
  );
}

