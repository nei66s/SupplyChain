const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function cleanupSiteSettings() {
    try {
        console.log('--- Before cleanup: site_settings count ---');
        const beforeCount = await pool.query('SELECT COUNT(*) FROM site_settings');
        console.log('Total rows:', beforeCount.rows[0].count);

        console.log('\n--- Cleaning up duplicates ---');
        // Mantém apenas a linha mais recente (baseado em ctid ou updated_at) para cada par (id, tenant_id)
        const cleanupRes = await pool.query(`
      DELETE FROM site_settings a USING site_settings b 
      WHERE a.ctid < b.ctid 
        AND a.id = b.id 
        AND (a.tenant_id = b.tenant_id OR (a.tenant_id IS NULL AND b.tenant_id IS NULL))
    `);
        console.log('Rows deleted:', cleanupRes.rowCount);

        console.log('\n--- After cleanup: site_settings count ---');
        const afterCount = await pool.query('SELECT COUNT(*) FROM site_settings');
        console.log('Total rows:', afterCount.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

cleanupSiteSettings();
