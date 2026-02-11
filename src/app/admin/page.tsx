import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Administração</CardTitle>
        <CardDescription>
          Esta é uma página de exemplo para Administração. Funções de usuário, materiais e outras configurações serão gerenciadas aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Controles de Admin em Breve</p>
        </div>
      </CardContent>
    </Card>
  );
}
