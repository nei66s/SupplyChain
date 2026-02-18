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
      <div className="w-full max-w-md space-y-8">
        <Card className="mx-auto max-w-sm">
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-4" />
            <CardTitle className="font-headline text-3xl">Inventário Ágil</CardTitle>
            <CardDescription>Acesso corporativo para simulacao de fluxos da cadeia de suprimentos.</CardDescription>
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
  );
}
