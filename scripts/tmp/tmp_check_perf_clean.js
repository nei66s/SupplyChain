const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function checkPerformance() {
    try {
        const siteCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'site_settings'");
        console.log('Site Settings Columns:', siteCols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

        const auditIndices = await pool.query("SELECT indexname FROM pg_indexes WHERE tablename = 'audit_events'");
        console.log('Audit Events Indices:', auditIndices.rows.map(r => r.indexname).join(', '));

        const ordersIndices = await pool.query("SELECT indexname FROM pg_indexes WHERE tablename = 'orders'");
        console.log('Orders Indices:', ordersIndices.rows.map(r => r.indexname).join(', '));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPerformance();
