'use client';

import { ArrowRight, PlayCircle, Zap, ShieldCheck, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export function LandingHero() {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[80px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[64px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-3 duration-500">
                            <Zap className="h-3 w-3 fill-current" />
                            IA + Logística Realtime
                        </div>

                        <h1 className="text-5xl md:text-7xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            A próxima geração da <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">Logística Ágil</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
                            Elimine o gap entre a venda e a produção. O Inventário Ágil reserva o seu estoque instantaneamente e usa IA preditiva para nunca deixar sua operação parar.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                            <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 rounded-2xl h-14 px-8 text-lg font-bold" asChild>
                                <Link href="/register">
                                    Testar Grátis <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-2xl h-14 px-8 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-lg font-semibold">
                                <PlayCircle className="mr-2 h-5 w-5" /> Ver Demo
                            </Button>
                        </div>

                        <div className="flex items-center gap-8 pt-4 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-400">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-500">
                                <ShieldCheck className="h-5 w-5 text-indigo-500" /> Cloud Ready
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-500">
                                <BarChart3 className="h-5 w-5 text-indigo-500" /> Analytics 360°
                            </div>
                        </div>
                    </div>

                    <div className="relative animate-in fade-in zoom-in duration-1000">
                        <div className="relative z-10 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-4 shadow-2xl">
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative group">
                                <Image
                                    src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200"
                                    alt="Dashboard Preview"
                                    fill
                                    priority
                                    className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />
                            </div>
                        </div>
                        {/* Decorative elements around image */}
                        <div className="absolute -top-6 -right-6 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl animate-pulse" />
                        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl animate-pulse" />
                    </div>
                </div>
            </div>
        </section>
    );
}
