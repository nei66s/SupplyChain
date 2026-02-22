'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export type LoginBranding = {
  companyName: string;
  platformLabel: string;
  logoSrc: string;
};

type LoginShellProps = {
  branding: LoginBranding;
};

export function LoginShell({ branding }: LoginShellProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('seller@supplyflow.local');
  const [password, setPassword] = useState('demo');
  const [loading, setLoading] = useState(false);

  const themeIcon = mounted
    ? theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
    : null;

  useEffect(() => {
    const saved = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme =
      saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light';
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('theme', theme);
    try {
      document.cookie = `theme=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    } catch (error) {
      console.error(error);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

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
          description: result.message ?? 'Credenciais invalidas',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sessao iniciada',
        description: `Perfil ativo: ${result.user.name} (${result.user.role}).`,
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('login error', error);
      toast({
        title: 'Erro inesperado',
        description: 'Nao foi possivel entrar no momento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left side - Branding / Decor */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-slate-950 p-12 text-white relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-600/30 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[100px]" />
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="relative h-12 w-12 bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
            <Image
              src="/black-tower-x-transp.png"
              alt="Black Tower X"
              fill
              className="object-contain p-1 dark:brightness-200 dark:invert-0 brightness-0 invert"
              priority
            />
          </div>
          <div>
            <span className="font-bold text-xl tracking-widest block text-slate-100">BLACK TOWER X</span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400 font-medium">Plataforma SaaS</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg mt-auto mb-20">
          <h1 className="text-4xl lg:text-5xl font-light mb-6 leading-tight text-slate-100">
            Gestão inteligente da sua <span className="font-bold text-white">Cadeia de Suprimentos</span>.
          </h1>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-md">
            Plataforma corporativa ágil, eficiente e escalável para o controle moderno do seu inventário.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 text-sm text-slate-300">
            <div className="flex items-center gap-3 bg-white/5 py-2 px-4 rounded-full border border-white/10 backdrop-blur-sm">
              <div className="bg-indigo-500/20 p-1.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
              </div>
              <span className="font-medium">Segurança Enterprise</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 py-2 px-4 rounded-full border border-white/10 backdrop-blur-sm">
              <div className="bg-blue-500/20 p-1.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
              </div>
              <span className="font-medium">Sincronização Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-10 h-10 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 backdrop-blur-md"
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            onClick={toggleTheme}
          >
            {themeIcon}
          </Button>
        </div>

        <div className="w-full max-w-[420px] space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Mobile branding fallback */}
          <div className="flex md:hidden flex-col items-center gap-3 mb-8">
            <div className="relative h-16 w-16 bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <Image
                src="/black-tower-x-transp.png"
                alt="Black Tower X"
                fill
                className="object-contain p-2 dark:brightness-200 dark:invert-0"
                priority
              />
            </div>
            <div className="text-center">
              <span className="font-bold text-base tracking-widest uppercase text-slate-900 dark:text-slate-100 block">Black Tower X</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Plataforma SaaS</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 sm:p-10 border border-slate-200/60 dark:border-slate-800/60 transition-all">
            <div className="flex flex-col items-center space-y-5 mb-10">
              <div className="relative h-14 w-48 mb-2">
                <Image
                  src={branding.logoSrc}
                  alt={`${branding.companyName} logo`}
                  fill
                  sizes="192px"
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl tracking-tight font-semibold text-slate-900 dark:text-white">
                  Inventário Ágil
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {branding.companyName}
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    E-mail Corporativo
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:focus-visible:ring-indigo-400 transition-all"
                    placeholder="voce@empresa.com"
                  />
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Senha
                    </Label>
                    <a href="#" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                      Esqueceu a senha?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 dark:focus-visible:ring-indigo-400 transition-all"
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
                    Acessar Plataforma
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  </span>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-500/80">
            &copy; {new Date().getFullYear()} Black Tower X. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

