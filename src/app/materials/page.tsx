"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Boxes, ChevronDown, ChevronUp, Edit, PlusCircle, Trash, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

type MaterialFormValues = {
  name: string;
  sku?: string;
  standardUom: string;
  minStock: number;
  reorderPoint: number;
  setupTimeMinutes: number;
  productionTimePerUnitMinutes: number;
  colorOptions: string;
};

const defaultValues: MaterialFormValues = {
  name: '',
  sku: '',
  standardUom: 'EA',
  minStock: 0,
  reorderPoint: 0,
  setupTimeMinutes: 0,
  productionTimePerUnitMinutes: 0,
  colorOptions: '',
};

type PreconditionValue = {
  id: number;
  value: string;
};

type PreconditionCategory = {
  id: number;
  name: string;
  values: PreconditionValue[];
};

const defaultConditionCategories = ['Fibra', 'FibraCor', 'Corda', 'CordaCor', 'Trico', 'TricoCor', 'Fio', 'Fiocor'];

export default function MaterialsPage() {
  const [db, setDb] = useState<any>({ materials: [] });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [preconditionCategories, setPreconditionCategories] = useState<PreconditionCategory[]>([]);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [newConditionInput, setNewConditionInput] = useState<Record<number, string>>({});
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);

  const { toast } = useToast();
  const form = useForm<MaterialFormValues>({ defaultValues });
  const mountedRef = useRef(true);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      if (!mountedRef.current) return;
      setDb({ materials: data });
    } catch (err) {
      console.error('Failed to load materials', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const fallbackCategoriesFromMetadata = useMemo(() => {
    const aggregated: Record<string, Set<string>> = {};
    defaultConditionCategories.forEach((key) => {
      aggregated[key] = new Set<string>();
    });

    db.materials.forEach((material: any) => {
      const metadata = material.metadata ?? {};
      defaultConditionCategories.forEach((key) => {
        const raw = metadata[key] ?? metadata[key.toLowerCase()];
        if (Array.isArray(raw)) {
          raw.forEach((value) => {
            if (value) aggregated[key].add(value);
          });
        } else if (typeof raw === 'string' && raw) {
          aggregated[key].add(raw);
        }
      });
    });

    let valueId = 1;
    return defaultConditionCategories
      .map((key, index) => {
        const values = Array.from(aggregated[key] ?? []).map((value) => ({
          id: valueId++,
          value,
        }));
        if (values.length === 0) return null;
        return { id: -(index + 1), name: key, values };
      })
      .filter(Boolean) as PreconditionCategory[];
  }, [db.materials]);

  const fetchPreconditions = useCallback(async () => {
    setConditionsLoading(true);
    try {
      const response = await fetch('/api/preconditions');
      if (!response.ok) throw new Error('Erro ao carregar pre-condicoes');
      const data = (await response.json()) as PreconditionCategory[];
      if (!mountedRef.current) return data;
      setPreconditionCategories(data);
      setIsUsingFallbackData(false);
      setNewConditionInput(Object.fromEntries(data.map((category) => [category.id, ''])));
      setExpandedCategoryId((prev) => (prev && data.some((category) => category.id === prev) ? prev : null));
      return data;
    } catch (error: any) {
      console.error('Failed to load preconditions', error);
      if (mountedRef.current) {
        setPreconditionCategories([]);
        setExpandedCategoryId(null);
      }
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as pré-condições',
        variant: 'destructive',
      });
      return [];
    } finally {
      if (mountedRef.current) setConditionsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPreconditions();
  }, [fetchPreconditions]);

  useEffect(() => {
    if (preconditionCategories.length === 0 && fallbackCategoriesFromMetadata.length > 0) {
      setPreconditionCategories(fallbackCategoriesFromMetadata);
      setNewConditionInput(
        Object.fromEntries(fallbackCategoriesFromMetadata.map((category) => [category.id, '']))
      );
      setExpandedCategoryId(null);
      setIsUsingFallbackData(true);
    }
  }, [fallbackCategoriesFromMetadata, preconditionCategories.length]);

  const openNew = () => {
    form.reset(defaultValues);
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const material = db.materials.find((x: any) => x.id === id);
    if (!material) return;
    form.reset({
      sku: material.sku || '',
      name: material.name,
      standardUom: material.standardUom,
      minStock: material.minStock,
      reorderPoint: material.reorderPoint,
      setupTimeMinutes: material.setupTimeMinutes,
      productionTimePerUnitMinutes: material.productionTimePerUnitMinutes,
      colorOptions: (material.colorOptions || []).join(', '),
    });
    setEditing(material.id);
    setOpen(true);
  };

  const onSubmit = (values: MaterialFormValues) => {
    const payload = {
      name: values.name,
      standardUom: values.standardUom,
      minStock: Number(values.minStock),
      reorderPoint: Number(values.reorderPoint),
      setupTimeMinutes: Number(values.setupTimeMinutes),
      productionTimePerUnitMinutes: Number(values.productionTimePerUnitMinutes),
      colorOptions: values.colorOptions
        ? values.colorOptions.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };

    (async () => {
      try {
        if (editing) {
          const res = await fetch(`/api/materials/${editing}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, sku: form.getValues('sku') }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const msg = err?.errors ? Object.values(err.errors).join('; ') : err?.error || 'Falha ao atualizar';
            toast({ title: 'Erro', description: String(msg), variant: 'destructive' });
            return;
          }
          toast({ title: 'Material atualizado', description: 'As alterações foram salvas', variant: 'success' });
        } else {
          const res = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, sku: form.getValues('sku') }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const msg = err?.errors ? Object.values(err.errors).join('; ') : err?.error || 'Falha ao criar';
            toast({ title: 'Erro', description: String(msg), variant: 'destructive' });
            return;
          }
          toast({ title: 'Material criado', description: 'Novo material salvo no banco', variant: 'success' });
        }
        await fetchMaterials();
      } catch (err) {
        console.error('Save failed', err);
        toast({ title: 'Erro', description: 'Ocorreu um erro inesperado', variant: 'destructive' });
      } finally {
        setOpen(false);
      }
    })();
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Remover este material?')) return;
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error || 'Falha ao remover';
        toast({ title: 'Erro', description: String(msg), variant: 'destructive' });
        return;
      }
      toast({ title: 'Material removido', description: 'Material excluído com sucesso', variant: 'success' });
      await fetchMaterials();
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao remover material', variant: 'destructive' });
    }
  };
  const handleRemoveCondition = useCallback(
    async (categoryId: number, valueId: number) => {
      try {
        const response = await fetch(`/api/preconditions/${categoryId}/values/${valueId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error || 'Falha ao remover valor');
        }
        toast({ title: 'Valor removido', description: 'Lista atualizada', variant: 'success' });
        await fetchPreconditions();
      } catch (error: any) {
        toast({
          title: 'Erro',
          description: error?.message || 'Nao foi possivel remover o valor',
          variant: 'destructive',
        });
      }
    },
    [fetchPreconditions, toast]
  );

  const handleAddCondition = useCallback(
    async (categoryId: number, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      try {
        const response = await fetch(`/api/preconditions/${categoryId}/values`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: trimmed }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.error || 'Falha ao adicionar valor');
        }
        toast({ title: 'Valor salvo', description: 'Lista atualizada', variant: 'success' });
        await fetchPreconditions();
        setNewConditionInput((prev) => ({ ...prev, [categoryId]: '' }));
        setExpandedCategoryId(categoryId);
      } catch (error: any) {
        toast({
          title: 'Erro',
          description: error?.message || 'Nao foi possivel adicionar o valor',
          variant: 'destructive',
        });
      }
    },
    [fetchPreconditions, toast]
  );

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = newCategoryName.trim();
    if (!normalized) {
      setCategoryError('Nome obrigatorio');
      return;
    }
    try {
      const response = await fetch('/api/preconditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalized }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        setCategoryError(err?.error || 'Categoria invalida');
        return;
      }
      const payload = await response.json();
      await fetchPreconditions();
      setExpandedCategoryId(payload.id);
      setCategoryDialogOpen(false);
      setNewCategoryName('');
      setCategoryError('');
      toast({
        title: 'Pre-condicao criada',
        description: 'Categoria adicionada com sucesso',
        variant: 'success',
      });
    } catch (error) {
      console.error('Failed to create category', error);
      toast({ title: 'Erro', description: 'Nao foi possivel criar a categoria', variant: 'destructive' });
    }
  };

  const toggleCategoryDetail = (categoryId: number) => {
    setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const expandedCategory = preconditionCategories.find((category) => category.id === expandedCategoryId) ?? null;
  const detailItems = expandedCategory?.values ?? [];

  return (
    <>
        <Card>
          <CardHeader className="flex-col items-start justify-between gap-3 space-y-0 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="font-headline">Materiais</CardTitle>
              <CardDescription>Gerencie materiais cadastrados no sistema.</CardDescription>
            </div>
            <div>
              <Button className="w-full sm:w-auto" onClick={openNew}>Novo material</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Estoque mínimo</TableHead>
                <TableHead className="text-right">Ponto de pedido</TableHead>
                <TableHead className="text-right">Preparação (min)</TableHead>
                <TableHead className="text-right">Produção por unidade (min)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="border-none py-8">
                    <EmptyState title="Carregando materiais..." description="Aguarde enquanto os dados chegam do servidor." className="min-h-[120px]" />
                  </TableCell>
                </TableRow>
              ) : db.materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="border-none py-8">
                    <EmptyState icon={Boxes} title="Nenhum material cadastrado" description="Cadastre um novo material para iniciar o planejamento." className="min-h-[120px]" />
                  </TableCell>
                </TableRow>
              ) : (
                db.materials.map((m: any) => {
                  const metadata = m.metadata ?? {};
                  const getMeta = (key: string) => metadata[key] || metadata[key.toLowerCase()] || '';
                  const codigo = getMeta('Código') || getMeta('Codigo');
                  const tipo = getMeta('Tipos') || getMeta('Produto');
                  const dataValue = getMeta('Data') || getMeta('data');

                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.sku}</p>
                      </TableCell>
                      <TableCell>{getMeta('Operador')}</TableCell>
                      <TableCell>{codigo}</TableCell>
                      <TableCell>{tipo}</TableCell>
                      <TableCell>{dataValue ? formatDate(dataValue) : ''}</TableCell>
                      <TableCell>{m.standardUom}</TableCell>
                      <TableCell className="text-right">{m.minStock}</TableCell>
                      <TableCell className="text-right">{m.reorderPoint}</TableCell>
                      <TableCell className="text-right">{m.setupTimeMinutes}</TableCell>
                      <TableCell className="text-right">{m.productionTimePerUnitMinutes}</TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => openEdit(m.id)} aria-label={`Editar ${m.name}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteMaterial(m.id)} aria-label={`Remover ${m.name}`}>
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex-col items-start justify-between gap-3 space-y-0 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="font-headline">Pré-condições</CardTitle>
                <CardDescription>Categorias globais com os valores possíveis.</CardDescription>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setCategoryDialogOpen(true)} disabled={isUsingFallbackData}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar condição
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isUsingFallbackData && (
                <p className="text-xs text-muted-foreground">
                  Pré-condições exibidas a partir dos materiais atuais. Execute node scripts/run-migrations.js e reinicie o servidor para habilitar a persistência.
                </p>
              )}
              {conditionsLoading ? (
                <EmptyState title="Carregando Pré-condições..." description="Aguarde enquanto os dados são carregados." className="min-h-[120px]" />
              ) : preconditionCategories.length === 0 ? (
                <EmptyState
                  icon={Boxes}
                  title="Nenhuma Pré-condição"
                  description="Crie uma categoria para começar."
                  className="min-h-[140px]"
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {preconditionCategories.map((category) => {
                    const values = category.values ?? [];
                    const isExpanded = expandedCategoryId === category.id;
                    return (
                      <div key={category.id} className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          <span className="font-semibold">{category.name}</span>
                          <span>
                            {values.length} item{values.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => toggleCategoryDetail(category.id)}
                          aria-label={`${isExpanded ? 'Fechar' : 'Abrir'} detalhes de ${category.name}`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              {!conditionsLoading && expandedCategory && (
                <div className="mt-4 rounded-2xl border border-border bg-background p-4 shadow-inner">
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{expandedCategory.name}</p>
                      <p className="text-sm text-muted-foreground">Edite os itens dessa Pré-condição.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={newConditionInput[expandedCategory.id] ?? ''}
                        onChange={(event) =>
                          setNewConditionInput((prev) => ({ ...prev, [expandedCategory.id]: event.target.value }))
                        }
                        placeholder="Adicionar item"
                        className="text-sm"
                        disabled={isUsingFallbackData}
                      />
                      <Button
                        size="sm"
                        disabled={isUsingFallbackData}
                        onClick={() => handleAddCondition(expandedCategory.id, newConditionInput[expandedCategory.id] ?? '')}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  {isUsingFallbackData && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      Edição bloqueada enquanto as Pré-condições estiverem apenas nos dados locais.
                    </p>
                  )}
                  <div className="space-y-2">
                    {detailItems.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">Nenhum item cadastrado</p>
                    ) : (
                      detailItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[12px] text-muted-foreground"
                        >
                          <span>{item.value}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCondition(expandedCategory.id, item.id)}
                            aria-label={`Remover ${item.value}`}
                            disabled={isUsingFallbackData}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar material' : 'Novo material'}</DialogTitle>
            <DialogDescription>Preencha os dados do material.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...form.register('name', { required: true })} />
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>SKU (opcional)</FormLabel>
                <FormControl>
                  <Input {...form.register('sku')} />
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>Unidade</FormLabel>
                <FormControl>
                  <Input {...form.register('standardUom', { required: true })} />
                </FormControl>
                <FormMessage />
              </FormItem>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <FormItem>
                  <FormLabel>Estoque mínimo</FormLabel>
                  <FormControl>
                    <Input type="number" {...form.register('minStock')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem>
                  <FormLabel>Ponto de pedido</FormLabel>
                  <FormControl>
                    <Input type="number" {...form.register('reorderPoint')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <FormItem>
                  <FormLabel>Preparação (min)</FormLabel>
                  <FormControl>
                    <Input type="number" {...form.register('setupTimeMinutes')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem>
                  <FormLabel>Produção por unidade (min)</FormLabel>
                  <FormControl>
                    <Input type="number" {...form.register('productionTimePerUnitMinutes')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>

              <FormItem>
                <FormLabel>Opções de cor (separadas por vírgula)</FormLabel>
                <FormControl>
                  <Input {...form.register('colorOptions')} />
                </FormControl>
                <FormMessage />
              </FormItem>

              <DialogFooter className="flex items-center justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
          <DialogClose />
        </DialogContent>
        </Dialog>
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar pré-condição</DialogTitle>
              <DialogDescription>Defina uma nova categoria global de valores.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-muted-foreground">Nome da categoria</label>
                <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
                {categoryError && <p className="text-xs text-destructive">{categoryError}</p>}
              </div>
              <DialogFooter className="flex items-center justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Criar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
  );
}
