import { ReadinessFlag } from './types';

export function readinessLabel(flag: ReadinessFlag | string): string {
  switch (flag) {
    case 'READY_FULL':
      return 'Completo';
    case 'READY_PARTIAL':
      return 'Parcial';
    case 'NOT_READY':
      return 'Não pronto';
    default:
      return String(flag);
  }
}

export const readinessTabLabel: Record<string, string> = {
  READY_FULL: 'Completo',
  READY_PARTIAL: 'Parcial',
  NOT_READY: 'Não pronto',
};

export function roleLabel(role: string): string {
  switch (role) {
    case 'Admin':
      return 'Administrador';
    case 'Manager':
      return 'Gestor';
    case 'Seller':
      return 'Vendedor';
    case 'Input Operator':
      return 'Operador de Entrada';
    case 'Production Operator':
      return 'Operador de Producao';
    case 'Picker':
      return 'Separador';
    default:
      return role;
  }
}

export function productionTaskStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendente';
    case 'IN_PROGRESS':
      return 'Em andamento';
    case 'DONE':
      return 'Concluida';
    default:
      return status;
  }
}

export function receiptStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Rascunho';
    case 'POSTED':
      return 'Postado';
    default:
      return status;
  }
}

export function notificationTypeLabel(type: string): string {
  switch (type) {
    case 'ALOCACAO_DISPONIVEL':
      return 'Alocacao disponivel';
    case 'ESTOQUE_MINIMO':
      return 'Estoque minimo';
    case 'ESTOQUE_PONTO_PEDIDO':
      return 'Ponto de pedido';
    case 'RUPTURA':
      return 'Ruptura';
    case 'PRODUCAO_PENDENTE':
      return 'Producao pendente';
    case 'SISTEMA':
      return 'Sistema';
    default:
      return type;
  }
}

export const dashboardLabels = {
  recentOrdersTitle: 'Pedidos recentes',
  recentOrdersDescription: 'Resumo operacional de pedidos em processamento.',
  lowStockTitle: 'Estoque critico',
  lowStockDescription: 'Itens abaixo do minimo com risco de ruptura.',
  sellersTitle: 'Pedidos por vendedor',
  sellersDescription: 'Distribuicao por origem comercial',
  pickersTitle: 'Pedidos por separador',
  pickersDescription: 'Carga atual de separacao',
  operatorsTitle: 'Entradas por operador',
  operatorsDescription: 'Recebimentos registrados',
};
