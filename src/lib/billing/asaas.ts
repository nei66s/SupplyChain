export type AsaasCustomer = {
    id: string;
    name: string;
    email: string;
    cpfCnpj: string;
};

export type AsaasSubscription = {
    id: string;
    customer: string;
    value: number;
    billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX' | 'UNDEFINED';
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
};

const ASAAS_API_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

async function asaasFetch(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${ASAAS_API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        console.error(`[Asaas Error] ${endpoint}`, error);
        throw new Error(error.errors?.[0]?.description || 'Erro na comunicação com Asaas');
    }

    return res.json();
}

export const asaas = {
    async createCustomer(data: { name: string; email: string; cpfCnpj?: string }) {
        return asaasFetch('/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async createSubscription(data: {
        customer: string;
        billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX' | 'UNDEFINED';
        value: number;
        nextDueDate: string;
        cycle: 'MONTHLY' | 'YEARLY';
        description: string;
    }) {
        return asaasFetch('/subscriptions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async getSubscription(id: string): Promise<AsaasSubscription> {
        return asaasFetch(`/subscriptions/${id}`);
    }
};
