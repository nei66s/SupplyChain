"use client";

import * as React from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

type Status = 'loading' | 'connected' | 'disconnected';

const statusConfig: Record<Status, { label: string; iconColor: string }> = {
  connected: {
    label: 'Ping OK',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  loading: {
    label: 'Ping...',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  disconnected: {
    label: 'Ping falhou',
    iconColor: 'text-rose-500 dark:text-rose-400',
  },
};

let globalPingStatus: Status = 'loading';
let globalLatency: number | null = null;
let lastPingCheck = 0;

export default function PingHealth() {
  const [status, setStatus] = React.useState<Status>(globalPingStatus);
  const [latency, setLatency] = React.useState<number | null>(globalLatency);

  React.useEffect(() => {
    let mounted = true;

    const measurePing = async (force = false) => {
      const start = Date.now();
      if (!force && lastPingCheck > 0 && start - lastPingCheck < 120000) {
        if (mounted) {
          if (status !== globalPingStatus) setStatus(globalPingStatus);
          if (latency !== globalLatency) setLatency(globalLatency);
        }
        return;
      }
      try {
        const res = await fetch('/api/ping', { cache: 'no-store' });
        const end = Date.now();
        const measure = Math.max(1, Math.round(end - start));
        const newStatus = res.ok ? 'connected' : 'disconnected';
        globalPingStatus = newStatus;
        globalLatency = res.ok ? measure : null;
        lastPingCheck = Date.now();
        if (mounted) {
          setStatus(newStatus);
          setLatency(res.ok ? measure : null);
        }
      } catch {
        globalPingStatus = 'disconnected';
        globalLatency = null;
        lastPingCheck = Date.now();
        if (mounted) {
          setStatus('disconnected');
          setLatency(null);
        }
      }
    };

    measurePing();
    const id = window.setInterval(() => measurePing(true), 120000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [status, latency]);

  const cfg = statusConfig[status];
  const Icon = status === 'disconnected' ? WifiOff : status === 'loading' ? Loader2 : Wifi;

  return (
    <span
      role="status"
      aria-label={cfg.label}
      title={latency ? `${cfg.label} (${latency}ms)` : cfg.label}
      className="inline-flex h-8 min-w-[32px] px-1.5 gap-1 items-center justify-center rounded-full transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-help"
    >
      <Icon className={`${cfg.iconColor} ${status === 'loading' ? 'animate-spin' : ''} h-4 w-4 shrink-0`} strokeWidth={2.5} />
      {latency !== null && status === 'connected' && (
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-0.5">
          {latency}ms
        </span>
      )}
      <span className="sr-only">{cfg.label}</span>
    </span>
  );
}

