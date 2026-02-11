import { Order, Material, User } from './types';

export const mockUsers: User[] = [
  {
    id: 'usr_001',
    name: 'Usuário Admin',
    email: 'admin@supplychainflow.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=admin@supplychainflow.com',
    role: 'Administrador',
  },
  {
    id: 'usr_002',
    name: 'Usuário Gerente',
    email: 'manager@supplychainflow.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=manager@supplychainflow.com',
    role: 'Gerente',
  },
];

export const mockOrders: Order[] = [
  {
    id: '2024-07-00001',
    customerName: 'Global Tech Inc.',
    priority: 'Urgente',
    status: 'Confirmado',
    orderDate: '2024-07-28',
  },
  {
    id: '2024-07-00002',
    customerName: 'Innovate Solutions',
    priority: 'Alta',
    status: 'Em Produção',
    orderDate: '2024-07-27',
  },
  {
    id: '2024-07-00003',
    customerName: 'Synergy Corp',
    priority: 'Média',
    status: 'Em Separação',
    orderDate: '2024-07-26',
  },
  {
    id: '2024-07-00004',
    customerName: 'Quantum Industries',
    priority: 'Baixa',
    status: 'Enviado',
    orderDate: '2024-07-25',
  },
  {
    id: '2024-07-00005',
    customerName: 'Apex Enterprises',
    priority: 'Média',
    status: 'Rascunho',
    orderDate: '2024-07-29',
  },
   {
    id: '2024-07-00006',
    customerName: 'Starlight Ventures',
    priority: 'Alta',
    status: 'Confirmado',
    orderDate: '2024-07-29',
  },
  {
    id: '2024-07-00007',
    customerName: 'Blue-sky Innovations',
    priority: 'Baixa',
    status: 'Enviado',
    orderDate: '2024-07-22',
  },
];

export const mockMaterials: Material[] = [
    { id: 'MAT-001', name: 'Microcontrolador', uom: 'EA', onHand: 500, reserved: 150, available: 350 },
    { id: 'MAT-002', name: 'Tela LED 7"', uom: 'EA', onHand: 300, reserved: 50, available: 250 },
    { id: 'MAT-003', name: 'Carcaça de Plástico - Modelo A', uom: 'EA', onHand: 1200, reserved: 400, available: 800 },
    { id: 'MAT-004', name: 'Bateria de Íon-Lítio', uom: 'EA', onHand: 800, reserved: 200, available: 600 },
    { id: 'MAT-005', name: 'Fio de Cobre', uom: 'M', onHand: 10000, reserved: 2500, available: 7500 },
];
