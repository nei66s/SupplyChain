const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function applyIndices() {
    try {
        console.log('Creating index on audit_events(order_id)...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_events_order_id ON audit_events(order_id)');

        console.log('Creating index on audit_events(tenant_id, order_id)...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_order ON audit_events(tenant_id, order_id)');

        console.log('Creating index on site_settings(id)...');
        // Helps if tenant_id is not in WHERE clause but id is
        await pool.query('CREATE INDEX IF NOT EXISTS idx_site_settings_id ON site_settings(id)');

        console.log('Indices applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error applying indices:', err);
        process.exit(1);
    }
}

applyIndices();
