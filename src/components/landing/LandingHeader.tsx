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
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4',
                isScrolled
                    ? 'bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 py-3'
                    : 'bg-transparent'
            )}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="transition-transform hover:scale-105 active:scale-95">
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
                <div className="flex items-center gap-3">
                    {mounted ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm"
                            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                            onClick={toggleTheme}
                        >
                            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <div className="h-11 w-11 rounded-full bg-slate-100/50 animate-pulse" />
                    )}
                    <Button variant="outline" asChild className="hidden sm:inline-flex border-indigo-600/30 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                        <Link href="/platform/tenants">Super Admin</Link>
                    </Button>
                    <Button variant="ghost" asChild className="hidden sm:inline-flex">
                        <Link href="/login">Entrar</Link>
                    </Button>
                    <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-6">
                        <Link href="/register">Começar Agora</Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
