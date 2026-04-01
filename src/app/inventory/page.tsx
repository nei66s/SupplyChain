'use client';

import { Fragment, useCallback, useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Warehouse, ChevronDown, ChevronUp, History, Plus, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
const MrpPanel = dynamic(() => import('@/components/mrp-panel'), { ssr: false });
import { formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ConditionVariant,
  InventoryAdjustment,
  Material,
  Order,
  StockBalance,
  StockReservation,
} from '@/lib/domain/types';

function InventoryPageContent() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [stockReservations, setStockReservations] = useState<StockReservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [conditionVariants, setConditionVariants] = useState<ConditionVariant[]>([]);
  const [expandedVariantRows, setExpandedVariantRows] = useState<Record<string, boolean>>({});
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>([]);

  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedMaterialForAdjust, setSelectedMaterialForAdjust] = useState<Material | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustDelta, setAdjustDelta] = useState<string | number>(0);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [inventoryRes, ordersRes] = await Promise.all([
        fetch('/api/inventory', { cache: 'no-store' }),
        fetch('/api/orders', { cache: 'no-store' }),
      ]);
      if (inventoryRes.ok) {
        const payload = await inventoryRes.json();
        setMaterials(Array.isArray(payload.materials) ? payload.materials : []);
        setStockBalances(Array.isArray(payload.stockBalances) ? payload.stockBalances : []);
        setStockReservations(Array.isArray(payload.stockReservations) ? payload.stockReservations : []);
        setConditionVariants(
          Array.isArray(payload.conditionVariants) ? payload.conditionVariants : []
        );
        setInventoryAdjustments(Array.isArray(payload.adjustments) ? payload.adjustments : []);
      }
      if (ordersRes.ok) {
        const payload = await ordersRes.json();
        setOrders(Array.isArray(payload) ? payload : []);
      }
    } catch (err) {
      console.error('inventory load failed', err);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stockView = useMemo(() => {
    const materialsById = Object.fromEntries(materials.map((m) => [m.id, m]));
    return stockBalances.map((balance) => {
      const material = materialsById[balance.materialId];
      const productionReserved = (balance as any).productionReserved ?? 0;
      const available = Math.max(0, balance.onHand - (balance.reservedTotal ?? 0) - productionReserved);
      const activeReservations = stockReservations
        .filter((reservation) => reservation.materialId === balance.materialId)
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
      return { ...balance, material, available, activeReservations };
    });
  }, [materials, stockBalances, stockReservations]);

  const variantsByMaterial = useMemo(() => {
    const map: Record<string, ConditionVariant[]> = {};
    conditionVariants.forEach((variant) => {
      if (!map[variant.materialId]) map[variant.materialId] = [];
      map[variant.materialId].push(variant);
    });
    return map;
  }, [conditionVariants]);

  const toggleVariantRow = useCallback((materialId: string) => {
    setExpandedVariantRows((prev) => ({
      ...prev,
      [materialId]: !prev[materialId],
    }));
  }, []);

  const openAdjustDialog = (material: Material) => {
    setSelectedMaterialForAdjust(material);
    setAdjustDelta(0);
    setAdjustmentReason('');
    setIsAdjustDialogOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedMaterialForAdjust || !adjustmentReason.trim()) {
      alert('Por favor, insira uma justificativa.');
      return;
    }

    const delta = Number(adjustDelta);
    if (isNaN(delta)) {
      alert('Por favor, insira uma quantidade valida.');
      return;
    }

    if (delta === 0) {
      alert('O ajuste deve ser diferente de zero.');
      return;
    }

    const currentBalance = stockBalances.find(b => b.materialId === selectedMaterialForAdjust.id);
    const finalQty = (currentBalance?.onHand ?? 0) + delta;

    setSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: selectedMaterialForAdjust.id,
          onHand: finalQty,
          reason: adjustmentReason,
        }),
      });
      if (res.ok) {
        setIsAdjustDialogOpen(false);
        await loadData();
      } else {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.error}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'stock';

  const onTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/inventory?${params.toString()}`);
  };

  return (
    <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-4">
      <TabsContent value="stock">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Saldo de estoque</CardTitle>
            <CardDescription>Em estoque, reservado e disponivel calculados em tempo real.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20"></TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Em estoque</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">Reservado producao</TableHead>
                    <TableHead className="text-right">Disponivel</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockView.map((entry) => {
                    const material = entry.material;
                    const statusVariant = entry.available <= 0 ? 'destructive' : material && entry.available <= material.minStock ? 'warning' : 'positive';
                    const variantRows = variantsByMaterial[entry.materialId] ?? [];
                    const hasVariants = variantRows.length > 0;
                    const isExpanded = Boolean(expandedVariantRows[entry.materialId] && hasVariants);

                    return (
                      <Fragment key={entry.materialId}>
                        <TableRow>
                          <TableCell className="pr-2 align-top">
                            {hasVariants ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleVariantRow(entry.materialId)}
                                className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] opacity-100 shadow"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                                Vertentes
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{material?.name}</p>
                            <p className="text-xs text-muted-foreground">{entry.materialId} - min {material?.minStock} - ponto de pedido {material?.reorderPoint}</p>
                          </TableCell>
                          <TableCell className="text-right">{entry.onHand}</TableCell>
                          <TableCell className="text-right">{entry.reservedTotal}</TableCell>
                          <TableCell className="text-right">{entry.productionReserved ?? 0}</TableCell>
                          <TableCell className="text-right font-semibold">{entry.available}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={statusVariant}>{statusVariant === 'destructive' ? 'RUPTURA' : statusVariant === 'warning' ? 'BAIXO' : 'OK'}</Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && variantRows.length > 0 ? (
                          <TableRow key={`${entry.materialId}-variants`}>
                            <TableCell className="border-none p-0" />
                            <TableCell colSpan={6} className="border-none bg-muted/10 px-3 py-4 sm:px-6">
                              <div className="space-y-3">
                                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Materiais Condicionados</p>
                                <div className="grid gap-3 md:grid-cols-2">
                                  {variantRows.map((variant, variantIndex) => {
                                    const summary =
                                      variant.conditions
                                        .map((cond) => `${cond.key}: ${cond.value}`)
                                        .filter(Boolean)
                                        .join(' • ') || 'Sem condicoes';
                                    const variantKey = `${entry.materialId}-${variantIndex}-${summary}`;
                                    return (
                                      <div key={variantKey} className="rounded-2xl border border-border bg-background/70 p-3 shadow-sm">
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-sm font-semibold">{summary}</p>
                                          <span className="text-xs text-muted-foreground">
                                            Solic: {variant.quantityRequested}
                                          </span>
                                        </div>
                                        <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-3">
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Reservado</p>
                                            <p className="text-sm font-semibold text-foreground">{variant.reservedFromStock}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Producao</p>
                                            <p className="text-sm font-semibold text-amber-600">{variant.qtyToProduce}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Total</p>
                                            <p className="text-sm font-semibold text-foreground">{variant.quantityRequested}</p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 gap-4 md:hidden">
              {stockView.map((entry) => {
                const material = entry.material;
                const statusVariant = entry.available <= 0 ? 'destructive' : material && entry.available <= material.minStock ? 'warning' : 'positive';
                const variantRows = variantsByMaterial[entry.materialId] ?? [];
                const hasVariants = variantRows.length > 0;
                const isExpanded = Boolean(expandedVariantRows[entry.materialId] && hasVariants);

                return (
                  <div key={entry.materialId} className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/5 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{material?.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">{entry.materialId}</p>
                      </div>
                      <Badge variant={statusVariant}>{statusVariant === 'destructive' ? 'RUPTURA' : statusVariant === 'warning' ? 'BAIXO' : 'OK'}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Em Estoque</p>
                        <p className="text-sm font-bold">{entry.onHand}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Reservado</p>
                        <p className="text-sm font-bold">{entry.reservedTotal}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Res. Prod</p>
                        <p className="text-sm font-bold">{entry.productionReserved ?? 0}</p>
                      </div>
                      <div className="border-l border-slate-100 dark:border-slate-800 pl-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-500">Disponivel</p>
                        <p className="text-base font-black text-indigo-600 dark:text-indigo-400">{entry.available}</p>
                      </div>
                    </div>

                    {hasVariants ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleVariantRow(entry.materialId)}
                        className="w-full h-8 text-xs uppercase font-bold tracking-widest"
                      >
                        {isExpanded ? (
                          <>Ocultar Vertentes <ChevronUp className="ml-2 h-3.5 w-3.5" /></>
                        ) : (
                          <>Ver Vertentes ({variantRows.length}) <ChevronDown className="ml-2 h-3.5 w-3.5" /></>
                        )}
                      </Button>
                    ) : null}

                    {isExpanded && variantRows.length > 0 ? (
                      <div className="mt-1 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {variantRows.map((variant, idx) => (
                          <div key={idx} className="rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10 p-3">
                            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                              {variant.conditions.map(c => `${c.key}: ${c.value}`).join(' • ')}
                            </p>
                            <div className="flex justify-between text-[11px]">
                              <span>Res: <strong className="text-slate-900 dark:text-slate-100">{variant.reservedFromStock}</strong></span>
                              <span>Prod: <strong className="text-amber-600">{variant.qtyToProduce}</strong></span>
                              <span>Total: <strong className="text-slate-900 dark:text-slate-100">{variant.quantityRequested}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="adjust">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Ajuste / Inventario</CardTitle>
              <CardDescription>Clique no botao &quot;+&quot; para lancar um ajuste de estoque para um material especifico.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Saldo Atual (Sistema)</TableHead>
                    <TableHead className="text-right">Acao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => {
                    const balance = stockBalances.find(b => b.materialId === material.id);
                    return (
                      <TableRow key={material.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{material.name}</p>
                          <p className="text-[10px] text-muted-foreground">{material.id}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {balance?.onHand ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openAdjustDialog(material)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2"><History className="h-4 w-4" /> Historico de Lancamentos</CardTitle>
              <CardDescription>Ultimos ajustes realizados manualmente.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="max-h-[600px] overflow-auto px-6">
                <div className="space-y-4">
                  {inventoryAdjustments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Nenhum lancamento registrado.</p>
                  ) : (
                    inventoryAdjustments.map((adjustment) => (
                      <div key={adjustment.id} className="border-b pb-3 last:border-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium text-xs truncate max-w-[180px]">{adjustment.materialName}</p>
                          <Badge variant={adjustment.adjustmentQty > 0 ? 'positive' : 'destructive'} className="text-[10px] h-4 px-1">
                            {adjustment.adjustmentQty > 0 ? '+' : ''}{adjustment.adjustmentQty}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Saldo: {adjustment.qtyBefore} {'->'} {adjustment.qtyAfter}
                        </p>
                        <div className="mt-2 bg-muted/30 p-2 rounded text-[10px] italic text-muted-foreground">
                          &quot;{adjustment.reason}&quot;
                        </div>
                        <div className="mt-2 flex justify-between items-center text-[9px] uppercase tracking-tighter text-muted-foreground/60">
                          <span>{adjustment.actor}</span>
                          <span>{formatDate(adjustment.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Lancamento Manual de Estoque
              </DialogTitle>
              <DialogDescription>
                Voce esta prestes a alterar manualmente o saldo do material <strong>{selectedMaterialForAdjust?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 [&>svg]:text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aviso Critico</AlertTitle>
              <AlertDescription className="text-xs">
                Ajustes manuais ignoram reservas ativas e processos de producao em curso.
                Isso pode causar discrepancias graves no planejamento MRP e na fila de picking.
                <strong> Use apenas para correcoes de inventario fisico confirmadas.</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Saldo Atual</Label>
                  <Input disabled value={stockBalances.find(b => b.materialId === selectedMaterialForAdjust?.id)?.onHand ?? 0} className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade a Ajustar (+ ou -)</Label>
                  <Input
                    type="number"
                    autoFocus
                    placeholder="Ex: 500 ou -100"
                    value={adjustDelta}
                    onChange={e => setAdjustDelta(e.target.value)}
                    className="font-bold border-primary text-primary"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Novo Saldo Resultante</span>
                  <span className="text-lg font-black font-mono">
                    {(() => {
                      const current = stockBalances.find(b => b.materialId === selectedMaterialForAdjust?.id)?.onHand ?? 0;
                      const delta = Number(adjustDelta) || 0;
                      return current + delta;
                    })()}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Justificativa do Ajuste (Obrigatorio)</Label>
                <Textarea
                  placeholder="Ex: Quebra fisica identificada, Erro de lancamento anterior, Inventario rotativo..."
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveAdjustment} disabled={saving || !adjustmentReason.trim()}>
                {saving ? 'Processando...' : 'Confirmar Ajuste'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                {stockReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="border-none py-8">
                      <EmptyState icon={Warehouse} title="Sem reservas no momento" description="As reservas ativas de estoque aparecerao aqui." className="min-h-[120px]" />
                    </TableCell>
                  </TableRow>
                ) : (
                  stockReservations.map((reservation) => {
                    const order = orders.find((item) => item.id === reservation.orderId);
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

      <TabsContent value="mrp">
        <div>
          <MrpPanel />
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando inventario...</div>}>
      <InventoryPageContent />
    </Suspense>
  );
}
