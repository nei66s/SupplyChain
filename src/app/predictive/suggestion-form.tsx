'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useFormState } from 'react-dom';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockMaterials } from '@/lib/data';
import { getStockSuggestion } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, Package, MoveDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SuggestOptimalStockLevelsOutput } from '@/ai/flows/suggest-optimal-stock-levels';

const formSchema = z.object({
  materialId: z.string().min(1, { message: 'Por favor, selecione um material.' }),
  historicalData: z.string().min(10, { message: 'Por favor, forneça dados históricos.' }),
  leadTimeDays: z.coerce.number().min(0, { message: 'O tempo de entrega deve ser um número positivo.' }),
  openOrdersQuantity: z.coerce.number().min(0, { message: 'Os pedidos em aberto devem ser um número positivo.' }),
});

const initialState = {
  success: false,
  data: null,
  error: null,
};

export function SuggestionForm() {
  const { toast } = useToast();
  const [formState, formAction] = useFormState(getStockSuggestion, initialState);
  const [pending, setPending] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestOptimalStockLevelsOutput | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materialId: '',
      historicalData: '{"sales_period_1": 100, "sales_period_2": 120, "sales_period_3": 110}',
      leadTimeDays: 14,
      openOrdersQuantity: 25,
    },
  });

  useEffect(() => {
    setPending(false);
    if (formState.success) {
      setSuggestion(formState.data);
      toast({
        title: 'Sugestão gerada!',
        description: 'A IA forneceu novas recomendações de nível de estoque.',
      });
    } else if (formState.error) {
      toast({
        variant: 'destructive',
        title: 'Ocorreu um erro.',
        description: formState.error,
      });
    }
  }, [formState, toast]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setPending(true);
    formAction(data);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="materialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um material para analisar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockMaterials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} ({material.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leadTimeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo de Entrega (Dias)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="openOrdersQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qtd. Pedidos Abertos</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="historicalData"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dados Históricos (JSON)</FormLabel>
                <FormControl>
                  <Textarea rows={5} {...field} />
                </FormControl>
                <FormDescription>
                  Forneça dados históricos de estoque, incluindo vendas e sazonalidade.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Sugestão
          </Button>
        </form>
      </Form>
      {suggestion && (
        <div className="mt-12">
            <h3 className="text-2xl font-headline font-semibold mb-4">Sugestões via IA</h3>
             <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ponto de Ressuprimento</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{suggestion.suggestedReorderPoint}</div>
                        <p className="text-xs text-muted-foreground">Faça um novo pedido neste nível de estoque.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estoque Mínimo</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{suggestion.suggestedMinStock}</div>
                        <p className="text-xs text-muted-foreground">Estoque de segurança para evitar rupturas.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quantidade de Ressuprimento</CardTitle>
                        <MoveDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{suggestion.suggestedQuantity}</div>
                        <p className="text-xs text-muted-foreground">Quantidade ideal para o próximo pedido.</p>
                    </CardContent>
                </Card>
            </div>
            <div className="mt-4 flex gap-2">
                <Button>Aplicar Sugestões</Button>
                <Button variant="outline">Descartar</Button>
            </div>
        </div>
      )}
    </>
  );
}
