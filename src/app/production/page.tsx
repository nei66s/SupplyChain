import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ProductionPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produção</CardTitle>
        <CardDescription>
          Esta é uma página de exemplo para a Produção. As tarefas de produção serão gerenciadas aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Painel de Produção em Breve</p>
        </div>
      </CardContent>
    </Card>
  );
}
