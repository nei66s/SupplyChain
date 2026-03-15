"use client";

import * as React from 'react';
import { Database } from 'lucide-react';

type Status = 'loading' | 'connected' | 'disconnected';

const statusConfig: Record<Status, { label: string; iconColor: string }> = {
  connected: {
    label: 'Conectado',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  loading: {
    label: 'Verificando...',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  disconnected: {
    label: 'Desconectado',
    iconColor: 'text-rose-500 dark:text-rose-400',
  },
};

let globalDbStatus: Status = 'loading';
let globalDbLatency: number | null = null;
let lastDbCheck = 0;

export default function DbHealth() {
  const [status, setStatus] = React.useState<Status>(globalDbStatus);
  const [latency, setLatency] = React.useState<number | null>(globalDbLatency);

  React.useEffect(() => {
    let mounted = true;

    const check = async (force = false) => {
      const start = Date.now();
      if (!force && lastDbCheck > 0 && start - lastDbCheck < 120000) {
        if (mounted) {
          if (status !== globalDbStatus) setStatus(globalDbStatus);
          if (latency !== globalDbLatency) setLatency(globalDbLatency);
        }
        return;
      }
      try {
        const res = await fetch('/api/ping', { cache: 'no-store' });
        const end = Date.now();
        const measure = Math.max(1, Math.round(end - start));
        const newStatus = res.ok ? 'connected' : 'disconnected';
        globalDbStatus = newStatus;
        globalDbLatency = res.ok ? measure : null;
        lastDbCheck = Date.now();
        if (mounted) {
          setStatus(newStatus);
          setLatency(res.ok ? measure : null);
        }
      } catch {
        globalDbStatus = 'disconnected';
        globalDbLatency = null;
        lastDbCheck = Date.now();
        if (mounted) {
          setStatus('disconnected');
          setLatency(null);
        }
      }
    };

    check();
    const id = window.setInterval(() => check(true), 120000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [status, latency]);

  const cfg = statusConfig[status];

  return (
    <span
      role="status"
      aria-label={`Banco de dados: ${cfg.label}`}
      title={latency ? `Banco de dados: ${cfg.label} (${latency}ms)` : `Banco de dados: ${cfg.label}`}
      className="inline-flex h-8 min-w-[32px] px-1.5 gap-1 items-center justify-center rounded-full transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-help"
    >
      <Database className={`${cfg.iconColor} ${status === 'loading' ? 'animate-spin' : ''} h-4 w-4 shrink-0`} strokeWidth={2.5} />
      {latency !== null && status === 'connected' && (
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-0.5">
          {latency}ms
        </span>
      )}
      <span className="sr-only">{cfg.label}</span>
    </span>
  );
}
