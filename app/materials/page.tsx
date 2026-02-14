'use client';

import * as React from 'react';
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
import { usePilotStore } from '@/lib/pilot/store';
import { EmptyState } from '@/components/ui/empty-state';
import { Boxes } from 'lucide-react';

type MaterialFormValues = {
  name: string;
  standardUom: string;
  minStock: number;
  reorderPoint: number;
  setupTimeMinutes: number;
  productionTimePerUnitMinutes: number;
  colorOptions: string;
};

export default function MaterialsPage() {
  const db = usePilotStore((s) => s.db);
  const addMaterial = usePilotStore((s) => s.addMaterial);
  const updateMaterial = usePilotStore((s) => s.updateMaterial);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);

  const defaultValues: MaterialFormValues = {
    name: '',
    standardUom: 'EA',
    minStock: 0,
    reorderPoint: 0,
    setupTimeMinutes: 0,
    productionTimePerUnitMinutes: 0,
    colorOptions: '',
  };

  const form = useForm<MaterialFormValues>({ defaultValues });

  const openNew = () => {
    form.reset(defaultValues);
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const m = db.materials.find((x) => x.id === id);
    if (!m) return;
    form.reset({
      name: m.name,
      standardUom: m.standardUom,
      minStock: m.minStock,
      reorderPoint: m.reorderPoint,
      setupTimeMinutes: m.setupTimeMinutes,
      productionTimePerUnitMinutes: m.productionTimePerUnitMinutes,
      colorOptions: (m.colorOptions || []).join(', '),
    });
    setEditing(m.id);
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
      colorOptions: values.colorOptions ? values.colorOptions.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };

    if (editing) {
      updateMaterial(editing, payload);
    } else {
      addMaterial(payload);
    }

    setOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="font-headline">Materiais</CardTitle>
            <CardDescription>Gerencie materiais cadastrados no sistema.</CardDescription>
          </div>
          <div>
            <Button onClick={openNew}>Novo material</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Estoque minimo</TableHead>
                <TableHead className="text-right">Ponto de pedido</TableHead>
                <TableHead className="text-right">Preparacao (min)</TableHead>
                <TableHead className="text-right">Producao por unidade (min)</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {db.materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="border-none py-8">
                    <EmptyState icon={Boxes} title="Nenhum material cadastrado" description="Cadastre um novo material para iniciar o planejamento." className="min-h-[120px]" />
                  </TableCell>
                </TableRow>
              ) : (
                db.materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.id}</p>
                    </TableCell>
                    <TableCell>{m.standardUom}</TableCell>
                    <TableCell className="text-right">{m.minStock}</TableCell>
                    <TableCell className="text-right">{m.reorderPoint}</TableCell>
                    <TableCell className="text-right">{m.setupTimeMinutes}</TableCell>
                    <TableCell className="text-right">{m.productionTimePerUnitMinutes}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(m.id)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                <FormLabel>Unidade</FormLabel>
                <FormControl>
                  <Input {...form.register('standardUom', { required: true })} />
                </FormControl>
                <FormMessage />
              </FormItem>

              <div className="grid grid-cols-2 gap-2">
                <FormItem>
                  <FormLabel>Estoque minimo</FormLabel>
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

              <div className="grid grid-cols-2 gap-2">
                <FormItem>
                  <FormLabel>Preparacao (min)</FormLabel>
                  <FormControl>
                    <Input type="number" {...form.register('setupTimeMinutes')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <FormItem>
                  <FormLabel>Producao por unidade (min)</FormLabel>
                  <FormControl>
                    <Input type="number" {...form.register('productionTimePerUnitMinutes')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </div>

              <FormItem>
                <FormLabel>Opcoes de cor (separadas por virgula)</FormLabel>
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
    </>
  );
}
