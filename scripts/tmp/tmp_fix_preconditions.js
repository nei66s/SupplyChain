const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function fixSchema() {
    try {
        console.log('Adding tenant_id to precondition_categories...');
        await pool.query('ALTER TABLE precondition_categories ADD COLUMN tenant_id UUID');

        console.log('Updating existing rows to a default tenant (if any)...');
        // Se houver apenas um tenant ou se você quiser associar os existentes ao tenant principal
        // Você pode pegar o id de um tenant da tabela tenants.
        const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        if (tenantRes.rowCount > 0) {
            const tenantId = tenantRes.rows[0].id;
            await pool.query('UPDATE precondition_categories SET tenant_id = $1 WHERE tenant_id IS NULL', [tenantId]);
        }

        console.log('Adding tenant_id to precondition_values...');
        await pool.query('ALTER TABLE precondition_values ADD COLUMN tenant_id UUID');
        if (tenantRes.rowCount > 0) {
            const tenantId = tenantRes.rows[0].id;
            await pool.query('UPDATE precondition_values SET tenant_id = $1 WHERE tenant_id IS NULL', [tenantId]);
        }

        console.log('Schema fixed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing schema:', err);
        process.exit(1);
    }
}

fixSchema();
