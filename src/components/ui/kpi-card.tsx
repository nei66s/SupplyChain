"use client";

import { useEffect, useState } from 'react';
import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type KpiCardProps = {
  title: string;
  value: string | number;
  trend?: string;
  unit?: string;
  icon: LucideIcon;
  tone?: 'default' | 'info' | 'warning' | 'danger' | 'success';
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  sparkline?: number[];
};

const toneStyles: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

export function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
  tone = 'default',
  loading,
  className,
  unit,
  onClick,
  sparkline,
}: KpiCardProps) {
  function parseTrend(t?: string) {
    if (!t) return null;
    const m = t.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
    if (m) {
      const n = Number(m[1]);
      return { number: n, direction: n > 0 ? 'up' : n < 0 ? 'down' : 'none', text: `${n}%` };
    }
    return null;
  }

  const [mounted, setMounted] = useState(false);
  // Calling setState synchronously here is intentional to mark the
  // component as mounted for client-only rendering of certain UI.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const parsed = parseTrend(trend);
  return (
    <Card
      className={cn('group', onClick ? 'cursor-pointer' : '', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <div
            className={cn('flex h-10 w-10 items-center justify-center rounded-full', toneStyles[tone])}
            role="img"
            aria-label={`${title} icon`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {loading || !mounted ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div>
            <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl" role="status" aria-live="polite">
              {value}
              {unit ? <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span> : null}
            </p>
            {Array.isArray(sparkline) && sparkline.length > 0 ? (
              <div className="mt-2 h-8 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkline.map((v, i) => ({ x: i, y: v }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Line type="monotone" dataKey="y" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-6 w-20" />
          ) : parsed ? (
            <Badge variant="outline" aria-label={`Tendencia ${parsed.text}`}>
              {parsed.direction === 'up' ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <ArrowUp className="h-3 w-3" /> {parsed.text}
                </span>
              ) : parsed.direction === 'down' ? (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <ArrowDown className="h-3 w-3" /> {parsed.text}
                </span>
              ) : (
                <span>{parsed.text}</span>
              )}
            </Badge>
          ) : trend ? (
            <Badge variant="outline">{trend}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Sem alteracoes recentes</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
