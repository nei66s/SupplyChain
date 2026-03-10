'use client';

import React, { useState } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Zap, ArrowRight, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthUser } from '@/hooks/use-auth';

export default function BillingPage() {
    const { user, refresh } = useAuthUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSetupSubscription = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/billing/setup-subscription', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Falha ao iniciar assinatura');

            // Redirect to Asaas Invoice or show Pix QR Code
            // For now, we'll just refresh or tell the user it was created
            if (data.invoiceUrl) {
                window.location.href = data.invoiceUrl;
            } else {
                await refresh();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const isSubscribed = user?.subscriptionStatus === 'ACTIVE';

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white">Assinatura & Faturamento</h1>
                <p className="text-slate-500 dark:text-slate-400">Gerencie seu plano e visualize o status do seu pagamento.</p>
            </div>

            {isSubscribed ? (
                <div className="p-8 rounded-[32px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-400">Plano Ativo</h3>
                        <p className="text-emerald-700/70 dark:text-emerald-500/70">Sua assinatura está em dia. Você tem acesso total a todos os módulos.</p>
                    </div>
                </div>
            ) : (
                <div className="grid md:grid-cols-5 gap-8">
                    <div className="md:col-span-3 space-y-6">
                        <div className="p-8 rounded-[40px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Zap className="w-24 h-24 text-indigo-500" />
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div className="space-y-1">
                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Plano Atual</span>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">Operação Total</h2>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-900 dark:text-white">R$ 300</span>
                                    <span className="text-slate-500 font-medium">/ mês</span>
                                </div>

                                <ul className="space-y-3">
                                    {[
                                        'Reservas em Tempo Real Ilimitadas',
                                        'IA Preditiva de MRP inclusa',
                                        'Dashboards & BI em Tempo Real',
                                        'Suporte Prioritário Via WhatsApp'
                                    ].map(f => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {f}
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    size="lg"
                                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                                    onClick={handleSetupSubscription}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>Assinar Agora <ArrowRight className="ml-2 w-5 h-5" /></>
                                    )}
                                </Button>

                                {error && <p className="text-xs text-red-500 text-center font-bold">{error}</p>}
                            </div>
                        </div>

                        <div className="p-6 rounded-[32px] bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500">
                                <QrCode className="w-5 h-5" />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Você será redirecionado para o portal de pagamento seguro para gerar seu **Pix** ou inserir seu **Cartão**.
                            </p>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <div className="p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 space-y-4">
                            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-indigo-500" /> Histórico
                            </h4>
                            <div className="text-center py-8 space-y-2">
                                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-400">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Nenhuma fatura gerada ainda.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
