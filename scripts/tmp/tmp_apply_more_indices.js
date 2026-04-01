const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function applyMoreIndices() {
    try {
        console.log('Creating index on users(tenant_id, role, name)...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_users_tenant_role_name ON users(tenant_id, role, name)');

        console.log('Creating index on notifications(tenant_id, created_at DESC)...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created_at ON notifications(tenant_id, created_at DESC)');

        console.log('Ensuring index on site_settings(tenant_id) if not exists...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_site_settings_tenant_id ON site_settings(tenant_id)');

        console.log('Indices applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error applying indices:', err);
        process.exit(1);
    }
}

applyMoreIndices();
