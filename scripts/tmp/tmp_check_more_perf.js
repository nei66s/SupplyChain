const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@144.91.89.174:6432/inventario_agil?sslmode=disable' });

async function checkMoreIndices() {
    try {
        const notificationsIndices = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'notifications'");
        console.log('Notifications Indices:');
        notificationsIndices.rows.forEach(r => console.log(` - ${r.indexname}: ${r.indexdef}`));

        const usersIndices = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users'");
        console.log('Users Indices:');
        usersIndices.rows.forEach(r => console.log(` - ${r.indexname}: ${r.indexdef}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkMoreIndices();
