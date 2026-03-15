import { getPool } from '../src/lib/db'

async function cleanup() {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const q1 = `
      DELETE FROM production_reservations
      WHERE order_id IN (
        SELECT id FROM orders WHERE status IN ('CANCELADO', 'FINALIZADO')
      );
    `;
    const r1 = await client.query(q1);
    console.log(`Deletadas ${r1.rowCount} reservas de produção presas.`);
    
    const q2 = `
      UPDATE production_tasks
      SET qty_to_produce = 0, status = 'DONE', completed_at = NOW()
      WHERE order_id IN (
        SELECT id FROM orders WHERE status IN ('CANCELADO', 'FINALIZADO')
      ) AND status != 'DONE';
    `;
    const r2 = await client.query(q2);
    console.log(`Concluídas ${r2.rowCount} tarefas de produção pendentes presas.`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

cleanup();
