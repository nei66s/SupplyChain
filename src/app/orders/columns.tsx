'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Order } from '@/lib/domain/types';
import { readinessLabel } from '@/lib/domain/i18n';
import { formatDate } from '@/lib/utils';

const statusVariantMap: Record<string, BadgeProps['variant']> = {
  RASCUNHO: 'outline',
  ABERTO: 'secondary',
  EM_PICKING: 'default',
  SAIDA_CONCLUIDA: 'warning',
  FINALIZADO: 'positive',
  CANCELADO: 'destructive',
};

const readinessVariantMap: Record<string, BadgeProps['variant']> = {
  READY_FULL: 'positive',
  READY_PARTIAL: 'warning',
  NOT_READY: 'outline',
};

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: 'orderNumber',
    header: 'Pedido',
    cell: ({ row }) => <div className="font-mono">{row.getValue('orderNumber')}</div>,
  },
  {
    accessorKey: 'clientName',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Cliente
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge variant={statusVariantMap[row.getValue('status') as string] ?? 'outline'}>{String(row.getValue('status'))}</Badge>,
  },
  {
    accessorKey: 'readiness',
    header: 'Pronto',
    cell: ({ row }) => (
      <Badge variant={readinessVariantMap[row.getValue('readiness') as string] ?? 'outline'}>{readinessLabel(row.getValue('readiness') as string)}</Badge>
    ),
  },
  {
    accessorKey: 'orderDate',
    header: 'Data',
    cell: ({ row }) => <div>{formatDate(row.getValue('orderDate') as string)}</div>,
  },
];
