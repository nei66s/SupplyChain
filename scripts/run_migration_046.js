const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: 'postgresql://appuser:9UxJ48kk4MS62N5g48dCqBxsr@147.93.176.5:6432/inventario_agil?sslmode=disable' });

const migrationPath = path.join(__dirname, '../migrations/046_add_tenant_id_defaults.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

pool.query(sql)
    .then(() => {
        console.log('Migration 046_add_tenant_id_defaults executed successfully.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error executing migration:', err);
        process.exit(1);
    });
