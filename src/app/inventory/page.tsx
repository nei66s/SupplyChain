import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockMaterials } from '@/lib/data';

export default function InventoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estoque</CardTitle>
        <CardDescription>
          Monitore e gerencie os níveis de estoque de seus materiais.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID do Material</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Unid. Medida</TableHead>
              <TableHead className="text-right">Em Mãos</TableHead>
              <TableHead className="text-right">Reservado</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
               <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockMaterials.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="font-mono">{material.id}</TableCell>
                <TableCell className="font-medium">{material.name}</TableCell>
                <TableCell>{material.uom}</TableCell>
                <TableCell className="text-right">{material.onHand}</TableCell>
                <TableCell className="text-right">{material.reserved}</TableCell>
                <TableCell className="text-right font-bold">{material.available}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={material.available > 100 ? 'secondary' : 'destructive'}>
                    {material.available > 100 ? 'Em Estoque' : 'Estoque Baixo'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
