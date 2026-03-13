const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        const tenantId = 'fa04bb25-240c-4da1-ba2b-2cde3c613180'; // Teste Stripe 2

        console.log(`--- Testando Isolamento para Tenant: ${tenantId} ---`);

        // Simula o que o query() faz
        await client.query(`SET app.current_tenant_id = '${tenantId}'`);

        const res = await client.query("SELECT id, email, tenant_id FROM users");
        console.log(`\nRESULTADO DO TESTE:`);
        console.log(`Total de usuários retornados: ${res.rowCount}`);
        res.rows.forEach(r => console.log(`- ${r.email} (Tenant: ${r.tenant_id})`));

        if (res.rowCount > 1) {
            console.log('\nAVISO: O isolamento FALHOU. Mais de um usuário retornado.');
        } else {
            console.log('\nSUCESSO: O isolamento está funcionando no nível do banco.');
        }

    } catch (err) {
        console.error('Erro no teste:', err);
    } finally {
        await client.end();
    }
}

run();
