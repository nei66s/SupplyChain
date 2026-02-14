'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePilotStore } from '@/lib/pilot/store';
import { Role } from '@/lib/pilot/types';
import { roleLabel } from '@/lib/pilot/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setCurrentRole = usePilotStore((state) => state.setCurrentRole);

  const [email, setEmail] = useState('demo@supplyflow.local');
  const [password, setPassword] = useState('demo');
  const [role, setRole] = useState<Role>('Seller');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setCurrentRole(role);
    toast({
      title: 'Sessao de demonstracao iniciada',
      description: `Perfil ativo: ${roleLabel(role)}.`,
    });
    router.push('/dashboard');
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
              <div className="grid gap-3 border-t border-border/70 pt-4">
                <Label>Perfil para simular</Label>
                <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">{roleLabel('Admin')}</SelectItem>
                    <SelectItem value="Manager">{roleLabel('Manager')}</SelectItem>
                    <SelectItem value="Seller">{roleLabel('Seller')}</SelectItem>
                    <SelectItem value="Input Operator">{roleLabel('Input Operator')}</SelectItem>
                    <SelectItem value="Production Operator">{roleLabel('Production Operator')}</SelectItem>
                    <SelectItem value="Picker">{roleLabel('Picker')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
