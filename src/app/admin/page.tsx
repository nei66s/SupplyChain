'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Shield, UserX, Trash2, CheckCircle, Save, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuthUser } from '@/hooks/use-auth';
import { useSiteBranding } from '@/hooks/use-site-branding';
import { Role } from '@/lib/domain/types'; // Role is still needed for AccountForm and roleOptions
import { roleLabel } from '@/lib/domain/i18n';

type AccountForm = {
  name: string;
  email: string;
  role: Role;
  password: string;
};

type AccountRecord = { id: string; name: string; email: string; role: string; isBlocked?: boolean };
type ApiUsersList = { users: AccountRecord[]; message?: string };
type ApiUserCreationResponse = { user: AccountRecord; message?: string };
type ApiUserUpdateResponse = { user: AccountRecord; message?: string };

const roleOptions: Role[] = ['Admin', 'Manager', 'Seller', 'Input Operator', 'Production Operator', 'Picker'];

export default function AdminPage() {
  const { user: authUser, loading: authLoading } = useAuthUser();
  const { toast } = useToast();
  const { branding, refreshBranding } = useSiteBranding();
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
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
        return (await response.json()) as { companyName: string; document?: string; phone?: string; address?: string; logoDataUrl: string | null };
      })
      .then((payload) => {
        if (!active) return;
        setCompanyName(payload.companyName || branding.companyName);
        setDocument(payload.document || '');
        setPhone(payload.phone || '');
        setAddress(payload.address || '');
        setLogoDataUrl(payload.logoDataUrl);
        setLogoFileName(payload.logoDataUrl ? 'Logo salvo' : null);
      })
      .catch(() => {
        if (!active) return;
        setCompanyName((prev) => prev || branding.companyName);
      });
    return () => {
      active = false;
    };
  }, [branding.companyName]);

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
      document: document.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      platformLabel: 'Inventário Ágil',
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
      setDocument(result.document || '');
      setPhone(result.phone || '');
      setAddress(result.address || '');
      setLogoDataUrl(result.logoDataUrl ?? null);
      setLogoFileName(result.logoDataUrl ? 'Logo enviado' : null);

      // Refresh global branding state/cache
      refreshBranding();

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

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    if (!authUser) return;
    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !currentBlocked }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? 'Nao foi possivel atualizar o status do usuario');
      }
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, isBlocked: result.user.isBlocked } : user))
      );
      toast({
        title: !currentBlocked ? 'Usuario bloqueado' : 'Usuario desbloqueado',
        description: `O acesso do usuario foi ${!currentBlocked ? 'bloqueado' : 'restaurado'}.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Tente novamente em breve.';
      toast({
        title: 'Erro ao alterar status',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!authUser) return;
    if (!confirm('Tem certeza que deseja excluir este usuario? Essa acao nao pode ser desfeita.')) return;
    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? 'Nao foi possivel excluir o usuario');
      }
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      toast({
        title: 'Usuario excluido',
        description: 'O usuario foi removido com sucesso.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Tente novamente em breve.';
      toast({
        title: 'Erro ao excluir usuario',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const sortedUsers = useMemo(() => {
    let result = [...users];
    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery));
    }
    return result.sort((a, b) => a.email.localeCompare(b.email));
  }, [users, searchTerm]);

  const previewLogo = logoDataUrl ?? '/black-tower-x-transp.png';

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
          <CardTitle className="font-headline">Informações da empresa</CardTitle>
          <CardDescription>
            Defina as informações exibidas aos operadores na plataforma e relatórios, e o logo atualizado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSiteSettingsSubmit}>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="site-company-name">Nome da empresa</Label>
              <Input
                id="site-company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="site-document">CNPJ / CPF</Label>
              <Input
                id="site-document"
                value={document}
                onChange={(event) => setDocument(event.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="site-phone">Telefone / Contato</Label>
              <Input
                id="site-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="site-address">Endereço completo</Label>
              <Input
                id="site-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Rua, Número - Bairro, Cidade - Estado, CEP"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventário Ágil</p>
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
          <CardDescription>Crie contas e gerencie os usuarios cadastrados e suas permissoes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Nova conta</h3>
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
          </div>

          <hr className="border-border/50" />

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Usuarios cadastrados</h3>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-9 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loadingUsers && <p className="text-sm text-muted-foreground">Carregando usuarios...</p>}
            {!loadingUsers && sortedUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum usuario listado.</p>
            )}
            <div className="grid grid-cols-1 gap-3">
              {sortedUsers.map((account) => {
                const isAuthUser = account.id === authUser?.id;
                const isRoleChanged = roleSelection[account.id] !== undefined && roleSelection[account.id] !== account.role;

                return (
                  <div
                    key={account.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/5 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400 font-bold shrink-0">
                        {account.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-bold text-slate-900 dark:text-slate-100 ${account.isBlocked ? 'line-through text-muted-foreground' : ''}`}>
                          {account.name} {isAuthUser && '(Você)'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="truncate text-[11px] text-muted-foreground">{account.email}</p>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider">
                            {roleLabel(account.role as Role)}
                          </Badge>
                          {account.isBlocked && <Badge variant="destructive" className="h-4 text-[9px]">Bloqueado</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t pt-3 sm:border-t-0 sm:pt-0">
                      <div className="flex-1 sm:flex-none">
                        <Select
                          value={roleSelection[account.id] ?? (account.role as Role)}
                          onValueChange={(value) =>
                            setRoleSelection((prev) => ({ ...prev, [account.id]: value as Role }))
                          }
                          disabled={isAuthUser || updatingId === account.id}
                        >
                          <SelectTrigger className="h-9 w-full sm:w-36 text-xs font-semibold">
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

                      <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                        {isRoleChanged && (
                          <Button
                            variant="default"
                            size="icon"
                            className="h-9 w-9 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleRoleUpdate(account.id)}
                            disabled={updatingId === account.id}
                            title="Salvar alteração de cargo"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant={account.isBlocked ? "outline" : "ghost"}
                          size="icon"
                          className={cn("h-9 w-9", !account.isBlocked && "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20")}
                          onClick={() => handleToggleBlock(account.id, !!account.isBlocked)}
                          disabled={isAuthUser || updatingId === account.id}
                          title={account.isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
                        >
                          {account.isBlocked ? <CheckCircle className="h-4 w-4 text-green-600" /> : <UserX className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleDelete(account.id)}
                          disabled={isAuthUser || updatingId === account.id}
                          title="Excluir usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
