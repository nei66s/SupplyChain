'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function PlatformLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const response = await fetch('/api/platform/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast({
          title: 'Falha ao entrar',
          description: result.message ?? 'Credenciais invalidas',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sessao iniciada',
        description: 'Bem-vindo ao painel da plataforma.',
      });

      const redirectPath = searchParams.get('redirect');
      router.replace(redirectPath || '/platform/tenants');
      router.refresh();
    } catch (error) {
      console.error('platform login error', error);
      toast({
        title: 'Erro inesperado',
        description: 'Nao foi possivel iniciar a sessao neste navegador',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="z-10 w-full max-w-[420px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="rounded-[32px] border border-slate-800/60 bg-[#0b1120]/80 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mb-10 flex flex-col items-center space-y-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-[#0f172a] p-3 shadow-inner">
            <ShieldCheck className="h-8 w-8 text-indigo-500" />
          </div>
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold tracking-tight text-white">
              Acesso Restrito
            </h2>
            <div className="flex flex-col items-center">
              <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                Plataforma
              </span>
              <p className="text-sm font-medium text-slate-400">
                Painel exclusivo do administrador da plataforma
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 text-left">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                E-mail administrativo
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-slate-800 bg-[#0f172a] px-4 text-white placeholder:text-slate-600 transition-colors focus-visible:border-indigo-500 focus-visible:ring-indigo-500"
                placeholder="seu-email-admin@provedor.com"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-slate-800 bg-[#0f172a] px-4 text-white placeholder:text-slate-600 transition-colors focus-visible:border-indigo-500 focus-visible:ring-indigo-500"
                placeholder="********"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-indigo-600 text-base font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? 'Autenticando...' : 'Entrar no Painel Seguro'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function PlatformLoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#020617] p-6 text-slate-200">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-[-10%] top-[-20%] h-[70%] w-[70%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-20%] h-[60%] w-[60%] rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute right-[10%] top-[40%] h-[40%] w-[40%] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
        <Button variant="ghost" asChild className="rounded-full px-4 text-slate-300 hover:bg-white/10 hover:text-white">
          <Link href="/">
            <Home className="h-4 w-4" />
            <span className="text-xs font-semibold">Inicio</span>
          </Link>
        </Button>
      </div>

      <Suspense fallback={<div>Carregando...</div>}>
        <PlatformLoginContent />
      </Suspense>
    </div>
  );
}
