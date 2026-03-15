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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast({
          title: 'Falha ao entrar',
          description: result.message ?? 'Credenciais inválidas',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sessão iniciada',
        description: `Bem-vindo administrador.`,
      });
      const meResponse = await fetch('/api/auth/me', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!meResponse.ok) {
        throw new Error('Sessão não persistida');
      }
      
      const redirectPath = searchParams.get('redirect');
      
      router.replace(redirectPath || '/platform/tenants');
      router.refresh();
    } catch (error) {
      console.error('login error', error);
      toast({
        title: 'Erro inesperado',
        description: 'Não foi possível iniciar a sessão neste navegador',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] space-y-8 z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="bg-[#0b1120]/80 backdrop-blur-xl shadow-2xl rounded-[32px] p-8 sm:p-10 border border-slate-800/60 text-center">
        <div className="flex flex-col items-center space-y-6 mb-10">
          <div className="relative h-16 w-16 bg-[#0f172a] p-3 rounded-2xl shadow-inner border border-slate-800 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-indigo-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl tracking-tight font-bold text-white font-headline">
              Acesso Restrito
            </h2>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-1">
                Plataforma
              </span>
              <p className="text-sm text-slate-400 font-medium">
                Black Tower X Super Admin
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 text-left">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                E-mail Administrativo
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 px-4 rounded-xl bg-[#0f172a] border-slate-800 text-white focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-colors placeholder:text-slate-600"
                placeholder="admin@blacktowerx.com"
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
                className="h-12 px-4 rounded-xl bg-[#0f172a] border-slate-800 text-white focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-colors placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-base shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Autenticando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Entrar no Painel Seguro
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function PlatformLoginPage() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden text-slate-200">
      {/* Abstract dark mode background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[100px]" />
        <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
        <Button variant="ghost" asChild className="rounded-full flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/10 px-4">
          <Link href="/">
            <Home className="h-4 w-4" />
            <span className="text-xs font-semibold">Início</span>
          </Link>
        </Button>
      </div>

      <Suspense fallback={<div>Carregando...</div>}>
        <PlatformLoginContent />
      </Suspense>
    </div>
  );
}
