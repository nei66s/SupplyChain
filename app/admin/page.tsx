'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/use-auth';
import { Role } from '@/lib/domain/types';
import { roleLabel } from '@/lib/domain/i18n';

type AccountForm = {
  name: string;
  email: string;
  role: Role;
  password: string;
};

type AccountRecord = { id: string; name: string; email: string; role: string };
type ApiUsersList = { users: AccountRecord[]; message?: string };
type ApiUserCreationResponse = { user: AccountRecord; message?: string };
type ApiUserUpdateResponse = { user: AccountRecord; message?: string };

const roleOptions: Role[] = ['Admin', 'Manager', 'Seller', 'Input Operator', 'Production Operator', 'Picker'];

export default function AdminPage() {
  const { user: authUser, loading: authLoading } = useAuthUser();
  const { toast } = useToast();
  const [users, setUsers] = useState<AccountRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [form, setForm] = useState<AccountForm>({
    name: '',
    email: '',
    role: 'Seller',
    password: '',
  });
  const [creating, setCreating] = useState(false);
  const [roleSelection, setRoleSelection] = useState<Record<string, Role>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingBranding, setLoadingBranding] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!authUser || authUser.role !== 'Admin') return;
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users', { cache: 'no-store' });
      const result = (await response.json()) as ApiUsersList;
      if (!response.ok) {
        throw new Error(result.message ?? 'Nao foi possivel listar usuarios');
      }
      setUsers(result.users ?? []);
      setRoleSelection(
        Object.fromEntries((result.users ?? []).map((user) => [user.id, user.role as Role]))
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Tente novamente em breve.';
      toast({
        title: 'Erro ao buscar usuarios',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let active = true;
    fetch('/api/site', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Nao foi possivel carregar a marca');
        }
        return (await response.json()) as { companyName: string; logoDataUrl: string | null };
      })
      .then((payload) => {
        if (!active) return;
        setCompanyName(payload.companyName || 'Black Tower X');
        setLogoDataUrl(payload.logoDataUrl);
        setLogoFileName(payload.logoDataUrl ? 'Logo salvo' : null);
        setLoadingBranding(false);
      })
      .catch(() => {
        if (!active) return;
        setCompanyName((prev) => prev || 'Black Tower X');
        setLoadingBranding(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoDataUrl(result);
      setLogoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSiteSettingsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser) return;

    const nextCompanyName = companyName.trim();
    if (!nextCompanyName) {
      toast({
        title: 'Nome vazio',
        description: 'Informe o nome da empresa antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    if (!logoDataUrl) {
      toast({
        title: 'Logo necessário',
        description: 'Faça upload do logo para salvar a identidade.',
        variant: 'destructive',
      });
      return;
    }

    setSavingSettings(true);
    const payload: Record<string, unknown> = {
      companyName: nextCompanyName,
      platformLabel: 'Plataforma SaaS',
      logoDataUrl,
    };

    try {
      const response = await fetch('/api/site', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? 'Nao foi possivel atualizar a marca');
      }
      setCompanyName(result.companyName);
      setLogoDataUrl(result.logoDataUrl ?? null);
      setLogoFileName(result.logoDataUrl ? 'Logo enviado' : null);
      toast({
        title: 'Marca atualizada',
        description: 'Nome e logo personalizados foram salvos.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Verifique os dados e tente novamente.';
      toast({
        title: 'Erro ao atualizar marca',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authUser) return;
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
    if (!authUser) return;
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

  const previewLogo = logoDataUrl ?? '/black-tower-x-transp.png';
  const previewCompanyName = loadingBranding ? 'Carregando...' : companyName || 'Black Tower X';

  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Perfis</CardTitle>
          <CardDescription>Validando permissao...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!authUser || authUser.role !== 'Admin') {
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
          <CardTitle className="font-headline">Marca personalizada</CardTitle>
          <CardDescription>
            Defina o nome exibido aos operadores e um logo atualizado somente via upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSiteSettingsSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="site-company-name">Nome da empresa</Label>
              <Input
                id="site-company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="site-logo-file">Upload do logo</Label>
              <input
                ref={fileInputRef}
                id="site-logo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoFileChange}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Selecionar arquivo
                </Button>
                <span className="text-sm text-muted-foreground">
                  {logoFileName ?? 'Nenhum arquivo selecionado'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  setLogoDataUrl(null);
                  setLogoFileName(null);
                }}
              >
                Limpar logo
              </Button>
            </div>
            <div className="md:col-span-2">
              <Button className="w-full sm:w-auto" type="submit" disabled={savingSettings}>
                {savingSettings ? 'Salvando identidade...' : 'Salvar identidade'}
              </Button>
            </div>
          </form>
          <div className="rounded-2xl border border-border/70 bg-muted p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pré-visualização</p>
            <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="relative h-12 w-12 rounded-lg border border-border/70 bg-card/50 p-2">
                <Image
                  src={previewLogo}
                  alt="Preview do logo"
                  fill
                  sizes="48px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div>
                <p className="text-sm font-semibold">{companyName}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Plataforma SaaS</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Shield className="h-5 w-5" /> Administracao de contas
          </CardTitle>
          <CardDescription>Crie contas, redefina senhas e atribua roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
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
            <div className="md:col-span-2">
              <Button className="w-full sm:w-auto" type="submit" disabled={creating}>
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
                className="flex flex-col items-start gap-3 rounded-md border border-border/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{account.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Select
                    value={roleSelection[account.id] ?? (account.role as Role)}
                    onValueChange={(value) =>
                      setRoleSelection((prev) => ({ ...prev, [account.id]: value as Role }))
                    }
                    disabled={account.id === authUser.id}
                  >
                    <SelectTrigger className="w-full sm:w-40">
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
                    className="w-full sm:w-auto"
                    size="sm"
                    onClick={() => handleRoleUpdate(account.id)}
                    disabled={account.id === authUser.id || updatingId === account.id}
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
