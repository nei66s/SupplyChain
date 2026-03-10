'use client';

import * as React from 'react';
import { LegalLayout } from '@/components/landing/LegalLayout';
import { ShieldCheck, Lock, Cloud, Users, ShieldAlert, FileText, ChevronRight } from 'lucide-react';

const securityFeatures = [
    {
        title: 'Criptografia de Dados',
        desc: 'Todos os dados sensíveis são criptografados em repouso usando AES-256 e em trânsito via TLS 1.3/HTTPS.',
        icon: <Lock className="h-6 w-6 text-indigo-500" />
    },
    {
        title: 'Infraestrutura Cloud-Ready',
        desc: 'Hospedagem em data centers de classe mundial com redundância geográfica e backups automáticos diários.',
        icon: <Cloud className="h-6 w-6 text-indigo-500" />
    },
    {
        title: 'Controle de Acesso (RBAC)',
        desc: 'Permissões granulares garantem que cada operador tenha acesso apenas ao necessário para sua função.',
        icon: <Users className="h-6 w-6 text-indigo-500" />
    },
    {
        title: 'Logs de Auditoria',
        desc: 'Todas as movimentações críticas de estoque e alterações de sistema são registradas com carimbo de tempo e autor.',
        icon: <FileText className="h-6 w-6 text-indigo-500" />
    }
];

export default function SecurityPage() {
    return (
        <LegalLayout title="Segurança da Informação">
            <div className="space-y-12 pb-20">
                <section className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <ShieldCheck className="h-3 w-3" /> Camada de Proteção Enterprise
                    </div>
                    <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white">
                        Como protegemos sua operação
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                        Na <strong>Black Tower X</strong>, a segurança não é uma funcionalidade adicional, é o alicerce de tudo o que construímos.
                        Sabemos que o Inventário Ágil lida com o coração financeiro e logístico da sua empresa, por isso aplicamos padrões de nível bancário em nossa infraestrutura.
                    </p>
                </section>

                {/* Technical Pillars */}
                <div className="grid sm:grid-cols-2 gap-6">
                    {securityFeatures.map((f) => (
                        <div key={f.title} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-500/30 transition-all">
                            <div className="mb-4">{f.icon}</div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                {/* Detailed Sections */}
                <section className="space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldAlert className="h-6 w-6 text-amber-500" /> Conformidade & LGPD
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            O Inventário Ágil foi projetado para estar em conformidade total com a Lei Geral de Proteção de Dados (LGPD).
                            Garantimos o direito dos titulares dos dados e mantemos políticas rígidas de retenção e exclusão de informações.
                        </p>
                        <ul className="space-y-3 pl-4">
                            {[
                                "Isolamento de dados entre clientes (Multi-tenancy seguro)",
                                "Monitoramento de ameaças 24/7",
                                "Política de Cookies transparente",
                                "Acordo de Nível de Serviço (SLA) de disponibilidade superior a 99.9%"
                            ].map(item => (
                                <li key={item} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <ChevronRight className="h-3 w-3 text-indigo-500" /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-8 rounded-3xl bg-indigo-600 text-white space-y-4">
                        <h3 className="text-xl font-bold">Relatório de Vulnerabilidades</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed">
                            Se você é um pesquisador de segurança e encontrou uma vulnerabilidade, pedimos que entre em contato diretamente conosco pelo canal de segurança para uma correção responsável.
                        </p>
                        <div>
                            <a href="mailto:security@blacktowerx.com.br" className="inline-block px-6 py-3 rounded-xl bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-colors">
                                Contactar Time de Segurança
                            </a>
                        </div>
                    </div>
                </section>

                <section className="pt-10">
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                        Última atualização: 10 de Março de 2026. A Black Tower X reserva-se o direito de atualizar estas medidas conforme as melhores práticas da indústria evoluem.
                    </p>
                </section>
            </div>
        </LegalLayout>
    );
}
