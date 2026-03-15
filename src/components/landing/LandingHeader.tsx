'use client';

import * as React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

export function LandingHeader() {
    const [isScrolled, setIsScrolled] = React.useState(false);
    const { theme, toggleTheme, mounted } = useTheme();

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-3 sm:px-6 py-3 sm:py-4',
                isScrolled
                    ? 'bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 py-2 sm:py-3'
                    : 'bg-transparent'
            )}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-8">
                    <Link href="/" className="transition-transform hover:scale-105 active:scale-95 shrink-0">
                        <Logo isPlatform={true} />
                    </Link>
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            Funcionalidades
                        </Link>
                        <Link href="#solutions" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            Soluções
                        </Link>
                        <Link href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            Preços
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                    {mounted ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm h-8 w-8 sm:h-10 sm:w-10"
                            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                            onClick={toggleTheme}
                        >
                            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-100/50 animate-pulse" />
                    )}
                    <Button variant="ghost" asChild className="px-2 sm:px-4 text-xs sm:text-base h-8 sm:h-10">
                        <Link href="/login">Entrar</Link>
                    </Button>
                    <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-3 sm:px-6 text-xs sm:text-base h-8 sm:h-10 whitespace-nowrap">
                        <Link href="/register">Começar<span className="hidden sm:inline">&nbsp;Agora</span></Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
