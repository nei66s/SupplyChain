"use client";

import * as React from 'react';
import { Database, Loader2, XCircle } from 'lucide-react';

type Status = 'loading' | 'connected' | 'disconnected';

const statusConfig: Record<Status, { label: string; border: string; bg: string; iconColor: string }> = {
  connected: {
    label: 'Conectado',
    border: 'border-emerald-200/80',
    bg: 'bg-emerald-50/70',
    iconColor: 'text-emerald-500',
  },
  loading: {
    label: 'Verificando...',
    border: 'border-yellow-200/80',
    bg: 'bg-yellow-50/80',
    iconColor: 'text-yellow-500',
  },
  disconnected: {
    label: 'Desconectado',
    border: 'border-rose-200/80',
    bg: 'bg-rose-50/80',
    iconColor: 'text-rose-500',
  },
};

export default function DbHealth() {
  const [status, setStatus] = React.useState<Status>('loading');
  const [latency, setLatency] = React.useState<number | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const check = async () => {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const res = await fetch('/api/inventory', { cache: 'no-store' });
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

    check();
    const id = window.setInterval(check, 15000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const cfg = statusConfig[status];

  const latencyLabel = latency ? `${latency} ms` : '—';

  return (
    <span
      role="status"
      aria-label={`Banco de dados: ${cfg.label}`}
      title={`Banco de dados: ${cfg.label}`}
      className={`inline-flex min-w-[80px] items-center gap-1 rounded-2xl border ${cfg.border} ${cfg.bg} px-2 py-1 text-slate-700 shadow-sm transition`}
    >
      <Database className={`${cfg.iconColor} ${status === 'loading' ? 'animate-spin' : ''} h-5 w-5`} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">{latencyLabel}</span>
    </span>
  );
}
