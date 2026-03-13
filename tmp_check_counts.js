const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function checkCounts() {
    try {
        const auditCount = await pool.query("SELECT COUNT(*) FROM audit_events");
        console.log('Audit Events Count:', auditCount.rows[0].count);

        const siteCount = await pool.query("SELECT COUNT(*) FROM site_settings");
        console.log('Site Settings Count:', siteCount.rows[0].count);

        const auditIndices = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'audit_events'");
        console.log('Audit Indices:');
        auditIndices.rows.forEach(r => console.log(` - ${r.indexname}: ${r.indexdef}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCounts();
