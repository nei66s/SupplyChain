'use client';

import * as React from 'react';
import { Bell, CheckCircle2, Inbox, PackagePlus, Warehouse } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePilotDerived, usePilotStore } from '@/lib/pilot/store';
import dynamic from 'next/dynamic';
const MrpPanel = dynamic(() => import('@/components/mrp-panel'), { ssr: false });
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { notificationTypeLabel, receiptStatusLabel } from '@/lib/pilot/i18n';

export default function InventoryPage() {
  const db = usePilotStore((state) => state.db);
  const postInventoryReceipt = usePilotStore((state) => state.postInventoryReceipt);
  const countOpenDemands = usePilotStore((state) => state.countOpenDemands);
  const markNotification = usePilotStore((state) => state.markNotification);
  const busyReceipts = usePilotStore((state) => state.busyReceipts);
  const { stockView } = usePilotDerived();

  const receiptsDraft = db.inventoryReceipts.filter((item) => item.status === 'DRAFT');
  const receiptsPosted = db.inventoryReceipts.filter((item) => item.status === 'POSTED');

  const onPostReceipt = (receiptId: string) => {
    const autoAllocate = window.confirm('Autoalocar agora?\nOK = Sim / Cancelar = Nao');
    postInventoryReceipt(receiptId, autoAllocate);
  };

  return (
    <Tabs defaultValue="stock" className="space-y-4">
      <TabsList>
        <TabsTrigger value="stock">Estoque</TabsTrigger>
        <TabsTrigger value="receipts">Recebimentos</TabsTrigger>
        <TabsTrigger value="reservations">Reservas</TabsTrigger>
        <TabsTrigger value="inbox" id="inbox">Inbox</TabsTrigger>
        <TabsTrigger value="mrp">MRP</TabsTrigger>
      </TabsList>

      <TabsContent value="stock">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Saldo de estoque</CardTitle>
            <CardDescription>Em estoque, reservado e disponivel calculados em tempo real no piloto.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Em estoque</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">Disponivel</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockView.map((entry) => {
                  const material = entry.material;
                  const statusVariant = entry.available <= 0 ? 'destructive' : material && entry.available <= material.minStock ? 'warning' : 'positive';

                  return (
                    <TableRow key={entry.materialId}>
                      <TableCell>
                        <p className="font-medium">{material?.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.materialId} - min {material?.minStock} - ponto de pedido {material?.reorderPoint}</p>
                      </TableCell>
                      <TableCell className="text-right">{entry.onHand}</TableCell>
                      <TableCell className="text-right">{entry.reservedTotal}</TableCell>
                      <TableCell className="text-right font-semibold">{entry.available}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={statusVariant}>{statusVariant === 'destructive' ? 'RUPTURA' : statusVariant === 'warning' ? 'BAIXO' : 'OK'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="receipts">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><PackagePlus className="h-5 w-5" /> {receiptStatusLabel('DRAFT')}</CardTitle>
              <CardDescription>Concluir producao cria rascunho; postar confirma entrada com opcao de autoalocar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {receiptsDraft.length === 0 ? (
                <EmptyState icon={PackagePlus} title="Nenhum recebimento em rascunho" description="Recebimentos em preparacao aparecerao aqui." className="min-h-[130px]" />
              ) : (
                receiptsDraft.map((receipt) => {
                  const openDemands = receipt.items.reduce((acc, item) => acc + countOpenDemands(item.materialId), 0);
                  return (
                    <div key={receipt.id} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                      <p className="font-medium">{receipt.id}</p>
                      <p className="text-sm text-muted-foreground">Origem {receipt.sourceRef} - criado em {formatDate(receipt.createdAt)}</p>
                      <p className="text-sm">Ha {openDemands} demandas abertas para os materiais deste recebimento.</p>
                      {receipt.items.map((item) => (
                        <p key={item.materialId} className="text-xs">{item.materialName} - {item.qty} {item.uom}</p>
                      ))}
                      <Button
                        className="mt-2"
                        disabled={Boolean(busyReceipts[receipt.id])}
                        onClick={() => onPostReceipt(receipt.id)}
                      >
                        {busyReceipts[receipt.id] ? 'Processando...' : 'Postar entrada'}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> {receiptStatusLabel('POSTED')}</CardTitle>
              <CardDescription>Historico de recebimentos confirmados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {receiptsPosted.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Nenhum recebimento postado" description="Quando confirmar uma entrada, o historico sera exibido aqui." className="min-h-[130px]" />
              ) : (
                receiptsPosted.map((receipt) => (
                  <div key={receipt.id} className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
                    <p className="font-medium">{receipt.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.autoAllocated ? 'Autoalocado' : 'Sem autoalocacao'} - {formatDate(receipt.postedAt)} - {receipt.postedBy}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="reservations">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Reservas ativas</CardTitle>
            <CardDescription>TTL de 5 minutos com renovacao por heartbeat. Limpeza automatica a cada 30s.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead>Expira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {db.stockReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="border-none py-8">
                      <EmptyState icon={Warehouse} title="Sem reservas no momento" description="As reservas ativas de estoque aparecerao aqui." className="min-h-[120px]" />
                    </TableCell>
                  </TableRow>
                ) : (
                  db.stockReservations.map((reservation) => {
                    const order = db.orders.find((item) => item.id === reservation.orderId);
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell>{reservation.materialId}</TableCell>
                        <TableCell>{order?.orderNumber ?? reservation.orderId}</TableCell>
                        <TableCell>{reservation.userName}</TableCell>
                        <TableCell className="text-right">{reservation.qty}</TableCell>
                        <TableCell>{formatDate(reservation.expiresAt)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="inbox">
        <Card id="inbox">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><Bell className="h-5 w-5" /> Notificacoes</CardTitle>
            <CardDescription>Inbox interna do piloto para alertas e disponibilidade para separacao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {db.notifications.length === 0 ? (
              <EmptyState icon={Inbox} title="Inbox vazia" description="Novas notificacoes operacionais aparecerao aqui." className="min-h-[130px]" />
            ) : (
              db.notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(notification.createdAt)} - {notificationTypeLabel(notification.type)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={notification.readAt ? 'outline' : 'default'}
                      onClick={() => markNotification(notification.id, !notification.readAt)}
                    >
                      {notification.readAt ? 'Marcar como nao lida' : 'Marcar como lida'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mrp">
        {/* Lazy-loaded MRP panel */}
        <div>
          <MrpPanel />
        </div>
      </TabsContent>
    </Tabs>
  );
}
