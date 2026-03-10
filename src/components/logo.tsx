"use client";

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSiteBranding } from '@/hooks/use-site-branding';

export function Logo({ className, hideText = false, size = 'md', isPlatform = false }: { className?: string; hideText?: boolean; size?: 'sm' | 'md' | 'lg', isPlatform?: boolean }) {
  const { branding: fetchedBranding } = useSiteBranding();

  const platformBranding = {
    companyName: 'Black Tower X',
    platformLabel: 'Inventário Ágil',
    logoSrc: '/black-tower-x-transp.png',
  };

  const branding = isPlatform ? platformBranding : fetchedBranding;

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  const textSizes = {
    sm: { main: 'text-sm', sub: 'text-[9px]' },
    md: { main: 'text-base', sub: 'text-[11px]' },
    lg: { main: 'text-xl', sub: 'text-sm' },
  };

  return (
    <div className={cn(
      'flex items-center gap-3 text-primary transition-all duration-500 ease-in-out',
      className
    )}>
      <div className={cn(

        "relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 flex-shrink-0 shadow-sm transition-transform hover:scale-105",
        iconSizes[size]
      )}>
        <Image
          src={branding.logoSrc}
          alt={`${branding.companyName} logo`}
          fill
          sizes="64px"
          className="object-contain p-1"
        />
      </div>
      {!hideText && (
        <div className="leading-tight">
          <span className={cn("block font-black font-headline tracking-tighter text-slate-900 dark:text-white truncate max-w-[200px]", textSizes[size].main)}>
            {branding.companyName}
          </span>
          <span className={cn("block uppercase font-bold tracking-[0.15em] text-indigo-600 dark:text-indigo-400 truncate", textSizes[size].sub)}>
            {branding.platformLabel}
          </span>
        </div>
      )}
    </div>
  );
}
