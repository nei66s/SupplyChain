/**
 * Scripts para elevar um usuário a Super Admin da plataforma Black Tower X.
 * 
 * Uso:
 *   node scripts/set-platform-admin.js <email>
 *
 * Exemplo:
 *   node scripts/set-platform-admin.js admin@blacktowerx.com
 */

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('❌ Email obrigatório. Ex: node scripts/set-platform-admin.js admin@gmail.com');
        process.exit(1);
    }

    // Look up user
    const userRes = await pool.query('SELECT id, name, email, role, tenant_id FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);
    if (userRes.rowCount === 0) {
        console.error(`❌ Nenhum usuário encontrado com email: ${email}`);
        process.exit(1);
    }
    const user = userRes.rows[0];

    // Look up if they are in the platform tenant
    const tenantRes = await pool.query('SELECT id, name, is_platform_owner FROM tenants WHERE id = $1', [user.tenant_id]);
    const tenant = tenantRes.rows[0];

    console.log(`\n📋 Usuário encontrado:`);
    console.log(`   Nome   : ${user.name}`);
    console.log(`   Email  : ${user.email}`);
    console.log(`   Role   : ${user.role}`);
    console.log(`   Tenant : ${tenant?.name ?? user.tenant_id}`);
    if (!tenant?.is_platform_owner) {
        console.warn(`\n⚠️  Aviso: Este usuário NÃO pertence ao tenant da plataforma (Black Tower X).`);
        console.warn(`   O painel Super Admin exigirá o is_platform_admin=true, mas o tenant não é o dono.`);
    }

    // Set is_platform_admin
    await pool.query('UPDATE users SET is_platform_admin = TRUE, role = \'Admin\' WHERE id = $1', [user.id]);
    console.log(`\n✅ Usuário ${user.email} agora é Super Admin da plataforma!`);
    console.log(`   Acesse: /platform/tenants após fazer login.\n`);
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
