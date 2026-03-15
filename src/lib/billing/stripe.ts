import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecretKey);

export const stripeClient = {
    async createCustomer(email: string, name: string) {
        return await stripe.customers.create({
            email,
            name,
        });
    },

    async createCheckoutSession(customerId: string, tenantId: string, interval: 'month' | 'year' = 'month', quantity: number = 1) {
        return await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'], // Add 'pix', 'boleto' if needed and available in Brazil
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: 'Assinatura Inventário Ágil',
                            description: interval === 'year' ? 'Acesso anual.' : 'Acesso mensal.',
                        },
                        unit_amount: interval === 'year' ? 300000 : 30000, // R$ 3000 / R$ 300
                        recurring: {
                            interval: interval,
                        },
                    },
                    quantity: quantity,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/login?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?canceled=true`,
            metadata: {
                tenantId,
                interval,
                quantity: String(quantity),
            },
        });
    },

    async constructEvent(body: string, sig: string) {
        return stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );
    }
};
