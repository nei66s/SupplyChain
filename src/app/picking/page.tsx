import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function PickingPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Separação</CardTitle>
        <CardDescription>
          Esta é uma página de exemplo para a Separação. As tarefas de separação de pedidos serão gerenciadas aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Interface de Separação em Breve</p>
        </div>
      </CardContent>
    </Card>
  );
}
