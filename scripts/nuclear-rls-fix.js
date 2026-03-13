const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();

        console.log('--- RECONSTRUINDO POLÍTICAS DE ISOLAMENTO (Modo Nuclear) ---');

        const tables = [
            'users',
            'site_settings',
            'orders',
            'materials',
            'stock_balances',
            'uoms',
            'categories',
            'production_tasks',
            'inventory_receipts',
            'notifications',
            'production_reservations'
        ];

        for (const table of tables) {
            console.log(`\nProcessando Tabela: ${table}`);

            // 1. Habilitar RLS e FORÇAR para o Owner (IMPORTANTE!)
            await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
            await client.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);

            // 2. Limpar todas as políticas existentes de isolamento
            await client.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON ${table}`);
            await client.query(`DROP POLICY IF EXISTS any_tenant_policy ON ${table}`);

            // 3. Criar a nova política ultra-estrita
            // Usamos current_setting('app.current_tenant_id', true) para não dar erro se não estiver setado (volta nulo)
            const sql = `
                CREATE POLICY tenant_isolation_policy ON ${table} 
                FOR ALL 
                USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            `;
            await client.query(sql);

            console.log(`- RLS Habilitado e Forçado.`);
            console.log(`- Política tenant_isolation_policy criada.`);
        }

        console.log('\n--- VERIFICAÇÃO FINAL ---');
        const checkRes = await client.query(`
            SELECT tablename, rowsecurity, force_rowsecurity 
            FROM pg_tables 
            WHERE tablename = ANY($1)
        `, [tables]);
        console.table(checkRes.rows);

        console.log('\n✅ Sistema de isolamento reconstruído e forçado!');

    } catch (err) {
        console.error('ERRO CRÍTICO ao reconstruir RLS:', err);
    } finally {
        await client.end();
    }
}

run();
