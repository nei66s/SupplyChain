'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('seller@supplyflow.local');
  const [password, setPassword] = useState('demo');
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
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_360px]">
          <section className="hero min-h-[420px] rounded-[32px] p-8 shadow-xl">
              <div className="hero-inner">
              <div>
                <h2 className="hero-title">Inventário Ágil</h2>
                <p className="hero-subtitle">
                  Plataforma pronta para simular demanda, produção e separação com KPIs acionáveis antes de ligar para um ERP ou sistema legado.
                </p>
                <ul className="hero-ctas mt-6 grid gap-2 text-sm text-primary-foreground/90">
                  <li>⚡ Reservas com TTL e sincronização localStorage</li>
                  <li>🧠 MRP com confirmação manual e justificativas</li>
                  <li>📦 Separadores com impressão de etiquetas e QR codes</li>
                </ul>
                <div className="hero-ctas mt-6 flex flex-wrap gap-3">
                  <Button variant="secondary" className="hero-cta px-6">
                    Ver demo guiada
                  </Button>
                  <Button variant="ghost" className="hero-cta px-6">
                    Explorar fluxo completo
                  </Button>
                </div>
              </div>
              <div className="space-y-3 text-sm text-primary-foreground/80">
                <div>
                  <p className="font-headline text-2xl">12</p>
                  <p>Regras operacionais prontas</p>
                </div>
                <div>
                  <p className="font-headline text-2xl">6</p>
                  <p>Etapas de separação monitoradas</p>
                </div>
                <div>
                  <p className="font-headline text-2xl">99%</p>
                  <p>Casos críticos cobertos pelo piloto</p>
                </div>
              </div>
            </div>
          </section>

          <Card className="mx-auto w-full shadow-lg">
            <CardHeader className="text-center">
              <Logo className="mx-auto mb-4" />
              <CardTitle className="font-headline text-3xl">Acesso corporativo</CardTitle>
              <CardDescription>Acesse os perfis de operador e gestão para testar o fluxo completo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="grid gap-5">
                <div className="grid gap-3">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Entrar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
