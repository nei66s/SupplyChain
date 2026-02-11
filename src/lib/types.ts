export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'Administrador' | 'Gerente' | 'Vendedor' | 'Operador de Entrada' | 'Operador de Produção' | 'Separador';
};

export type Order = {
  id: string;
  customerName: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  status: 'Rascunho' | 'Confirmado' | 'Em Produção' | 'Em Separação' | 'Enviado' | 'Cancelado';
  orderDate: string;
};

export type Material = {
  id: string;
  name: string;
  uom: string;
  onHand: number;
  reserved: number;
  available: number;
};
