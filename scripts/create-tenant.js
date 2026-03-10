const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.log('Usage: node scripts/create-tenant.js <tenant_name> <tenant_slug> <admin_email> <admin_password>');
        process.exit(1);
    }

    const [name, slug, email, password] = args;

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        // 1. Create Tenant
        const tenantRes = await client.query(
            'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
            [name, slug]
        );
        const tenantId = tenantRes.rows[0].id;
        console.log(`✅ Tenant created: ${name} (ID: ${tenantId})`);

        // 2. Create Default Site Settings
        await client.query(
            `INSERT INTO site_settings (id, tenant_id, company_name, platform_label) 
       VALUES ($1, $2, $3, $4)`,
            ['primary', tenantId, name, 'Inventário Ágil']
        );
        console.log(`✅ Site settings initialized for ${name}`);

        // 3. Create First User (Admin)
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = `usr-${Math.random().toString(36).substring(2, 10)}`;

        await client.query(
            `INSERT INTO users (id, name, email, password_hash, role, tenant_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'Administrador', email.toLowerCase(), passwordHash, 'Admin', tenantId]
        );
        console.log(`✅ Admin user created: ${email}`);

        await client.query('COMMIT');
        console.log('\n🚀 Tenant and Admin setup complete!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating tenant:', e.message);
    } finally {
        await client.end();
    }
}

run();
