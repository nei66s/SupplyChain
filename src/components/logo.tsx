"use client";

import { Factory } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 text-primary',
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10" suppressHydrationWarning>
        <Factory className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <span className="block text-base font-bold font-headline">Empresa</span>
        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Plataforma de Operacoes</span>
      </div>
    </div>
  );
}
