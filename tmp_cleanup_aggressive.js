const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function cleanupSiteSettingsAggressive() {
    try {
        console.log('--- Inspecting rows ---');
        const rows = await pool.query('SELECT ctid, id, tenant_id, company_name FROM site_settings');
        console.log(JSON.stringify(rows.rows, null, 2));

        console.log('\n--- Cleaning up duplicates (Aggressive) ---');
        // Se as linhas têm exatamente o mesmo id e tenant_id, vamos usar ctid para diferenciar
        const cleanupRes = await pool.query(`
      DELETE FROM site_settings 
      WHERE ctid NOT IN (
        SELECT MIN(ctid) 
        FROM site_settings 
        GROUP BY id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
    `);
        console.log('Rows deleted:', cleanupRes.rowCount);

        const afterCount = await pool.query('SELECT COUNT(*) FROM site_settings');
        console.log('Total rows after:', afterCount.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

cleanupSiteSettingsAggressive();
