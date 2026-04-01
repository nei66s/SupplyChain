const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const PUBLIC_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'yahoo.com',
    'yahoo.com.br',
    'bol.com.br',
    'uol.com.br',
    'terra.com.br',
    'aol.com',
    'proton.me',
    'protonmail.com',
]);

function getSuggestedTenantLoginDomain(email) {
    const normalized = String(email ?? '').trim().toLowerCase();
    const atIndex = normalized.lastIndexOf('@');
    if (atIndex <= 0 || atIndex === normalized.length - 1) {
        return null;
    }

    const domain = normalized.slice(atIndex + 1);
    return PUBLIC_EMAIL_DOMAINS.has(domain) ? null : domain;
}

async function run() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.log('Usage: node scripts/create-tenant.js <tenant_name> <tenant_slug> <admin_email> <admin_password>');
        process.exit(1);
    }

    const [name, slug, rawEmail, password] = args;
    const email = String(rawEmail).trim().toLowerCase();
    const loginDomain = getSuggestedTenantLoginDomain(email);

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        const tenantRes = await client.query(
            'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
            [name, slug]
        );
        const tenantId = tenantRes.rows[0].id;
        console.log(`Tenant created: ${name} (ID: ${tenantId})`);

        await client.query(
            `INSERT INTO site_settings (id, tenant_id, company_name, platform_label) 
       VALUES ($1, $2, $3, $4)`,
            ['primary', tenantId, name, 'Inventario Agil']
        );
        console.log(`Site settings initialized for ${name}`);

        if (loginDomain) {
            await client.query(
                `INSERT INTO tenant_login_domains (tenant_id, domain)
                 VALUES ($1, $2)
                 ON CONFLICT (domain) DO NOTHING`,
                [tenantId, loginDomain]
            );
            console.log(`Login domain configured: ${loginDomain}`);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userId = `usr-${Math.random().toString(36).substring(2, 10)}`;

        await client.query(
            `INSERT INTO users (id, name, email, password_hash, role, tenant_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'Administrador', email, passwordHash, 'Admin', tenantId]
        );
        console.log(`Admin user created: ${email}`);

        await client.query('COMMIT');
        console.log('\nTenant and Admin setup complete!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error creating tenant:', e.message);
    } finally {
        await client.end();
    }
}

run();
