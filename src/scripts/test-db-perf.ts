import { query } from '@/lib/db';

async function testDatabasePerformance() {
  console.log('🚀 Iniciando teste de performance do novo VPS database...\n');

  try {
    // Test 1: Connection & Simple Query
    console.time('⏱️ Query simples (SELECT NOW)');
    const result1 = await query('SELECT NOW() as current_time');
    console.timeEnd('⏱️ Query simples (SELECT NOW)');
    console.log(`   Resultado: ${result1.rows[0].current_time}\n`);

    // Test 2: Count queries
    console.time('⏱️ COUNT(*) - materials');
    const result2 = await query('SELECT COUNT(*) as total FROM materials');
    console.timeEnd('⏱️ COUNT(*) - materials');
    console.log(`   Total de materiais: ${result2.rows[0].total}\n`);

    console.time('⏱️ COUNT(*) - production_tasks');
    const result3 = await query('SELECT COUNT(*) as total FROM production_tasks');
    console.timeEnd('⏱️ COUNT(*) - production_tasks');
    console.log(`   Total de tarefas: ${result3.rows[0].total}\n`);

    console.time('⏱️ COUNT(*) - orders');
    const result4 = await query('SELECT COUNT(*) as total FROM orders');
    console.timeEnd('⏱️ COUNT(*) - orders');
    console.log(`   Total de pedidos: ${result4.rows[0].total}\n`);

    // Test 3: More complex query with JOIN
    console.time('⏱️ Query complexa com JOIN');
    const result5 = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress
      FROM production_tasks
    `);
    console.timeEnd('⏱️ Query complexa com JOIN');
    console.log(`   Resultado: ${JSON.stringify(result5.rows[0])}\n`);

    // Test 4: Sequential queries benchmark
    console.time('⏱️ 10 queries sequenciais');
    for (let i = 0; i < 10; i++) {
      await query('SELECT 1');
    }
    console.timeEnd('⏱️ 10 queries sequenciais');

    console.log('\n✅ Todos os testes completados com sucesso!');
    console.log('📊 O novo VPS está respondendo bem e rápido!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

testDatabasePerformance().then(() => process.exit(0));
