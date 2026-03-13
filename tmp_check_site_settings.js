const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function checkSiteSettings() {
    try {
        const indices = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'site_settings'");
        console.log('Site Settings Indices:');
        indices.rows.forEach(r => console.log(` - ${r.indexname}: ${r.indexdef}`));

        const logoSizes = await pool.query("SELECT id, OCTET_LENGTH(logo_data) as size FROM site_settings");
        console.log('Logo sizes (bytes):');
        logoSizes.rows.forEach(r => console.log(` - ${r.id}: ${r.size}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSiteSettings();
