"use client";

import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-primary', className)}>
      <img src="/logo.png" alt="SupplyChain" className="h-9 w-auto rounded-md" />
      <div className="leading-tight">
        <span className="block text-base font-bold font-headline">São José Cordas</span>
        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Plataforma de Operacoes</span>
      </div>
    </div>
  );
}
