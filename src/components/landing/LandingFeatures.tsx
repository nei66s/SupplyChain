// Server component by default in Next.js 15

import {
    Zap,
    Bot,
    QrCode,
    BarChart4,
    Cloud,
    Lock
} from 'lucide-react';

const features = [
    {
        icon: Zap,
        title: 'Reserva em Tempo Real',
        description: 'Estoque bloqueado no momento da venda. Diga adeus ao erro de vender o que não tem.',
        color: 'bg-amber-500',
    },
    {
        icon: Bot,
        title: 'MRP com Inteligência Artificial',
        description: 'Nossa IA analisa padrões de consumo e sugere reposições automáticas antes que falte.',
        color: 'bg-blue-500',
    },
    {
        icon: QrCode,
        title: 'Picking 100% Digital',
        description: 'Separação de pedidos via QR Code em tempo real. Precisão absoluta no carregamento.',
        color: 'bg-indigo-500',
    },
    {
        icon: BarChart4,
        title: 'BI & Relatórios Avançados',
        description: 'Dashboards completos com giro de estoque, produtividade e curva ABC.',
        color: 'bg-emerald-500',
    },
    {
        icon: Cloud,
        title: 'Web App Otimizado',
        description: 'Acesse de qualquer navegador moderno ou tablet no chão de fábrica.',
        color: 'bg-cyan-500',
    },
    {
        icon: Lock,
        title: 'Trilha de Auditoria Parcial',
        description: 'Bases para controle de acesso restrito (RLS) protegendo seus dados de ponta a ponta.',
        color: 'bg-red-500',
    },
];

export function LandingFeatures() {
    return (
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                        Poder de Fogo
                    </h2>
                    <h3 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white">
                        Tudo o que você precisa para uma logística de elite
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Desenvolvido para operações que não podem parar. Do micro ao macro, o Inventário Ágil entrega performance.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className="group p-8 rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className={`${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-current/20 transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                                <feature.icon className="h-7 w-7" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                                {feature.title}
                            </h4>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
