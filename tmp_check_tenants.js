const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function checkTenants() {
    try {
        const res = await pool.query('SELECT DISTINCT tenant_id FROM site_settings');
        console.log('Unique Tenants in site_settings:', res.rows.length);
        res.rows.forEach(r => console.log(` - ${r.tenant_id}`));

        const count = await pool.query('SELECT COUNT(*) FROM site_settings');
        console.log('Total rows:', count.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTenants();
