'use client';

import { useEffect, useState } from 'react';
import { UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/use-auth';

type ProfilePatchResponse = {
  user: { id: string; name: string; email: string; role: string; avatarUrl?: string };
  message?: string;
};

export default function ProfilePage() {
  const { user: authUser, loading: authLoading, refresh } = useAuthUser();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (authUser) {
      setName(authUser.name);
      setEmail(authUser.email);
      setAvatarUrl(authUser.avatarUrl ?? '');
      setPreviewUrl(authUser.avatarUrl ?? null);
      setPassword('');
    }
  }, [authUser]);

  useEffect(() => {
    if (!localFile) return;
    const url = URL.createObjectURL(localFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authUser) return;
    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Nome e e-mail sao obrigatorios.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        avatarUrl: avatarUrl.trim(),
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      const response = await fetch(`/api/users/${authUser.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ProfilePatchResponse;
      if (!response.ok) {
        throw new Error(result.message ?? 'Nao foi possivel atualizar');
      }

      await refresh();
      setPassword('');

      toast({
        title: 'Perfil atualizado',
        description: 'Seus dados foram sincronizados com o banco.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Tente novamente em instantes.';
      toast({
        title: 'Erro ao salvar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meu perfil</CardTitle>
          <CardDescription>Carregando informacoes...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!authUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meu perfil</CardTitle>
          <CardDescription>Voce precisa entrar com uma conta para acessar esta pagina.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <UserCircle2 className="h-5 w-5" /> Meu perfil
          </CardTitle>
          <CardDescription>Atualize seus dados pessoais e senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
            <div className="grid gap-2">
              <Label>Foto de perfil</Label>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="preview" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <UserCircle2 className="h-20 w-20 text-muted-foreground" />
                )}
                <div className="flex flex-col gap-2">
                  <input
                    id="file-avatar"
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file || !authUser) return;
                      setLocalFile(file);
                      setUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append('avatar', file);
                        const res = await fetch(`/api/users/${authUser.id}/avatar`, {
                          method: 'POST',
                          body: fd,
                          credentials: 'include',
                        });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.message || 'Upload falhou');
                        setAvatarUrl(json.avatarUrl ?? '');
                        setPreviewUrl(json.avatarUrl ?? previewUrl);
                        toast({ title: 'Upload concluido' });
                      } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : 'Erro no upload';
                        toast({ title: 'Erro', description: message, variant: 'destructive' });
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Nome completo</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {/* avatar URL input removed; upload flow handles avatar */}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="profile-password">Nova senha (deixe em branco para manter)</Label>
              <Input id="profile-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <Badge variant="outline">{authUser.role}</Badge>
              <span className="text-sm text-muted-foreground">Perfil vinculado ao banco de dados</span>
            </div>
            <div className="md:col-span-2">
              <Button className="w-full sm:w-auto" type="submit" disabled={saving}>
                Salvar perfil
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administracao de contas</CardTitle>
          <CardDescription>Crie roles, redefina senhas e gerencie perfis apenas pela pagina Admin (somente administradores).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Use a rota /admin para trabalhar com contas e permissões.</p>
          <p>Somente o perfil Admin pode criar novos usuarios e definir roles.</p>
        </CardContent>
      </Card>
    </div>
  );
}
