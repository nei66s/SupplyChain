const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function cleanupReal() {
    try {
        const res = await pool.query('SELECT ctid, id, tenant_id FROM site_settings');
        const rows = res.rows;
        const seen = new Set();

        for (const row of rows) {
            const key = `${row.id}-${row.tenant_id}`;
            if (seen.has(key)) {
                console.log(`Deleting duplicate: CTID ${row.ctid} for Key ${key}`);
                await pool.query('DELETE FROM site_settings WHERE ctid = $1::tid', [row.ctid]);
            } else {
                seen.add(key);
            }
        }

        const final = await pool.query('SELECT COUNT(*) FROM site_settings');
        console.log(`Final count: ${final.rows[0].count}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cleanupReal();
