'use client';

import * as React from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { CheckCircle2, Clock, Rocket, ArrowRight, Lightbulb, Zap, Smartphone, ShieldCheck, BarChart3, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const roadmapData = [
    {
        status: 'released',
        title: 'Lançado & Estável',
        description: 'Funcionalidades core que já estão transformando armazéns hoje.',
        icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
        items: [
            {
                name: 'WMS Core - Realtime',
                desc: 'Controle total de movimentações com latência zero.',
                icon: <Zap className="h-4 w-4" />
            },
            {
                name: 'Picking Digital QR Code',
                desc: 'Eliminação total de papel na separação de pedidos.',
                icon: <Smartphone className="h-4 w-4" />
            },
            {
                name: 'IA Preditiva de MRP',
                desc: 'Cálculo inteligente de necessidade de compra e produção.',
                icon: <Rocket className="h-4 w-4" />
            },
            {
                name: 'Segurança Enterprise',
                desc: 'Logs de auditoria e permissões granulares por cargo.',
                icon: <ShieldCheck className="h-4 w-4" />
            }
        ]
    },
    {
        status: 'in-progress',
        title: 'Em Desenvolvimento',
        description: 'O que nosso time está construindo agora para o próximo trimestre.',
        icon: <Clock className="h-6 w-6 text-indigo-500 animate-pulse" />,
        items: [
            {
                name: 'Módulo de Billing SaaS',
                desc: 'Gestão de assinaturas, faturamento e notas fiscais automáticas.',
                icon: <BarChart3 className="h-4 w-4" />
            },
            {
                name: 'App Mobile v2',
                desc: 'Experiência nativa offline-first para coletores de dados.',
                icon: <Smartphone className="h-4 w-4" />
            },
            {
                name: 'API Pública de Integração',
                desc: 'Conecte o Inventário Ágil ao seu ERP ou E-commerce.',
                icon: <Globe className="h-4 w-4" />
            }
        ]
    },
    {
        status: 'planned',
        title: 'Planejado para Futuro',
        description: 'Nossa visão de longo prazo para uma logística autônoma.',
        icon: <Lightbulb className="h-6 w-6 text-amber-500" />,
        items: [
            {
                name: 'Otimização de Rotas via IA',
                desc: 'Redução de custos de frete com roteirização inteligente.',
                icon: <Zap className="h-4 w-4" />
            },
            {
                name: 'Visão Computacional no Checkout',
                desc: 'Conferência automática de itens via câmera.',
                icon: <Rocket className="h-4 w-4" />
            },
            {
                name: 'Digital Twin do Armazém',
                desc: 'Visualização 3D em tempo real da ocupação do prédio.',
                icon: <BarChart3 className="h-4 w-4" />
            }
        ]
    }
];

export default function RoadmapPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
            <LandingHeader />

            <main className="flex-1 pt-32 pb-24">
                {/* Hero Section */}
                <section className="max-w-7xl mx-auto px-6 mb-20 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
                        <Rocket className="h-3 w-3" /> Evolução Contínua
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tight text-slate-900 dark:text-white mb-6">
                        Nossa jornada para a <br /><span className="text-indigo-600">Logística do Futuro</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Transparência é um dos nossos valores. Acompanhe o que já construímos e o que estamos preparando para transformar sua operação.
                    </p>
                </section>

                {/* Roadmap Timeline */}
                <section className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Desktop Connector Line */}
                        <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 -z-10" />

                        {roadmapData.map((phase, _idx) => (
                            <div key={phase.status} className="space-y-8">
                                <div className="bg-white dark:bg-slate-950 p-2 inline-block relative z-10">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110",
                                        phase.status === 'released' ? "bg-emerald-50 dark:bg-emerald-900/20" :
                                            phase.status === 'in-progress' ? "bg-indigo-50 dark:bg-indigo-900/20" :
                                                "bg-amber-50 dark:bg-amber-900/20"
                                    )}>
                                        {phase.icon}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{phase.title}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {phase.description}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {phase.items.map((item) => (
                                        <div
                                            key={item.name}
                                            className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-500/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-3 mb-1 text-slate-900 dark:text-slate-200">
                                                <div className="text-indigo-500 group-hover:scale-110 transition-transform">
                                                    {item.icon}
                                                </div>
                                                <h3 className="font-bold text-sm tracking-tight">{item.name}</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 pl-7 leading-relaxed uppercase font-medium">
                                                {item.desc}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Bottom CTA */}
                <section className="max-w-4xl mx-auto px-6 mt-32">
                    <div className="p-8 md:p-12 rounded-[40px] bg-indigo-600 text-white text-center space-y-8 relative overflow-hidden shadow-2xl shadow-indigo-500/30">
                        {/* Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                        <div className="relative z-10 space-y-4">
                            <h2 className="text-3xl md:text-4xl font-bold font-headline">Tem uma sugestão de funcionalidade?</h2>
                            <p className="text-indigo-100 text-lg">
                                Construímos o Inventário Ágil ouvindo quem está no chão de fábrica e no armazém.
                            </p>
                            <div className="pt-4">
                                <Button size="lg" variant="secondary" className="h-14 px-8 rounded-2xl font-bold bg-white text-indigo-600 hover:bg-slate-100 group" asChild>
                                    <Link href="mailto:contato@blacktowerx.com.br">
                                        Enviar Sugestão <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <LandingFooter />
        </div>
    );
}
