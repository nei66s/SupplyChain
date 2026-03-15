"use client";

import * as React from 'react';
import { Zap, ZapOff, Loader2 } from 'lucide-react';
import { useRealtimeStore } from '@/store/use-realtime-store';

export default function WsHealth() {
  const { isConnected, isConnecting } = useRealtimeStore();
  const [mounted, setMounted] = React.useState(false);

  const [latency, setLatency] = React.useState<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    let interval: number;
    let mountedLocal = true;

    const measurePing = async () => {
      // Only measure if connected, otherwise we might just be showing disconnected
      if (!isConnected) {
        if (mountedLocal) setLatency(null);
        return;
      }
      
      const start = Date.now();
      try {
        const res = await fetch('/api/ping', { cache: 'no-store' });
        const end = Date.now();
        if (res.ok && mountedLocal) {
          setLatency(Math.max(1, Math.round(end - start)));
        }
      } catch {
        if (mountedLocal) setLatency(null);
      }
    };

    if (isConnected) {
      measurePing();
      interval = window.setInterval(measurePing, 120000);
    } else {
      setLatency(null);
    }

    return () => {
      mountedLocal = false;
      if (interval) window.clearInterval(interval);
    };
  }, [isConnected]);

  if (!mounted) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-help">
        <Loader2 className="text-amber-500 dark:text-amber-400 animate-spin h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }

  const status = isConnected ? 'connected' : isConnecting ? 'loading' : 'disconnected';

  const config = {
    connected: {
      label: 'Tempo Real: Conectado',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
    },
    loading: {
      label: 'Tempo Real: Conectando...',
      iconColor: 'text-amber-500 dark:text-amber-400',
    },
    disconnected: {
      label: 'Tempo Real: Desconectado',
      iconColor: 'text-rose-500 dark:text-rose-400',
    }
  };

  const cfg = config[status];
  const Icon = status === 'connected' ? Zap : status === 'loading' ? Loader2 : ZapOff;

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
