// Server component by default in Next.js 15

import { Check, Zap, AlertCircle, ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const features = [
    'Reservas em Tempo Real Ilimitadas',
    'IA Preditiva de MRP inclusa',
    'Picking Digital via QR Code',
    'BI & Dashboards em Tempo Real',
    'Até 500 SKUs ativos',
    'Suporte Prioritário Via WhatsApp',
    'Treinamento de Equipe Onboarding',
    'Cloud Hosting redundante',
];

export function LandingPricing() {
    return (
        <section id="pricing" className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden">
            {/* Abstract Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 opacity-50">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                        Investimento & Retorno
                    </h2>
                    <h3 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white">
                        Preço transparente para operações que pensam grande
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Não é um custo, é uma economia. Reduza desperdícios e aumente sua capacidade produtiva desde o primeiro dia.
                    </p>
                </div>

                <div className="grid lg:grid-cols-5 gap-8 items-center">
                    {/* Value Comparison Card */}
                    <div className="lg:col-span-2 p-8 rounded-[32px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
                        <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-500" /> O Valor da Escala
                        </h4>

                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-red-100 dark:border-red-900/30">
                                <span className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 block">Sem o Inventário Ágil</span>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" /> Rupturas de estoque inesperadas
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" /> Erros de separação manual (Picking)
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" /> Vendas perdidas por falta de reserva
                                    </li>
                                </ul>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 shadow-lg">
                                <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2 block">Com o Inventário Ágil</span>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-sm">
                                        <Check className="h-4 w-4 text-emerald-400 mt-0.5" /> IA Preditiva reduz estoque ocioso em até 35%
                                    </li>
                                    <li className="flex items-start gap-2 text-sm">
                                        <Check className="h-4 w-4 text-emerald-400 mt-0.5" /> Precisão de 99.9% no Picking Digital
                                    </li>
                                    <li className="flex items-start gap-2 text-sm">
                                        <Check className="h-4 w-4 text-emerald-400 mt-0.5" /> Operação sincronizada Venda-Produção-Estoque
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-sm italic text-slate-500 dark:text-slate-400">
                                &quot;O sistema se pagou em menos de 15 dias só eliminando erros de expedição.&quot; — Empresa Parceira
                            </p>
                        </div>
                    </div>

                    {/* Main Pricing Card */}
                    <div className="lg:col-span-3 h-full">
                        <div className="relative h-full group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[40px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative h-full p-8 md:p-12 rounded-[40px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-2xl flex flex-col">

                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-4">
                                            <Star className="h-3 w-3 fill-current" /> Plano Operação Total
                                        </div>
                                        <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white">Tudo Incluído</h4>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-baseline justify-end gap-1">
                                            <span className="text-xl font-bold text-slate-500 capitalize">R$</span>
                                            <span className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white">300</span>
                                        </div>
                                        <p className="text-slate-500 font-medium">por mês</p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 mb-10">
                                    {features.map((feature, _i) => (
                                        <div key={feature} className="flex items-center gap-3">
                                            <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <span className="text-slate-600 dark:text-slate-300 font-medium text-sm">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto space-y-4">
                                    <Button size="lg" className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold shadow-xl shadow-indigo-500/20 transform transition-all active:scale-95" asChild>
                                        <Link href="/register">
                                            Começar Agora <ArrowRight className="ml-2 h-6 w-6" />
                                        </Link>
                                    </Button>
                                    <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                                        Sem taxas de implantação. Cancele quando quiser.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
