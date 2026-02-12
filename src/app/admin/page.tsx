'use client';

import { DatabaseZap, RotateCcw, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePilotStore } from '@/lib/pilot/store';
import { roleLabel } from '@/lib/pilot/i18n';

export default function AdminPage() {
  const db = usePilotStore((state) => state.db);
  const resetDemoData = usePilotStore((state) => state.resetDemoData);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><DatabaseZap className="h-5 w-5" /> Piloto somente frontend</CardTitle>
          <CardDescription>
            Backend real (Firebase/Firestore/Functions) esta simulado. O app usa repositorios locais para representar as regras do blueprint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={resetDemoData}><RotateCcw className="mr-2 h-4 w-4" />Resetar dados de demo</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><Shield className="h-5 w-5" /> Perfis</CardTitle>
            <CardDescription>Perfis predefinidos para simular RBAC no piloto.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {db.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant="outline">{roleLabel(user.role)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Unidades de medida e conversoes</CardTitle>
            <CardDescription>Dados obrigatorios iniciais com conversoes opcionais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-2 text-sm font-semibold">Unidades</p>
              <div className="flex flex-wrap gap-2">
                {db.uoms.map((uom) => (
                  <Badge key={uom.id} variant="secondary">{uom.code}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Conversoes opcionais</p>
              {db.uomConversions.map((conv) => (
                <p key={conv.id} className="text-sm text-muted-foreground">{conv.fromUom} {'->'} {conv.toUom} (x{conv.factor})</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
