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
  const [latency, setLatency] = React.useState<number | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const measurePing = async () => {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const res = await fetch('/api/ping', { cache: 'no-store' });
        if (!mounted) return;
        const elapsed = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
        setLatency(elapsed);
        setStatus(res.ok ? 'connected' : 'disconnected');
      } catch {
        if (!mounted) return;
        setLatency(null);
        setStatus('disconnected');
      }
    };

    measurePing();
    const id = window.setInterval(measurePing, 15000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const cfg = statusConfig[status];
  const Icon = status === 'disconnected' ? WifiOff : status === 'loading' ? Loader2 : Wifi;

  const latencyLabel = latency ? `${latency} ms` : '—';

  return (
    <span
      role="status"
      aria-label={`${cfg.label} ${latency ? `${latency} ms` : ''}`}
      title={`${cfg.label}${latency ? ` · ${latency} ms` : ''}`}
      className={`inline-flex min-w-[80px] items-center gap-1 rounded-2xl border ${cfg.border} ${cfg.bg} px-2 py-1 text-slate-700 shadow-sm transition`}
    >
      <Icon className={`${cfg.iconColor} ${status === 'loading' ? 'animate-spin' : ''} h-5 w-5`} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">{latencyLabel}</span>
    </span>
  );
}

