import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SuggestionForm } from './suggestion-form';

export default function PredictivePage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestão Preditiva de Estoque</CardTitle>
          <CardDescription>
            Use dados históricos e IA para obter sugestões de níveis ótimos de estoque. Insira os detalhes do material abaixo para gerar uma recomendação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuggestionForm />
        </CardContent>
      </Card>
    </div>
  );
}
