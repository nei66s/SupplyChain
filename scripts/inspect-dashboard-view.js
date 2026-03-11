const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        console.log('--- Definição da View do Dashboard ---');
        const viewRes = await client.query("SELECT pg_get_viewdef('dashboard_orders_view', true);");
        console.log(viewRes.rows[0].pg_get_viewdef);

        console.log('\n--- Pedidos e seus Tenants (Confirmando São José Cordas) ---');
        const ordersRes = await client.query(`
            SELECT o.id, o.order_number, t.name as tenant_name 
            FROM orders o 
            JOIN tenants t ON o.tenant_id = t.id 
            LIMIT 10;
        `);
        ordersRes.rows.forEach(r => console.log(`Pedido ${r.order_number} | Empresa: ${r.tenant_name}`));

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

run();
