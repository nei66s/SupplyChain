'use client';

import * as React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { usePilotStore } from '@/lib/pilot/store';
import { formatDate } from '@/lib/utils';

export default function OrdersTrashPage() {
  const db = usePilotStore((s) => s.db);
  const restoreOrder = usePilotStore((s) => s.restoreOrder);
  const purgeOrder = usePilotStore((s) => s.purgeOrder);

  const trashed = React.useMemo(() => db.orders.filter((o) => o.trashedAt), [db.orders]);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Lixeira de pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {trashed.length === 0 ? (
            <EmptyState title="Lixeira vazia" description="Nenhum pedido removido recentemente." />
          ) : (
            <div className="space-y-3">
              {trashed.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{order.orderNumber} — {order.clientName}</div>
                    <div className="text-xs text-muted-foreground">Removido em {formatDate(order.trashedAt!)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => restoreOrder(order.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" />Restaurar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => purgeOrder(order.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />Excluir permanentemente
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
