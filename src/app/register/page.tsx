'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Building2,
    Mail,
    Lock,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        tenantName: '',
        adminEmail: '',
        adminPassword: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.adminPassword !== formData.confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/tenants/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantName: formData.tenantName,
                    adminEmail: formData.adminEmail,
                    adminPassword: formData.adminPassword
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erro ao realizar cadastro');
            }

            setSuccess(true);
            // Aguarda 3 segundos e redireciona para o login
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/20">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white">
                            Conta Criada com Sucesso!
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Sua instância do <strong>Inventário Ágil</strong> está pronta. <br />
                            Estamos redirecionando você agora...
                        </p>
                    </div>
                    <div className="pt-4">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row overflow-hidden">
            {/* Esquerda: Visual/Branding */}
            <div className="hidden lg:flex w-1/2 bg-indigo-600 relative overflow-hidden items-center justify-center p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800" />
                {/* Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 max-w-lg space-y-8 text-white">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl">
                        <h2 className="text-4xl font-extrabold font-headline leading-tight">
                            Sua logística conectada <br /> ao futuro.
                        </h2>
                    </div>

                    <ul className="space-y-6">
                        {[
                            { icon: Zap, text: "Configuração em menos de 2 minutos." },
                            { icon: ShieldCheck, text: "Segurança de dados isolada (RLS)." },
                            { icon: CheckCircle2, text: "Suporte prioritário na implementação." }
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-4 text-indigo-100 font-medium">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                {item.text}
                            </li>
                        ))}
                    </ul>

                    <div className="pt-8">
                        <p className="text-indigo-200 text-sm italic">
                            &quot;O Inventário Ágil transformou nosso armazém. A visibilidade em tempo real é o que toda empresa moderna precisa.&quot;
                        </p>
                        <p className="mt-2 font-bold">— São José Cordas, Cliente Pioneiro</p>
                    </div>
                </div>
            </div>

            {/* Direita: Formulário */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
                <div className="absolute top-6 left-6 md:top-12 md:left-12">
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" asChild>
                        <Link href="/">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Link>
                    </Button>
                </div>

                <div className="max-w-[420px] w-full space-y-8 relative z-10 mt-8 md:mt-0">
                    <div className="text-center lg:text-left space-y-2">
                        <Link href="/" className="inline-block mb-8">
                            <Logo isPlatform={true} />
                        </Link>
                        <h1 className="text-3xl font-black font-headline text-slate-900 dark:text-white">
                            Crie sua conta
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Comece seu piloto grátis hoje mesmo.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                                Nome da Empresa
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    required
                                    placeholder="Ex: Logística Silva LTDA"
                                    className="pl-10 h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                    value={formData.tenantName}
                                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                                E-mail Administrativo
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    required
                                    type="email"
                                    placeholder="admin@empresa.com"
                                    className="pl-10 h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                    value={formData.adminEmail}
                                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                                    Senha
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        required
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                        value={formData.adminPassword}
                                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                                    Confirmar
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        required
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 mt-4"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    Ativar Minha Conta <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-slate-500">
                        Já tem uma conta?{' '}
                        <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                            Fazer Login
                        </Link>
                    </p>

                    <div className="pt-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
                            Ao se cadastrar, você concorda com nossos <br />
                            <Link href="/terms" className="underline">Termos de Uso</Link> e <Link href="/security" className="underline">Política de Segurança</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
