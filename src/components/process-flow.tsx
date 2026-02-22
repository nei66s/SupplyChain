import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  ordersCount: number;
  separatedOnly: number;
  producingOnly: number;
  bothSeparatedAndProducing: number;
  blockedCount: number;
  finishedCount: number;
  // gaps
  stoppedInSeparation?: number;
  partialSeparated?: number;
  waitingProduction?: number;
  stoppedInProduction?: number;
};

export const ProcessFlow: React.FC<Props> = ({
  ordersCount,
  separatedOnly,
  producingOnly,
  bothSeparatedAndProducing,
  blockedCount,
  finishedCount,
  stoppedInSeparation = 0,
  partialSeparated = 0,
  waitingProduction = 0,
  stoppedInProduction = 0,
}) => {
  // Compute exclusive segments so the progress bar is non-overlapping
  const id = React.useId().replace(/:/g, "-");
  const separatedOnlyPct = ordersCount ? (separatedOnly / ordersCount) * 100 : 0;
  const bothPct = ordersCount ? (bothSeparatedAndProducing / ordersCount) * 100 : 0;
  const producingOnlyPct = ordersCount ? (producingOnly / ordersCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl">Fluxo por pedido</CardTitle>
        <CardDescription>Visao do progresso de separacao e producao por pedido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg border border-border/70 bg-muted/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">{ordersCount}</p>
            <Badge className="mt-2">Base</Badge>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">So separados</p>
            <p className="text-2xl font-semibold">{separatedOnly}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">So producao</p>
            <p className="text-2xl font-semibold">{producingOnly}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">Separacao e producao</p>
            <p className="text-2xl font-semibold">{bothSeparatedAndProducing}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">Bloqueados</p>
            <p className="text-2xl font-semibold">{blockedCount}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 p-4 text-center">
            <p className="text-sm text-muted-foreground">Concluidos</p>
            <p className="text-2xl font-semibold">{finishedCount}</p>
          </div>
        </div>

          <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
          <div className={`h-3 w-full overflow-hidden rounded bg-muted/30 flow-${id}`}>
            <style
              dangerouslySetInnerHTML={{
                __html: `
.flow-${id} > div:nth-child(1) { width: ${separatedOnlyPct}%; }
.flow-${id} > div:nth-child(2) { width: ${bothPct}%; }
.flow-${id} > div:nth-child(3) { width: ${producingOnlyPct}%; }
                `,
              }}
            />
            <div className="h-3 bg-emerald-500" aria-hidden />
            <div className="h-3 bg-amber-500" aria-hidden />
            <div className="h-3 bg-indigo-500" aria-hidden />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {stoppedInSeparation > 0 && <Badge variant="outline">Parados na separação: {stoppedInSeparation}</Badge>}
            {partialSeparated > 0 && <Badge variant="outline">Parcialmente separados: {partialSeparated}</Badge>}
            {waitingProduction > 0 && <Badge variant="outline">Aguardando produção: {waitingProduction}</Badge>}
            {stoppedInProduction > 0 && <Badge variant="outline">Parados na produção: {stoppedInProduction}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessFlow;
