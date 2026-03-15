import { getPool } from '../src/lib/db'

async function inspect() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        pr.id AS pr_id,
        pr.order_id,
        o.order_number,
        o.status AS order_status,
        pr.material_id,
        m.name AS material_name,
        pr.qty AS reserved_qty,
        pr.created_at,
        pr.tenant_id
      FROM production_reservations pr
      LEFT JOIN orders o ON pr.order_id = o.id
      LEFT JOIN materials m ON pr.material_id = m.id
      ORDER BY pr.created_at DESC;
    `;
    
    const res = await client.query(query);
    console.log(`Encontradas ${res.rowCount} reservas de produção:`);
    console.table(res.rows);
    
    const ptQuery = `
      SELECT 
        pt.id AS pt_id,
        pt.order_id,
        o.order_number,
        o.status AS order_status,
        pt.material_id,
        m.name AS material_name,
        pt.qty_to_produce,
        pt.produced_qty,
        pt.status AS task_status,
        pt.tenant_id
      FROM production_tasks pt
      LEFT JOIN orders o ON pt.order_id = o.id
      LEFT JOIN materials m ON pt.material_id = m.id
      WHERE pt.qty_to_produce > 0
      ORDER BY pt.created_at DESC;
    `;
    
    const ptRes = await client.query(ptQuery);
    console.log(`Encontradas ${ptRes.rowCount} tarefas de produção pendentes:`);
    console.table(ptRes.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

inspect();
