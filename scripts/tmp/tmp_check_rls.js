const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function checkRLS() {
    try {
        const rls = await pool.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('site_settings', 'audit_events', 'orders')");
        console.log('RLS Status:');
        rls.rows.forEach(r => console.log(` - ${r.tablename}: ${r.rowsecurity}`));

        const policies = await pool.query("SELECT * FROM pg_policies WHERE schemaname = 'public'");
        console.log('\nPolicies:');
        policies.rows.forEach(r => console.log(` - ${r.tablename} (${r.policyname}): ${r.qual}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRLS();
