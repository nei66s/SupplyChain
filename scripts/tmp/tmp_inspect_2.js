const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function fullInspect() {
    try {
        const res = await pool.query('SELECT ctid, id, tenant_id FROM site_settings');
        console.log('Site Settings Data:');
        res.rows.forEach(r => console.log(`CTID: ${r.ctid} | ID: ${Math.random()} | TID: ${r.tenant_id}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fullInspect();
