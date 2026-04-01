const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function cleanupSiteSettingsFinal() {
    try {
        console.log('--- Current rows ---');
        const rowsRes = await pool.query('SELECT ctid, id, tenant_id, company_name FROM site_settings');
        const rows = rowsRes.rows;
        console.log(`Found ${rows.length} rows`);

        // Guardaremos apenas um ctid para cada combinação de (id, tenant_id)
        const seen = new Set();
        const ctidsToDelete = [];

        for (const row of rows) {
            const key = `${row.id}-${row.tenant_id}`;
            if (seen.has(key)) {
                ctidsToDelete.push(row.ctid);
            } else {
                seen.add(key);
            }
        }

        if (ctidsToDelete.length > 0) {
            console.log(`Deleting ${ctidsToDelete.length} duplicate rows...`);
            for (const ctid of ctidsToDelete) {
                // ctid precisa ser comparado exatamente como string ou usando CTID type
                await pool.query('DELETE FROM site_settings WHERE ctid = $1::tid', [ctid]);
            }
            console.log('Cleanup finished.');
        } else {
            console.log('No duplicates found based on ID and TenantID.');
        }

        const finalCount = await pool.query('SELECT COUNT(*) FROM site_settings');
        console.log('Final row count:', finalCount.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

cleanupSiteSettingsFinal();
