const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function checkPerformance() {
    try {
        console.log('--- Table: site_settings ---');
        const siteCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'site_settings'");
        console.log(JSON.stringify(siteCols.rows, null, 2));

        console.log('\n--- Indices on audit_events ---');
        const auditIndices = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'audit_events'");
        console.log(JSON.stringify(auditIndices.rows, null, 2));

        console.log('\n--- Indices on orders ---');
        const ordersIndices = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'orders'");
        console.log(JSON.stringify(ordersIndices.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPerformance();
