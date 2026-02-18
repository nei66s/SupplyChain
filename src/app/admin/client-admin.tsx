'use client';

import { useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Role } from '@/lib/domain/types';
import { roleLabel } from '@/lib/domain/i18n';

type AccountForm = {
  name: string;
  email: string;
  role: Role;
  password: string;
};

type AccountRecord = { id: string; name: string; email: string; role: string };
type ApiUserCreationResponse = { user: AccountRecord; message?: string };
type ApiUserUpdateResponse = { user: AccountRecord; message?: string };

const roleOptions: Role[] = ['Admin', 'Manager', 'Seller', 'Input Operator', 'Production Operator', 'Picker'];

type AdminClientProps = {
  currentUser: AccountRecord | null;
  initialUsers: AccountRecord[];
};

export default function AdminClient({ currentUser, initialUsers }: AdminClientProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<AccountRecord[]>(initialUsers);
  const [form, setForm] = useState<AccountForm>({
    name: '',
    email: '',
    role: 'Seller',
    password: '',
  });
  const [creating, setCreating] = useState(false);
  const [roleSelection, setRoleSelection] = useState<Record<string, Role>>(
    Object.fromEntries(initialUsers.map((user) => [user.id, user.role as Role]))
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || currentUser.role !== 'Admin') return;
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Nome, e-mail e senha sao obrigatorios.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as ApiUserCreationResponse;
      if (!response.ok) {
        throw new Error(result.message ?? 'Nao foi possivel criar usuario');
      }
      setUsers((prev) => [...prev, result.user]);
      setRoleSelection((prev) => ({ ...prev, [result.user.id]: result.user.role as Role }));
      setForm({ name: '', email: '', role: 'Seller', password: '' });
      toast({
        title: 'Conta criada',
        description: `Usuario ${result.user.email} cadastrado com role ${roleLabel(result.user.role)}.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Verifique os dados e tente novamente.';
      toast({
        title: 'Erro ao criar conta',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRoleUpdate = async (userId: string) => {
    if (!currentUser || currentUser.role !== 'Admin') return;
    const nextRole = roleSelection[userId];
    if (!nextRole) return;
    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const result = (await response.json()) as ApiUserUpdateResponse;
      if (!response.ok) {
        throw new Error(result.message ?? 'Nao foi possivel atualizar role');
      }
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role: result.user.role } : user))
      );
      toast({
        title: 'Role atualizado',
        description: `Perfil ${result.user.name} agora e ${roleLabel(result.user.role)}.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Tente novamente em breve.';
      toast({
        title: 'Erro ao alterar role',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Administracao</CardTitle>
          <CardDescription>
            Apenas o usuario com role Admin pode ver esta pagina. Entre com a conta apropriada.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Shield className="h-5 w-5" /> Administracao de contas
          </CardTitle>
          <CardDescription>Crie contas, redefina senhas e atribua roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleCreate}>
            <div className="grid gap-2">
              <Label htmlFor="admin-name">Nome</Label>
              <Input
                id="admin-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Senha</Label>
              <Input
                id="admin-password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as Role }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {roleLabel(roleOption)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Button type="submit" disabled={creating}>
                Criar conta
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Usuarios cadastrados</CardTitle>
          <CardDescription>Altere roles rapidamente ou redefina senhas via API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingUsers && <p className="text-sm text-muted-foreground">Carregando usuarios...</p>}
          {!loadingUsers && sortedUsers.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum usuario encontrado.</p>
          )}
          <div className="space-y-2">
            {sortedUsers.map((account) => (
              <div
                key={account.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{account.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={roleSelection[account.id] ?? (account.role as Role)}
                    onValueChange={(value) =>
                      setRoleSelection((prev) => ({ ...prev, [account.id]: value as Role }))
                    }
                    disabled={account.id === currentUser.id}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((roleOption) => (
                        <SelectItem key={roleOption} value={roleOption}>
                          {roleLabel(roleOption)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => handleRoleUpdate(account.id)}
                    disabled={account.id === currentUser.id || updatingId === account.id}
                  >
                    Salvar role
                  </Button>
                </div>
                <Badge variant="outline">{account.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
